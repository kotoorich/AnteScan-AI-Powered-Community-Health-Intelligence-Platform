"""Admin dashboard KPIs, reports and analytics endpoints."""
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from sqlalchemy import func, and_
from app.extensions import db
from app.models import (
    Patient, Screening, Referral, Alert, CHW, ScreeningSymptom
)
from app.utils.decorators import admin_required, auth_required
from app.services.ml import growth_curve_points

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')
reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')


@dashboard_bp.get('/kpis')
@auth_required
def kpis():
    week_ago = datetime.utcnow() - timedelta(days=7)
    prev_week = week_ago - timedelta(days=7)

    total_patients = Patient.query.count()
    weekly_screenings = Screening.query.filter(Screening.created_at >= week_ago).count()
    prev_weekly = Screening.query.filter(
        and_(Screening.created_at >= prev_week, Screening.created_at < week_ago)
    ).count()
    weekly_high_risk = Screening.query.filter(
        and_(Screening.created_at >= week_ago,
              Screening.risk_level.in_(['high', 'emergency']))
    ).count()
    prev_high_risk = Screening.query.filter(
        and_(Screening.created_at >= prev_week, Screening.created_at < week_ago,
              Screening.risk_level.in_(['high', 'emergency']))
    ).count()
    weekly_referrals = Referral.query.filter(Referral.created_at >= week_ago).count()
    prev_referrals = Referral.query.filter(
        and_(Referral.created_at >= prev_week, Referral.created_at < week_ago)
    ).count()
    active_chws = CHW.query.filter_by(status='Active').count()
    avg_risk = db.session.query(func.avg(Screening.risk_score)).filter(
        Screening.created_at >= week_ago).scalar() or 0

    def delta(curr, prev):
        if prev == 0:
            return 0.0 if curr == 0 else 100.0
        return round((curr - prev) / prev * 100, 1)

    return jsonify({
        'totalPatients': total_patients,
        'weeklyScreenings': weekly_screenings,
        'weeklyHighRisk': weekly_high_risk,
        'weeklyReferrals': weekly_referrals,
        'activeChws': active_chws,
        'avgRiskScore': round(float(avg_risk), 1),
        'weeklyDelta': {
            'totalPatients': 0.0,  # no historical snapshot available
            'weeklyScreenings': delta(weekly_screenings, prev_weekly),
            'weeklyHighRisk': delta(weekly_high_risk, prev_high_risk),
            'weeklyReferrals': delta(weekly_referrals, prev_referrals),
            'activeChws': 0.0,
            'avgRiskScore': 0.0,
        },
    })


@dashboard_bp.get('/trend')
@auth_required
def trend():
    """30-day screening trend, per module."""
    days = int(request.args.get('days', 30))
    out = []
    today = datetime.utcnow().date()
    for i in range(days):
        d = today - timedelta(days=days - 1 - i)
        d_start = datetime.combine(d, datetime.min.time())
        d_end = d_start + timedelta(days=1)
        anc = Screening.query.filter(and_(
            Screening.module == 'ANC',
            Screening.created_at >= d_start, Screening.created_at < d_end)).count()
        nutri = Screening.query.filter(and_(
            Screening.module == 'NutriCheck',
            Screening.created_at >= d_start, Screening.created_at < d_end)).count()
        sickle = Screening.query.filter(and_(
            Screening.module == 'Sickle Cell',
            Screening.created_at >= d_start, Screening.created_at < d_end)).count()
        out.append({'date': d.strftime('%b %d'), 'anc': anc, 'nutri': nutri, 'sickle': sickle})
    return jsonify({'items': out})


@dashboard_bp.get('/risk-distribution')
@auth_required
def risk_distribution():
    rows = db.session.query(Screening.risk_level, func.count(Screening.id)).group_by(Screening.risk_level).all()
    color = {'low': '#00A651', 'moderate': '#FCD116', 'high': '#CE1126', 'emergency': '#FF3B3B'}
    return jsonify({'items': [
        {'name': lv.capitalize() if lv else 'Unknown', 'value': cnt, 'color': color.get(lv, '#999')}
        for lv, cnt in rows
    ]})


@dashboard_bp.get('/referral-outcomes')
@auth_required
def referral_outcomes():
    """Last 8 weeks of referral outcomes."""
    out = []
    today = datetime.utcnow().date()
    for w in range(8):
        wk_start = today - timedelta(days=(7 - w) * 7)
        wk_end = wk_start + timedelta(days=7)
        wk_start_dt = datetime.combine(wk_start, datetime.min.time())
        wk_end_dt = datetime.combine(wk_end, datetime.min.time())
        base = Referral.query.filter(
            and_(Referral.created_at >= wk_start_dt, Referral.created_at < wk_end_dt))
        out.append({
            'week': f'W{w+1}',
            'completed': base.filter_by(status='Completed').count(),
            'pending': base.filter(Referral.status.in_(['Sent', 'Received'])).count(),
            'noShow': base.filter_by(status='No-show').count(),
            'cancelled': base.filter_by(status='Cancelled').count(),
        })
    return jsonify({'items': out})


@dashboard_bp.get('/region-breakdown')
@auth_required
def region_breakdown():
    """Per-region counts — used by the National Map.

    Returns ALL 16 Ghana regions (post-2019 reform), with zeros for regions
    that have no data yet. This lets the National Map render every region
    even on a fresh seed.
    """
    GHANA_16_REGIONS = [
        'Ahafo', 'Ashanti', 'Bono', 'Bono East', 'Central', 'Eastern',
        'Greater Accra', 'North East', 'Northern', 'Oti', 'Savannah',
        'Upper East', 'Upper West', 'Volta', 'Western', 'Western North',
    ]
    chw_counts = dict(db.session.query(CHW.region, func.count(CHW.id))
                        .group_by(CHW.region).all())
    patient_counts = dict(db.session.query(CHW.region, func.count(Patient.id))
                            .join(Patient, Patient.chw_id == CHW.id)
                            .group_by(CHW.region).all())
    alert_counts = dict(db.session.query(CHW.region, func.count(Alert.id))
                          .join(Alert, Alert.chw_id == CHW.id)
                          .filter(Alert.status == 'Open')
                          .group_by(CHW.region).all())
    return jsonify({'items': [
        {'region': r,
         'chws': int(chw_counts.get(r, 0)),
         'patients': int(patient_counts.get(r, 0)),
         'alerts': int(alert_counts.get(r, 0))}
        for r in GHANA_16_REGIONS
    ]})


# --- Module-specific reports ---

@reports_bp.get('/antenatal')
@auth_required
def antenatal_report():
    week_ago = datetime.utcnow() - timedelta(days=30)
    base = Screening.query.filter_by(module='ANC').filter(Screening.created_at >= week_ago)
    high_risk = base.filter(Screening.risk_level.in_(['high', 'emergency'])).count()
    # Top symptoms
    sym_counts = dict(db.session.query(ScreeningSymptom.symptom_key,
                                          func.count(ScreeningSymptom.id))
                        .join(Screening).filter(Screening.module == 'ANC')
                        .filter(Screening.created_at >= week_ago)
                        .group_by(ScreeningSymptom.symptom_key)
                        .order_by(func.count(ScreeningSymptom.id).desc()).all())
    return jsonify({
        'totalScreenings': base.count(),
        'highRiskIdentified': high_risk,
        'topSymptoms': [{'symptom': k.replace('_', ' ').title(), 'count': v}
                         for k, v in list(sym_counts.items())[:8]],
    })


@reports_bp.get('/nutricheck')
@auth_required
def nutricheck_report():
    base = Screening.query.filter_by(module='NutriCheck')
    sam = base.filter_by(nutri_class='SAM').count()
    mam = base.filter_by(nutri_class='MAM').count()
    normal = base.filter_by(nutri_class='Normal').count()
    # MUAC distribution
    bins = [('<110', 0, 110), ('110-115', 110, 115), ('115-120', 115, 120),
            ('120-125', 120, 125), ('125-130', 125, 130),
            ('130-140', 130, 140), ('140+', 140, 999)]
    muac_hist = []
    for label, lo, hi in bins:
        n = Screening.query.filter(
            Screening.module == 'NutriCheck',
            Screening.muac_mm >= lo, Screening.muac_mm < hi
        ).count()
        muac_hist.append({'range': label, 'count': n})
    return jsonify({
        'totalScreenings': base.count(),
        'samCases': sam, 'mamCases': mam, 'normalCases': normal,
        'muacDistribution': muac_hist,
    })


@reports_bp.get('/growth-curve')
@auth_required
def growth_curve():
    """WHO growth curves for plotting."""
    sex = request.args.get('sex', 'F')
    metric = request.args.get('metric', 'waz')
    return jsonify({'points': growth_curve_points(sex=sex, metric=metric)})


@reports_bp.get('/sickle')
@auth_required
def sickle_report():
    base = Screening.query.filter_by(module='Sickle Cell')
    total = base.count()
    high = base.filter(Screening.risk_level.in_(['high', 'emergency'])).count()
    return jsonify({
        'totalScreened': total,
        'highRisk': high,
        'confirmedPositive': 0,  # populated when lab results land
        'awaitingLab': 0,
    })


@reports_bp.get('/model-performance')
@auth_required
def model_performance():
    """Performance metrics across all models for the radar chart."""
    from app.models import MLModel
    items = []
    for m in MLModel.query.all():
        items.append({
            'modelId': m.id, 'name': m.name, 'module': m.module,
            'accuracy': m.accuracy or 0, 'precision': m.precision or 0,
            'recall': m.recall or 0, 'f1': m.f1 or 0,
        })
    return jsonify({'items': items})


@reports_bp.get('/activity-heatmap')
@auth_required
def activity_heatmap():
    """24x7 heatmap of screening activity by day-of-week + hour."""
    rows = db.session.query(Screening.created_at).all()
    matrix = [[0] * 24 for _ in range(7)]
    for (ts,) in rows:
        if ts:
            matrix[ts.weekday()][ts.hour] += 1
    return jsonify({'matrix': matrix})
