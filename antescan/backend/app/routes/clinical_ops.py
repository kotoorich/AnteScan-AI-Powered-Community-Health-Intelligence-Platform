"""Referrals, alerts and lab results."""
import os
from datetime import datetime
from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models import Referral, Alert, Patient, Screening, LabResult, FamilyElder
from app.utils.decorators import chw_required, admin_required
from app.utils.pagination import paginate, to_response
from app.services.sms import send_referral_sms
from app.services.audit_logger import log as audit

referrals_bp = Blueprint('referrals', __name__, url_prefix='/api/referrals')
alerts_bp = Blueprint('alerts', __name__, url_prefix='/api/alerts')
labs_bp = Blueprint('labs', __name__, url_prefix='/api/lab-results')


# --- Referrals ---

@referrals_bp.get('')
def list_referrals():
    """Admin sees all, CHW sees their own."""
    from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
    from app.models import User
    verify_jwt_in_request()
    user = User.query.get(get_jwt_identity())

    q = Referral.query.order_by(Referral.created_at.desc())
    if user.kind == 'chw':
        q = q.filter_by(chw_id=user.chw.id)

    status = request.args.get('status', '').strip()
    if status and status != 'All':
        q = q.filter(Referral.status == status)
    search = request.args.get('search', '').strip()
    if search:
        q = q.join(Patient).filter(Patient.full_name.ilike(f'%{search}%'))

    pag = paginate(q)
    return jsonify(to_response(pag, lambda r: r.to_dict()))


@referrals_bp.post('')
@chw_required
def create_referral():
    data = request.get_json() or {}
    patient_id = data.get('patientId')
    if not patient_id:
        return jsonify({'error': 'patientId required'}), 400
    patient = Patient.query.get_or_404(patient_id)
    if patient.chw_id != g.current_chw.id:
        return jsonify({'error': 'Forbidden'}), 403

    r = Referral(
        patient_id=patient_id, chw_id=g.current_chw.id,
        screening_id=data.get('screeningId'),
        module=data.get('module', patient.primary_module),
        urgency=data.get('urgency', 'Routine'),
        facility_name=data.get('facility', 'Komfo Anokye Teaching Hospital'),
        facility_phone=data.get('facilityPhone'),
        notes=data.get('notes'),
        status='Sent',
    )
    db.session.add(r)
    db.session.flush()

    # Send SMS to facility (and elder if relevant)
    try:
        elder = patient.family_elder
        send_referral_sms(r, patient, g.current_chw, family_elder=elder)
        r.sms_status = 'Sent'
    except Exception as e:
        r.sms_status = 'Failed'
        r.notes = (r.notes or '') + f' [SMS error: {e}]'

    db.session.commit()
    audit('REFERRAL_CREATE', target=f'referral {r.id}', actor=g.current_chw.user)
    return jsonify(r.to_dict()), 201


@referrals_bp.patch('/<int:rid>')
@admin_required
def update_referral(rid):
    r = Referral.query.get_or_404(rid)
    data = request.get_json() or {}
    if 'status' in data:
        r.status = data['status']
        if data['status'] in ('Completed', 'No-show', 'Cancelled'):
            r.closed_at = datetime.utcnow()
    if 'notes' in data:
        r.notes = data['notes']
    db.session.commit()
    audit('REFERRAL_UPDATE', target=f'referral {rid}', actor=g.current_admin.user,
          details={'status': data.get('status')})
    return jsonify(r.to_dict())


# --- Alerts ---

@alerts_bp.get('')
@admin_required
def list_alerts():
    status = request.args.get('status', 'Open')
    q = Alert.query
    if status != 'All':
        q = q.filter_by(status=status)
    q = q.order_by(Alert.created_at.desc())
    pag = paginate(q)
    return jsonify(to_response(pag, lambda a: a.to_dict()))


@alerts_bp.patch('/<int:aid>')
@admin_required
def update_alert(aid):
    a = Alert.query.get_or_404(aid)
    data = request.get_json() or {}
    if data.get('action') == 'acknowledge':
        a.status = 'Acknowledged'
        a.acknowledged_by = g.current_admin.id
        a.acknowledged_at = datetime.utcnow()
    elif data.get('action') == 'resolve':
        a.status = 'Resolved'
        a.resolved_at = datetime.utcnow()
        a.resolution_notes = data.get('notes')
    db.session.commit()
    audit(f'ALERT_{a.status.upper()}', target=f'alert {aid}', actor=g.current_admin.user)
    return jsonify(a.to_dict())


# --- Lab results ---

@labs_bp.post('/patients/<int:pid>')
@chw_required
def create_lab_result(pid):
    p = Patient.query.get_or_404(pid)
    if p.chw_id != g.current_chw.id:
        return jsonify({'error': 'Forbidden'}), 403

    # Multipart upload
    test_type = request.form.get('testType') or 'hemoglobin_electrophoresis'
    result = request.form.get('result', 'Pending')
    interpretation = request.form.get('interpretation')
    facility = request.form.get('facility')
    performed_at = request.form.get('performedAt')

    doc_path = None
    if 'document' in request.files:
        f = request.files['document']
        safe = secure_filename(f.filename)
        out_dir = os.path.join(current_app.config['UPLOADS_DIR'], 'lab_results', str(pid))
        os.makedirs(out_dir, exist_ok=True)
        doc_path = os.path.join(out_dir, f'{int(datetime.utcnow().timestamp())}_{safe}')
        f.save(doc_path)

    lr = LabResult(
        patient_id=pid, test_type=test_type, result=result,
        interpretation=interpretation, facility=facility,
        performed_at=datetime.fromisoformat(performed_at).date() if performed_at else None,
        document_path=doc_path, uploaded_by_chw_id=g.current_chw.id,
    )
    db.session.add(lr)
    db.session.commit()
    audit('LAB_RESULT_UPLOAD', target=f'patient {pid}', actor=g.current_chw.user)
    return jsonify(lr.to_dict()), 201


@labs_bp.get('/patients/<int:pid>')
@chw_required
def list_lab_results(pid):
    p = Patient.query.get_or_404(pid)
    if p.chw_id != g.current_chw.id:
        return jsonify({'error': 'Forbidden'}), 403
    return jsonify({'items': [lr.to_dict() for lr in p.lab_results]})
