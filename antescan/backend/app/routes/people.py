"""CHWs, CHPS Compounds, Leaderboard."""
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g
from sqlalchemy import func, desc
from app.extensions import db
from app.models import CHW, Compound, Screening, Referral
from app.utils.decorators import admin_required, auth_required
from app.utils.pagination import paginate, to_response

chws_bp = Blueprint('chws', __name__, url_prefix='/api/chws')
compounds_bp = Blueprint('compounds', __name__, url_prefix='/api/compounds')
leaderboard_bp = Blueprint('leaderboard', __name__, url_prefix='/api/leaderboard')


@chws_bp.get('')
@auth_required
def list_chws():
    q = CHW.query.order_by(CHW.name)
    if (search := request.args.get('search', '').strip()):
        q = q.filter(CHW.name.ilike(f'%{search}%') | CHW.chw_id.ilike(f'%{search}%'))
    if (region := request.args.get('region', '').strip()) and region != 'All':
        q = q.filter_by(region=region)
    if (status := request.args.get('status', '').strip()) and status != 'All':
        q = q.filter_by(status=status)
    pag = paginate(q, default_per_page=50)
    return jsonify(to_response(pag, lambda c: c.to_dict()))


@compounds_bp.get('')
@auth_required
def list_compounds():
    cs = Compound.query.order_by(Compound.name).all()
    return jsonify({'items': [c.to_dict(include_metrics=True) for c in cs]})


@compounds_bp.post('')
@admin_required
def create_compound():
    data = request.get_json() or {}
    c = Compound(
        name=data['name'], region=data['region'], district=data['district'],
        latitude=data.get('latitude'), longitude=data.get('longitude'),
        phone=data.get('phone'), catchment_population=data.get('catchmentPopulation', 0),
    )
    db.session.add(c); db.session.commit()
    return jsonify(c.to_dict(include_metrics=True)), 201


@leaderboard_bp.get('')
@auth_required
def leaderboard():
    scope = request.args.get('scope', 'National')
    period = request.args.get('period', 'all')  # all | week | month
    q = CHW.query

    # Scope filter — works for both admin and CHW callers
    if scope == 'Regional':
        region = getattr(getattr(g, 'current_admin', None), 'region', None) or \
                  getattr(getattr(g, 'current_chw', None), 'region', None)
        if region:
            q = q.filter_by(region=region)
    elif scope == 'District':
        district = getattr(getattr(g, 'current_admin', None), 'district', None) or \
                    getattr(getattr(g, 'current_chw', None), 'district', None)
        if district:
            q = q.filter_by(district=district)

    chws = q.all()
    # Compute screening counts in single query
    since = None
    if period == 'week':
        since = datetime.utcnow() - timedelta(days=7)
    elif period == 'month':
        since = datetime.utcnow() - timedelta(days=30)

    sc_query = db.session.query(Screening.chw_id, func.count(Screening.id))
    if since:
        sc_query = sc_query.filter(Screening.created_at >= since)
    counts = dict(sc_query.group_by(Screening.chw_id).all())

    rows = []
    for c in chws:
        rows.append({**c.to_dict(compact=True),
                     'totalScreenings': counts.get(c.id, 0),
                     'referrals': Referral.query.filter_by(chw_id=c.id).count()})
    rows.sort(key=lambda r: r['totalScreenings'], reverse=True)
    return jsonify({'items': rows, 'scope': scope, 'period': period})
