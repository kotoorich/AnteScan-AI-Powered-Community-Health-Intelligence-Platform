"""Authentication blueprint — CHW + Admin login, register, refresh, OTP."""
import re, random
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity, get_jwt,
)
from app.extensions import db
from app.models import User, CHW, AdminUser
from app.services.audit_logger import log as audit
from app.services.sms import send_sms, render as render_sms

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

GHANA_PHONE_RE = re.compile(r'^0(20|24|50|54|55|59|26|56|27|57)\d{7}$')

# In-memory OTP store (production: Redis with TTL)
_otp_store: dict[str, dict] = {}


def _profile_for(user: User):
    """Build profile dict for JWT response."""
    avatar = None
    if user.avatar_url:
        avatar_dir = os.path.join(current_app.instance_path, '..', 'data', 'avatars')
        avatar_dir = os.path.abspath(avatar_dir)
        full = os.path.join(avatar_dir, user.avatar_url)
        if os.path.exists(full):
            avatar = f'/api/auth/avatar/{user.avatar_url}'
        else:
            # File was deleted out-of-band — clean up the DB reference so
            # stale URLs don't keep 404'ing in the UI.
            user.avatar_url = None
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
    if user.kind == 'chw' and user.chw:
        c = user.chw
        return {
            'kind': 'chw', 'id': user.id,
            'chwId': c.chw_id, 'name': c.name,
            'compound': c.compound_obj.name if c.compound_obj else None,
            'district': c.district, 'region': c.region,
            'phone': user.phone, 'badge': c.badge,
            'totalScreenings': c.total_screenings, 'language': c.language,
            'avatarUrl': avatar,
        }
    if user.kind == 'admin' and user.admin:
        a = user.admin
        return {
            'kind': 'admin', 'id': user.id,
            'email': user.email, 'name': a.name,
            'role': a.role, 'region': a.region, 'district': a.district,
            'avatarUrl': avatar,
        }
    return None


@bp.post('/chw/login')
def chw_login():
    data = request.get_json() or {}
    chw_id = (data.get('chwId') or '').strip().upper()
    password = data.get('password') or ''
    if not chw_id or not password:
        return jsonify({'error': 'CHW ID and password required'}), 400

    chw = CHW.query.filter_by(chw_id=chw_id).first()
    if not chw or not chw.user or not chw.user.check_password(password):
        audit('AUTH_LOGIN_FAILED', target=f'chwId={chw_id}')
        return jsonify({'error': 'Invalid credentials'}), 401

    chw.user.last_login = datetime.utcnow()
    chw.last_active = datetime.utcnow()
    db.session.commit()

    token = create_access_token(identity=str(chw.user.id))
    refresh = create_refresh_token(identity=str(chw.user.id))
    audit('AUTH_LOGIN_SUCCESS', target=f'chw {chw_id}', actor=chw.user)
    return jsonify({
        'accessToken': token, 'refreshToken': refresh,
        'user': _profile_for(chw.user),
    })


@bp.post('/chw/register')
def chw_register():
    data = request.get_json() or {}
    required = ['fullName', 'chwId', 'phone', 'region', 'district', 'compound', 'password']
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({'error': f'Missing fields: {", ".join(missing)}'}), 400

    phone = data['phone'].strip()
    if not GHANA_PHONE_RE.match(phone):
        return jsonify({'error': 'Invalid Ghana phone number'}), 400

    chw_id = data['chwId'].strip().upper()
    if CHW.query.filter_by(chw_id=chw_id).first():
        return jsonify({'error': 'CHW ID already registered'}), 409
    if User.query.filter_by(phone=phone).first():
        return jsonify({'error': 'Phone number already registered'}), 409

    user = User(kind='chw', phone=phone)
    user.set_password(data['password'])
    db.session.add(user)
    db.session.flush()

    # Resolve or create compound by name
    from app.models import Compound
    compound = Compound.query.filter_by(name=data['compound'].strip()).first()
    if not compound:
        compound = Compound(name=data['compound'].strip(),
                             region=data['region'].strip(),
                             district=data['district'].strip())
        db.session.add(compound)
        db.session.flush()

    chw = CHW(user_id=user.id, chw_id=chw_id, name=data['fullName'].strip(),
              region=data['region'].strip(), district=data['district'].strip(),
              compound_id=compound.id, language=data.get('language', 'English'))
    db.session.add(chw)
    db.session.commit()

    audit('CHW_REGISTER', target=chw_id, actor=user)
    token = create_access_token(identity=str(user.id))
    refresh = create_refresh_token(identity=str(user.id))
    return jsonify({
        'accessToken': token, 'refreshToken': refresh,
        'user': _profile_for(user),
    }), 201


@bp.post('/admin/login')
def admin_login():
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    user = User.query.filter_by(email=email, kind='admin').first()
    if not user or not user.check_password(password):
        audit('AUTH_LOGIN_FAILED', target=f'admin {email}')
        return jsonify({'error': 'Invalid credentials'}), 401

    user.last_login = datetime.utcnow()
    db.session.commit()
    token = create_access_token(identity=str(user.id))
    refresh = create_refresh_token(identity=str(user.id))
    audit('AUTH_LOGIN_SUCCESS', target=email, actor=user)
    return jsonify({
        'accessToken': token, 'refreshToken': refresh,
        'user': _profile_for(user),
    })


@bp.post('/refresh')
@jwt_required(refresh=True)
def refresh():
    uid = get_jwt_identity()
    new_token = create_access_token(identity=uid)
    return jsonify({'accessToken': new_token})


@bp.post('/forgot/request')
def forgot_request():
    """Send OTP via SMS for password reset."""
    data = request.get_json() or {}
    phone = (data.get('phone') or '').strip()
    if not GHANA_PHONE_RE.match(phone):
        return jsonify({'error': 'Invalid Ghana phone number'}), 400
    user = User.query.filter_by(phone=phone).first()
    if not user:
        # Do not reveal user existence
        return jsonify({'ok': True})
    code = f'{random.randint(1000, 9999)}'
    _otp_store[phone] = {'code': code, 'expires': datetime.utcnow() + timedelta(minutes=5)}
    body = render_sms('otp', user.chw.language if user.chw else 'English', code=code)
    send_sms(phone, body, kind='otp', language=user.chw.language if user.chw else 'English')
    audit('OTP_REQUESTED', target=phone)
    return jsonify({'ok': True})


@bp.post('/forgot/verify')
def forgot_verify():
    data = request.get_json() or {}
    phone = (data.get('phone') or '').strip()
    code = (data.get('code') or '').strip()
    new_password = data.get('newPassword') or ''
    entry = _otp_store.get(phone)
    if not entry or entry['expires'] < datetime.utcnow() or entry['code'] != code:
        return jsonify({'error': 'Invalid or expired OTP'}), 400
    if len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    user = User.query.filter_by(phone=phone).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    user.set_password(new_password)
    db.session.commit()
    _otp_store.pop(phone, None)
    audit('PASSWORD_RESET', target=phone, actor=user)
    return jsonify({'ok': True})


@bp.get('/me')
@jwt_required()
def me():
    uid = get_jwt_identity()
    user = User.query.get(uid)
    if not user:
        return jsonify({'error': 'Not found'}), 404
    return jsonify({'user': _profile_for(user)})


# ─── Profile management ─────────────────────────────────────────────────

import os, json
from werkzeug.utils import secure_filename
from flask import send_from_directory

ALLOWED_AVATAR_EXTS = {'png', 'jpg', 'jpeg', 'webp'}
MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2MB


@bp.patch('/profile')
@jwt_required()
def update_profile():
    """Update user's own profile (name, phone, email, language, password)."""
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({'error': 'Not found'}), 404
    data = request.get_json() or {}

    # CHW-specific updates
    if user.kind == 'chw' and user.chw:
        c = user.chw
        if 'name' in data and data['name'].strip():
            c.name = data['name'].strip()
        if 'language' in data:
            c.language = data['language']
        if 'phone' in data and data['phone']:
            phone = data['phone'].strip()
            if not GHANA_PHONE_RE.match(phone):
                return jsonify({'error': 'Invalid Ghanaian phone number'}), 400
            if phone != user.phone and User.query.filter_by(phone=phone).first():
                return jsonify({'error': 'Phone already in use'}), 400
            user.phone = phone

    # Admin-specific updates
    if user.kind == 'admin' and user.admin:
        a = user.admin
        if 'name' in data and data['name'].strip():
            a.name = data['name'].strip()
        if 'email' in data and data['email']:
            email = data['email'].strip().lower()
            if email != user.email and User.query.filter_by(email=email).first():
                return jsonify({'error': 'Email already in use'}), 400
            user.email = email

    # Password change (requires current password)
    if data.get('newPassword'):
        if not data.get('currentPassword') or not user.check_password(data['currentPassword']):
            return jsonify({'error': 'Current password incorrect'}), 400
        if len(data['newPassword']) < 6:
            return jsonify({'error': 'Password must be at least 6 characters'}), 400
        user.set_password(data['newPassword'])

    db.session.commit()
    audit('PROFILE_UPDATE', target=f'user {user.id}', actor=user,
          details={'fields': list(data.keys())})
    return jsonify({'user': _profile_for(user), 'message': 'Profile updated'})


@bp.post('/avatar')
@jwt_required()
def upload_avatar():
    """Upload or replace the current user's avatar image."""
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({'error': 'Not found'}), 404
    if 'file' not in request.files:
        return jsonify({'error': 'No file in request'}), 400
    file = request.files['file']
    if not file or not file.filename:
        return jsonify({'error': 'No file provided'}), 400

    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in ALLOWED_AVATAR_EXTS:
        return jsonify({'error': f'Allowed types: {", ".join(ALLOWED_AVATAR_EXTS)}'}), 400

    # Size check
    file.seek(0, 2); size = file.tell(); file.seek(0)
    if size > MAX_AVATAR_BYTES:
        return jsonify({'error': 'File too large (max 2 MB)'}), 400

    avatar_dir = os.path.join(current_app.instance_path, '..', 'data', 'avatars')
    avatar_dir = os.path.abspath(avatar_dir)
    os.makedirs(avatar_dir, exist_ok=True)

    # Delete old avatar
    if user.avatar_url:
        old = os.path.join(avatar_dir, user.avatar_url)
        if os.path.exists(old):
            try: os.remove(old)
            except OSError: pass

    filename = secure_filename(f'user_{user.id}_{int(datetime.utcnow().timestamp())}.{ext}')
    file.save(os.path.join(avatar_dir, filename))
    user.avatar_url = filename
    db.session.commit()
    audit('AVATAR_UPDATE', target=f'user {user.id}', actor=user)
    return jsonify({'avatarUrl': f'/api/auth/avatar/{filename}', 'user': _profile_for(user)})


@bp.get('/avatar/<path:filename>')
def serve_avatar(filename):
    """Serve a user's avatar image."""
    avatar_dir = os.path.join(current_app.instance_path, '..', 'data', 'avatars')
    avatar_dir = os.path.abspath(avatar_dir)
    return send_from_directory(avatar_dir, filename)


@bp.delete('/avatar')
@jwt_required()
def delete_avatar():
    user = User.query.get(get_jwt_identity())
    if user and user.avatar_url:
        avatar_dir = os.path.join(current_app.instance_path, '..', 'data', 'avatars')
        avatar_dir = os.path.abspath(avatar_dir)
        old = os.path.join(avatar_dir, user.avatar_url)
        if os.path.exists(old):
            try: os.remove(old)
            except OSError: pass
        user.avatar_url = None
        db.session.commit()
    return jsonify({'user': _profile_for(user)})


@bp.get('/preferences')
@jwt_required()
def get_preferences():
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({'error': 'Not found'}), 404
    try:
        prefs = json.loads(user.preferences) if user.preferences else {}
    except Exception:
        prefs = {}
    # Defaults
    return jsonify({
        'theme': prefs.get('theme', 'dark'),
        'language': prefs.get('language', 'en'),
        'notifications': {
            'email': prefs.get('notifications', {}).get('email', True),
            'sms': prefs.get('notifications', {}).get('sms', True),
            'push': prefs.get('notifications', {}).get('push', True),
            'highRiskAlerts': prefs.get('notifications', {}).get('highRiskAlerts', True),
        },
        'offlineSync': {
            'autoSync': prefs.get('offlineSync', {}).get('autoSync', True),
            'syncOnWifiOnly': prefs.get('offlineSync', {}).get('syncOnWifiOnly', False),
        },
    })


@bp.patch('/preferences')
@jwt_required()
def update_preferences():
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({'error': 'Not found'}), 404
    data = request.get_json() or {}
    try:
        current = json.loads(user.preferences) if user.preferences else {}
    except Exception:
        current = {}
    # Deep merge
    def merge(a, b):
        for k, v in b.items():
            if isinstance(v, dict) and isinstance(a.get(k), dict):
                merge(a[k], v)
            else:
                a[k] = v
        return a
    merged = merge(current, data)
    user.preferences = json.dumps(merged)
    db.session.commit()
    audit('PREFERENCES_UPDATE', target=f'user {user.id}', actor=user)
    return jsonify(merged)


@bp.delete('/account')
@jwt_required()
def delete_account():
    """User deletes their own account. Requires password confirmation."""
    user = User.query.get(get_jwt_identity())
    if not user:
        return jsonify({'error': 'Not found'}), 404
    data = request.get_json() or {}
    password = data.get('password', '')
    if not user.check_password(password):
        return jsonify({'error': 'Password incorrect'}), 400

    # Safety: super admin cannot self-delete (must be removed by another super)
    if user.kind == 'admin' and user.admin and user.admin.role == 'Super Admin':
        if AdminUser.query.filter_by(role='Super Admin').count() <= 1:
            return jsonify({'error': 'Cannot delete the only super admin'}), 400

    audit('ACCOUNT_DELETE', target=f'user {user.id}', actor=user,
          details={'kind': user.kind})

    # Cascade: detach from CHW/AdminUser then delete user
    if user.chw:
        # Soft-deactivate CHW so screenings/patients retain attribution but block login
        user.chw.status = 'Inactive'
    if user.admin:
        user.admin.status = 'Inactive'

    user.is_active = False
    # Wipe credentials so the row can't be used to log in even if reactivated
    user.set_password(os.urandom(24).hex())
    user.email = None if user.kind != 'admin' else f'deleted_{user.id}@deleted.local'
    user.phone = None
    if user.avatar_url:
        avatar_dir = os.path.join(current_app.instance_path, '..', 'data', 'avatars')
        avatar_dir = os.path.abspath(avatar_dir)
        old = os.path.join(avatar_dir, user.avatar_url)
        if os.path.exists(old):
            try: os.remove(old)
            except OSError: pass
        user.avatar_url = None
    db.session.commit()
    return jsonify({'message': 'Account deactivated'})
