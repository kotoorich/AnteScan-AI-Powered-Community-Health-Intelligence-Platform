"""System & admin management endpoints."""
import os, json
from datetime import datetime
from flask import Blueprint, request, jsonify, g, current_app, send_file
from app.extensions import db
from app.models import (
    Notification, NotificationRecipient, Broadcast, AuditLog,
    Setting, User, AdminUser, SMSLog, Screening, Referral, CHW,
)
from app.utils.decorators import admin_required, super_admin_required, auth_required
from app.utils.pagination import paginate, to_response
from app.services.audit_logger import log as audit
from app.services.sms import send_sms
from app.services.pdf_export import screenings_csv, referrals_csv, chws_xlsx

system_bp = Blueprint('system', __name__, url_prefix='/api')


# --- Notifications ---

@system_bp.get('/notifications')
@auth_required
def list_notifications():
    user = g.current_user
    target = ['chw', 'both'] if user.kind == 'chw' else ['admin', 'both']
    # Audience-based broadcasts OR notifications targeted directly at this user
    q = Notification.query.filter(
        db.or_(
            db.and_(
                Notification.target_audience.in_(target),
                Notification.recipient_user_id.is_(None),
            ),
            Notification.recipient_user_id == user.id,
        )
    ).order_by(Notification.created_at.desc()).limit(100)
    items = q.all()
    out = []
    for n in items:
        rec = NotificationRecipient.query.filter_by(
            notification_id=n.id, user_id=user.id).first()
        # Skip notifications this user has personally deleted
        if rec and rec.deleted:
            continue
        d = n.to_dict()
        d['read'] = bool(rec and rec.read)
        out.append(d)
    return jsonify({'items': out})


@system_bp.post('/notifications/self')
@auth_required
def create_self_notification():
    """Create a notification visible only to the current user.

    Used by the frontend toast→notification bridge: every meaningful success
    action (profile saved, screening submitted, etc.) drops a row here so it
    persists in the bell.
    """
    user = g.current_user
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'title required'}), 400
    n = Notification(
        kind=data.get('type', 'system'),
        title=title[:200],
        body=(data.get('body') or '')[:500] or None,
        severity=data.get('severity', 'info'),
        target_audience='self',
        recipient_user_id=user.id,
        link=data.get('link'),
    )
    db.session.add(n)
    db.session.commit()
    return jsonify(n.to_dict()), 201


@system_bp.post('/notifications/mark-read')
@auth_required
def mark_read():
    user = g.current_user
    data = request.get_json() or {}
    target = ['chw', 'both'] if user.kind == 'chw' else ['admin', 'both']

    def _mark(nid):
        rec = NotificationRecipient.query.filter_by(
            notification_id=nid, user_id=user.id).first()
        if not rec:
            rec = NotificationRecipient(notification_id=nid, user_id=user.id)
            db.session.add(rec)
        rec.read = True
        rec.read_at = datetime.utcnow()

    if data.get('all'):
        notes = Notification.query.filter(
            db.or_(
                db.and_(
                    Notification.target_audience.in_(target),
                    Notification.recipient_user_id.is_(None),
                ),
                Notification.recipient_user_id == user.id,
            )
        ).all()
        for n in notes:
            _mark(n.id)
    else:
        nid = data.get('id')
        if not nid:
            return jsonify({'error': 'id required'}), 400
        _mark(nid)
    db.session.commit()
    return jsonify({'ok': True})


@system_bp.delete('/notifications/<int:nid>')
@auth_required
def delete_notification(nid):
    """Mark a single notification as deleted for the current user.

    We don't delete the Notification row itself (it may be visible to others
    in the same audience). We use the recipient row's `deleted` flag.
    """
    user = g.current_user
    rec = NotificationRecipient.query.filter_by(
        notification_id=nid, user_id=user.id).first()
    if not rec:
        rec = NotificationRecipient(notification_id=nid, user_id=user.id)
        db.session.add(rec)
    rec.deleted = True
    rec.deleted_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'ok': True})


@system_bp.delete('/notifications')
@auth_required
def clear_all_notifications():
    """Clear every notification for the current user."""
    user = g.current_user
    target = ['chw', 'both'] if user.kind == 'chw' else ['admin', 'both']
    notes = Notification.query.filter(
        db.or_(
            db.and_(
                Notification.target_audience.in_(target),
                Notification.recipient_user_id.is_(None),
            ),
            Notification.recipient_user_id == user.id,
        )
    ).all()
    cleared = 0
    for n in notes:
        rec = NotificationRecipient.query.filter_by(
            notification_id=n.id, user_id=user.id).first()
        if not rec:
            rec = NotificationRecipient(notification_id=n.id, user_id=user.id)
            db.session.add(rec)
        rec.deleted = True
        rec.deleted_at = datetime.utcnow()
        cleared += 1
    db.session.commit()
    return jsonify({'cleared': cleared})


@system_bp.get('/notifications/unread-count')
@auth_required
def unread_count():
    user = g.current_user
    target = ['chw', 'both'] if user.kind == 'chw' else ['admin', 'both']
    notes = Notification.query.filter(
        db.or_(
            db.and_(
                Notification.target_audience.in_(target),
                Notification.recipient_user_id.is_(None),
            ),
            Notification.recipient_user_id == user.id,
        )
    ).all()
    count = 0
    for n in notes:
        rec = NotificationRecipient.query.filter_by(
            notification_id=n.id, user_id=user.id).first()
        if not rec or (not rec.read and not rec.deleted):
            count += 1
    return jsonify({'count': count})


# --- Broadcasts ---

@system_bp.get('/broadcasts')
@admin_required
def list_broadcasts():
    items = Broadcast.query.order_by(Broadcast.created_at.desc()).limit(40).all()
    return jsonify({'items': [b.to_dict() for b in items]})


@system_bp.post('/broadcasts')
@admin_required
def create_broadcast():
    data = request.get_json() or {}
    b = Broadcast(
        title=data['title'], body=data['body'],
        channel=data.get('channel', 'both'),
        audience=data.get('audience', 'all'),
        target_region=data.get('region'),
        target_district=data.get('district'),
        language=data.get('language', 'English'),
        created_by=g.current_admin.id,
        status='Draft',
    )
    if data.get('scheduledAt'):
        b.scheduled_at = datetime.fromisoformat(data['scheduledAt'])
        b.status = 'Scheduled'
    db.session.add(b); db.session.flush()

    # Resolve recipients
    q = CHW.query
    if b.audience == 'region' and b.target_region:
        q = q.filter_by(region=b.target_region)
    elif b.audience == 'district' and b.target_district:
        q = q.filter_by(district=b.target_district)
    recipients = q.all()
    b.recipients_count = len(recipients)

    # If not scheduled, send now
    if not b.scheduled_at:
        for c in recipients:
            try:
                if b.channel in ('sms', 'both') and c.user and c.user.phone:
                    send_sms(c.user.phone, f'{b.title}\n{b.body}',
                              kind='broadcast', language=b.language)
                if b.channel in ('app', 'both'):
                    note = Notification(kind='broadcast', title=b.title, body=b.body,
                                          severity='info', target_audience='chw')
                    db.session.add(note); db.session.flush()
                    db.session.add(NotificationRecipient(notification_id=note.id, user_id=c.user_id))
            except Exception:
                pass
        b.status = 'Sent'
        b.sent_at = datetime.utcnow()

    db.session.commit()
    is_critical = b.audience == 'all'
    if is_critical:
        audit('BROADCAST_SEND_ALL', target=f'broadcast {b.id}', actor=g.current_admin.user)
    else:
        audit('BROADCAST_SEND', target=f'broadcast {b.id}', actor=g.current_admin.user)
    return jsonify(b.to_dict()), 201


# --- Exports ---

@system_bp.get('/exports/screenings.csv')
@admin_required
def export_screenings():
    items = Screening.query.order_by(Screening.created_at.desc()).limit(10000).all()
    out_path = os.path.join(current_app.config['EXPORTS_DIR'], f'screenings_{int(datetime.utcnow().timestamp())}.csv')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    screenings_csv(items, out_path)
    audit('EXPORT_GENERATE', target='screenings.csv', actor=g.current_admin.user)
    return send_file(out_path, as_attachment=True, download_name='screenings.csv')


@system_bp.get('/exports/referrals.csv')
@admin_required
def export_referrals():
    items = Referral.query.order_by(Referral.created_at.desc()).limit(10000).all()
    out_path = os.path.join(current_app.config['EXPORTS_DIR'], f'referrals_{int(datetime.utcnow().timestamp())}.csv')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    referrals_csv(items, out_path)
    audit('EXPORT_GENERATE', target='referrals.csv', actor=g.current_admin.user)
    return send_file(out_path, as_attachment=True, download_name='referrals.csv')


@system_bp.get('/exports/chws.xlsx')
@admin_required
def export_chws():
    items = CHW.query.order_by(CHW.name).all()
    out_path = os.path.join(current_app.config['EXPORTS_DIR'], f'chws_{int(datetime.utcnow().timestamp())}.xlsx')
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    chws_xlsx(items, out_path)
    audit('EXPORT_GENERATE', target='chws.xlsx', actor=g.current_admin.user)
    return send_file(out_path, as_attachment=True, download_name='chws.xlsx')


@system_bp.get('/exports/audit.json')
@admin_required
def export_audit():
    """Full audit log as JSON."""
    from app.models import AuditEvent
    items = AuditEvent.query.order_by(AuditEvent.created_at.desc()).limit(10000).all()
    payload = json.dumps([e.to_dict() for e in items], indent=2)
    audit('EXPORT_GENERATE', target='audit.json', actor=g.current_admin.user)
    return current_app.response_class(payload, mimetype='application/json',
        headers={'Content-Disposition': 'attachment; filename=audit.json'})


# --- Settings ---

@system_bp.get('/settings')
@admin_required
def get_settings():
    items = Setting.query.all()
    sections = {}
    for s in items:
        sections.setdefault(s.section, {})[s.key] = s.cast_value()
    return jsonify(sections)


@system_bp.put('/settings/<section>')
@super_admin_required
def update_settings(section):
    data = request.get_json() or {}
    for key, value in data.items():
        s = Setting.query.filter_by(section=section, key=key).first()
        if not s:
            value_type = 'json' if isinstance(value, (dict, list)) else 'bool' if isinstance(value, bool) else 'int' if isinstance(value, int) else 'float' if isinstance(value, float) else 'string'
            s = Setting(section=section, key=key, value_type=value_type)
            db.session.add(s)
        if isinstance(value, (dict, list)):
            s.value = json.dumps(value); s.value_type = 'json'
        else:
            s.value = str(value)
    db.session.commit()
    audit('SETTINGS_CHANGE', target=section, actor=g.current_admin.user, details=data)
    return jsonify({'ok': True})


# --- Admin Users (Super Admin only) ---

@system_bp.get('/admin-users')
@super_admin_required
def list_admin_users():
    items = AdminUser.query.order_by(AdminUser.name).all()
    return jsonify({'items': [a.to_dict() for a in items]})


@system_bp.post('/admin-users')
@super_admin_required
def create_admin_user():
    data = request.get_json() or {}
    email = data['email'].lower()
    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already in use'}), 409
    u = User(kind='admin', email=email)
    u.set_password(data.get('password', 'changeme123'))
    db.session.add(u); db.session.flush()
    a = AdminUser(user_id=u.id, name=data['name'],
                   role=data.get('role', 'District Admin'),
                   region=data.get('region'), district=data.get('district'))
    db.session.add(a); db.session.commit()
    audit('USER_CREATE', target=email, actor=g.current_admin.user)
    return jsonify(a.to_dict()), 201


@system_bp.delete('/admin-users/<int:uid>')
@super_admin_required
def delete_admin_user(uid):
    a = AdminUser.query.get_or_404(uid)
    db.session.delete(a.user)
    db.session.commit()
    audit('USER_DELETE', target=f'admin {uid}', actor=g.current_admin.user)
    return jsonify({'ok': True})


# --- Audit log ---

@system_bp.get('/audit-log')
@admin_required
def audit_log():
    q = AuditLog.query.order_by(AuditLog.timestamp.desc())
    if (action := request.args.get('action', '').strip()) and action != 'All':
        q = q.filter_by(action=action)
    if request.args.get('criticalOnly') == 'true':
        q = q.filter_by(is_critical=True)
    if (search := request.args.get('search', '').strip()):
        q = q.filter(
            (AuditLog.actor_email.ilike(f'%{search}%')) |
            (AuditLog.action.ilike(f'%{search}%')) |
            (AuditLog.target.ilike(f'%{search}%'))
        )
    pag = paginate(q, default_per_page=50)
    distinct_actions = [a[0] for a in db.session.query(AuditLog.action).distinct().all()]
    return jsonify({**to_response(pag, lambda l: l.to_dict()), 'actions': distinct_actions})


# --- SMS logs (Grandmother Network admin view) ---

@system_bp.get('/sms-logs')
@admin_required
def sms_logs():
    q = SMSLog.query.order_by(SMSLog.created_at.desc())
    if (kind := request.args.get('kind', '').strip()) and kind != 'All':
        q = q.filter_by(kind=kind)
    pag = paginate(q, default_per_page=50)
    return jsonify(to_response(pag, lambda s: s.to_dict()))
