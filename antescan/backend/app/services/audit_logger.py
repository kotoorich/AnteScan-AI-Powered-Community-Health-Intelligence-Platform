"""Centralized audit logging."""
import json
from datetime import datetime
from flask import request
from app.extensions import db
from app.models.audit import AuditLog


CRITICAL_ACTIONS = {
    'USER_CREATE', 'USER_DELETE', 'USER_DEACTIVATE',
    'MODEL_DEPLOY', 'MODEL_ROLLBACK',
    'SETTINGS_CHANGE', 'PERMISSION_CHANGE',
    'DATASET_DELETE', 'AUTH_LOGIN_FAILED', 'BROADCAST_SEND_ALL',
}


def log(action: str, target: str = None, actor=None, details: dict = None):
    """Write an audit entry. `actor` is User model instance or None."""
    is_critical = action in CRITICAL_ACTIONS
    try:
        ip = request.remote_addr if request else None
        ua = request.headers.get('User-Agent', '')[:255] if request else None
    except Exception:
        ip, ua = None, None

    entry = AuditLog(
        action=action,
        target=target,
        actor_id=actor.id if actor else None,
        actor_email=(actor.email if actor and hasattr(actor, 'email') else
                     actor.phone if actor and hasattr(actor, 'phone') else '—'),
        ip_address=ip,
        user_agent=ua,
        is_critical=is_critical,
        details_json=json.dumps(details) if details else None,
    )
    db.session.add(entry)
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
