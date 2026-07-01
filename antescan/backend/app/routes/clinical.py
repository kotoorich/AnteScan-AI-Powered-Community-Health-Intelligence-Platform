"""Patients and screenings — the clinical core of the API."""
import json, uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, g
from app.extensions import db
from app.models import Patient, Screening, ScreeningSymptom, Alert, FamilyElder, CHW
from app.utils.decorators import chw_required, admin_required
from app.utils.pagination import paginate, to_response
from app.services.ml import get_anc_model, combined_classification, weight_for_height_z, weight_for_age_z, height_for_age_z
from app.services.audit_logger import log as audit
from app.services.voice_mapper import map_transcript
from flask import current_app

patients_bp = Blueprint('patients', __name__, url_prefix='/api/patients')
screenings_bp = Blueprint('screenings', __name__, url_prefix='/api/screenings')


# --- Patients ---

@patients_bp.get('')
@chw_required
def list_patients():
    q = Patient.query.filter_by(chw_id=g.current_chw.id).order_by(Patient.last_visit.desc().nullslast())
    search = request.args.get('search', '').strip()
    module = request.args.get('module', '').strip()
    if search:
        q = q.filter(Patient.full_name.ilike(f'%{search}%'))
    if module and module != 'All':
        q = q.filter(Patient.primary_module == module)
    pag = paginate(q)
    return jsonify(to_response(pag, lambda p: p.to_dict(compact=True)))


@patients_bp.post('')
@chw_required
def create_patient():
    data = request.get_json() or {}
    if not data.get('fullName') or not data.get('age'):
        return jsonify({'error': 'fullName and age required'}), 400

    elder_id = None
    if data.get('elderName') and data.get('elderPhone'):
        elder = FamilyElder(name=data['elderName'], phone=data['elderPhone'],
                             relationship=data.get('elderRelationship', 'Grandmother'),
                             language=data.get('elderLanguage', 'Twi'))
        db.session.add(elder)
        db.session.flush()
        elder_id = elder.id

    p = Patient(
        chw_id=g.current_chw.id,
        full_name=data['fullName'].strip(),
        age=float(data['age']),
        sex=data.get('sex'),
        phone=data.get('phone'),
        village=data.get('village'),
        gps_lat=data.get('gpsLat'), gps_lng=data.get('gpsLng'),
        primary_module=data.get('module', 'ANC'),
        pregnancy_status=data.get('pregnancyStatus'),
        gestational_age=data.get('gestationalAge'),
        family_elder_id=elder_id,
        # NEW: region and district
        region=data.get('region'),
        district=data.get('district'),
    )
    db.session.add(p)
    db.session.commit()
    audit('PATIENT_CREATE', target=f'patient {p.id}', actor=g.current_chw.user)
    return jsonify(p.to_dict(compact=False)), 201


@patients_bp.get('/<int:patient_id>')
@chw_required
def get_patient(patient_id):
    p = Patient.query.get_or_404(patient_id)
    if p.chw_id != g.current_chw.id:
        return jsonify({'error': 'Forbidden'}), 403
    return jsonify(p.to_dict(compact=False))


@patients_bp.get('/<int:patient_id>/timeline')
@chw_required
def patient_timeline(patient_id):
    """Combined chronological feed: screenings + referrals + lab results + SMS."""
    p = Patient.query.get_or_404(patient_id)
    if p.chw_id != g.current_chw.id:
        return jsonify({'error': 'Forbidden'}), 403
    events = []
    for s in p.screenings:
        events.append({
            'kind': 'screening', 'when': s.created_at.isoformat(),
            'title': f'{s.module} screening',
            'detail': f'Risk: {s.risk_level} ({s.risk_score}/100)',
            'meta': s.to_dict(),
        })
    for r in p.referrals:
        events.append({
            'kind': 'referral', 'when': r.created_at.isoformat(),
            'title': f'Referred to {r.facility_name}',
            'detail': f'{r.urgency} · {r.status}',
            'meta': r.to_dict(),
        })
    for lr in p.lab_results:
        events.append({
            'kind': 'lab', 'when': lr.created_at.isoformat(),
            'title': f'{lr.test_type}: {lr.result}',
            'detail': lr.facility or '',
            'meta': lr.to_dict(),
        })
    events.sort(key=lambda x: x['when'], reverse=True)
    return jsonify({'events': events})


# --- Screenings (the clinical core) ---

@screenings_bp.post('')
@chw_required
def create_screening():
    """Create + score a screening in one call. Returns risk result."""
    data = request.get_json() or {}
    module = data.get('module')
    patient_id = data.get('patientId')
    client_uuid = data.get('clientUuid')

    if not module:
        return jsonify({'error': 'module required'}), 400

    # Idempotency: if clientUuid already exists, return existing
    if client_uuid:
        existing = Screening.query.filter_by(client_uuid=client_uuid).first()
        if existing:
            return jsonify({'screening': existing.to_dict(full=True),
                            'result': {
                                'score': existing.risk_score, 'level': existing.risk_level,
                                'reasons': existing.reasons_list,
                            }})

    # Handle new patient inline (offline-mode submissions)
    if not patient_id and data.get('newPatient'):
        np = data['newPatient']
        patient = Patient(
            chw_id=g.current_chw.id, full_name=np['fullName'],
            age=float(np['age']), sex=np.get('sex'), phone=np.get('phone'),
            village=np.get('village'), primary_module=module,
            gestational_age=np.get('gestationalAge'),
            # NEW: region and district
            region=np.get('region'),
            district=np.get('district'),
        )
        db.session.add(patient)
        db.session.flush()
    elif patient_id:
        patient = Patient.query.get_or_404(patient_id)
        if patient.chw_id != g.current_chw.id:
            return jsonify({'error': 'Forbidden'}), 403
    else:
        return jsonify({'error': 'patientId or newPatient required'}), 400

    form = data.get('vitals', {}) | data.get('obstetric', {})
    symptoms = data.get('symptoms', [])

    # Compute risk based on module
    voice_data = data.get('voice') or {}
    if module == 'ANC':
        model = get_anc_model(current_app.config['ML_MODELS_DIR'])
        result = model.predict(form, symptoms)
    elif module == 'NutriCheck':
        result = _nutricheck_score(data, patient)
    elif module == 'Sickle Cell':
        result = _sickle_score(data)
    else:
        return jsonify({'error': f'Unknown module: {module}'}), 400

    # Persist screening
    s = Screening(
        patient_id=patient.id, chw_id=g.current_chw.id, module=module,
        bp_systolic=_intish(form.get('bp_systolic')), bp_diastolic=_intish(form.get('bp_diastolic')),
        weight_kg=_floatish(form.get('weight')), height_cm=_floatish(form.get('height')),
        temperature_c=_floatish(form.get('temperature')), pulse_bpm=_intish(form.get('pulse')),
        gestational_age=_intish(form.get('gestational_age')),
        fundal_height=_floatish(form.get('fundal_height')),
        fetal_hr=_intish(form.get('fetal_hr')),
        presentation=form.get('presentation'),
        gravida=_intish(form.get('gravida')), parity=_intish(form.get('parity')),
        muac_mm=_floatish(data.get('anthropometry', {}).get('muac')),
        oedema=bool(data.get('anthropometry', {}).get('oedema')),
        breastfeeding=data.get('feeding', {}).get('breastfeeding'),
        meals_per_day=_intish(data.get('feeding', {}).get('meals')),
        diarrhea_2w=data.get('feeding', {}).get('diarrhea'),
        whz=result.get('whz'), haz=result.get('haz'), waz=result.get('waz'),
        nutri_class=result.get('classification'),
        has_image=bool(data.get('hasImage')),
        sickle_signs_count=len(data.get('clinicalSigns', [])),
        voice_transcript=voice_data.get('transcript'),
        voice_language=voice_data.get('language'),
        risk_score=result['score'], risk_level=result['level'],
        risk_reasons=json.dumps(result['reasons']),
        model_version=result.get('model_version'),
        used_rule_fallback=result.get('used_rule_fallback', False),
        client_uuid=client_uuid or str(uuid.uuid4()),
        synced_at=datetime.utcnow(),
    )
    db.session.add(s)
    db.session.flush()

    # Add symptoms
    for sym in symptoms:
        db.session.add(ScreeningSymptom(
            screening_id=s.id, symptom_key=sym,
            voice_matched=sym in (voice_data.get('matchedSymptoms') or []),
        ))

    # Auto-create alert if high/emergency
    if result['level'] in ('high', 'emergency'):
        alert = Alert(
            screening_id=s.id, patient_id=patient.id,
            chw_id=g.current_chw.id, severity=result['level'],
        )
        db.session.add(alert)

    patient.last_visit = datetime.utcnow()
    db.session.commit()
    audit('SCREENING_CREATE', target=f'screening {s.id}', actor=g.current_chw.user)

    return jsonify({
        'screening': s.to_dict(full=True),
        'patientId': patient.id,
        'result': {
            'score': result['score'], 'level': result['level'],
            'reasons': result['reasons'],
            'modelVersion': result.get('model_version'),
            'usedRuleFallback': result.get('used_rule_fallback', False),
        },
    }), 201


def _nutricheck_score(data, patient):
    """Compute NutriCheck classification using WHO thresholds + Z-scores."""
    anth = data.get('anthropometry', {}) or {}
    feeding = data.get('feeding', {}) or {}
    muac = _floatish(anth.get('muac'))
    oedema = bool(anth.get('oedema'))
    weight = _floatish(anth.get('weight')) or _floatish(data.get('vitals', {}).get('weight'))
    height = _floatish(anth.get('height')) or _floatish(data.get('vitals', {}).get('height'))
    sex = (patient.sex or 'F').upper()[:1]
    age_months = _intish(data.get('child', {}).get('ageMonths')) or 24

    whz = weight_for_height_z(weight, height, sex) if weight and height else None
    waz = weight_for_age_z(weight, age_months, sex) if weight else None
    haz = height_for_age_z(height, age_months, sex) if height else None
    cls = combined_classification(muac_mm=muac, whz=whz, oedema=oedema) or 'Normal'

    if cls == 'SAM':
        score, level = 90, 'emergency'
        reasons = ['Severe acute malnutrition detected', f'MUAC {muac} mm' if muac else 'WHZ < -3 SD',
                    'Refer for therapeutic feeding immediately']
    elif cls == 'MAM':
        score, level = 65, 'high'
        reasons = ['Moderate acute malnutrition', f'MUAC {muac} mm' if muac else 'WHZ < -2 SD',
                    'Supplementary feeding, weekly follow-up']
    else:
        score, level = 15, 'low'
        reasons = ['Normal nutrition status', 'Continue routine monitoring']
    if oedema:
        reasons.insert(0, 'Bilateral pitting oedema present — automatic SAM classification')

    return {
        'score': score, 'level': level, 'reasons': reasons,
        'classification': cls, 'whz': whz, 'waz': waz, 'haz': haz,
        'model_version': 'who-zscore-v2006',
    }


def _sickle_score(data):
    signs = data.get('clinicalSigns', [])
    has_image = bool(data.get('hasImage'))
    count = len(signs)
    if count >= 4:
        score, level = 78, 'high'
    elif count >= 2:
        score, level = 52, 'moderate'
    else:
        score, level = 18, 'low'
    reasons = [f'{count} clinical sign{"s" if count != 1 else ""} present']
    if has_image:
        reasons.append('Blood smear captured for laboratory confirmation')
    if level == 'high':
        reasons.append('Refer for haemoglobin electrophoresis')
    return {
        'score': score, 'level': level, 'reasons': reasons,
        'model_version': 'sickle-rules-v0.3',
    }


@screenings_bp.post('/voice/map')
@chw_required
def voice_map():
    """Map a voice transcript to symptom keys + detect language."""
    data = request.get_json() or {}
    return jsonify(map_transcript(data.get('transcript', '')))


@screenings_bp.get('/<int:sid>')
@chw_required
def get_screening(sid):
    s = Screening.query.get_or_404(sid)
    if s.chw_id != g.current_chw.id:
        return jsonify({'error': 'Forbidden'}), 403
    return jsonify(s.to_dict(full=True))


@screenings_bp.post('/bulk-sync')
@chw_required
def bulk_sync():
    """Offline-mode sync: accept array of queued screenings."""
    payload = request.get_json() or {}
    items = payload.get('items', [])
    results = []
    for item in items:
        try:
            # Reuse the create_screening logic via internal mini-call
            with current_app.test_request_context('/api/screenings', json=item):
                resp = create_screening()
                # resp is a tuple (Response, status) or Response
                if isinstance(resp, tuple):
                    body, status = resp
                else:
                    body, status = resp, 200
                results.append({
                    'clientUuid': item.get('clientUuid'),
                    'status': status,
                    'screeningId': body.get_json().get('screening', {}).get('id') if status < 400 else None,
                })
        except Exception as e:
            results.append({'clientUuid': item.get('clientUuid'), 'status': 500, 'error': str(e)})
    return jsonify({'results': results})


def _intish(v):
    try: return int(float(v)) if v not in (None, '') else None
    except Exception: return None

def _floatish(v):
    try: return float(v) if v not in (None, '') else None
    except Exception: return None