"""Authorization decorators."""
from functools import wraps
from flask import jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from app.models import User, CHW, AdminUser


def _load_current():
    uid = get_jwt_identity()
    if not uid:
        return None
    user = User.query.get(uid)
    g.current_user = user
    return user


def chw_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = _load_current()
        if not user or user.kind != 'chw':
            return jsonify({'error': 'CHW access required'}), 403
        g.current_chw = user.chw
        return fn(*args, **kwargs)
    return wrapper


def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = _load_current()
        if not user or user.kind != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        g.current_admin = user.admin
        return fn(*args, **kwargs)
    return wrapper


def role_required(*roles):
    def deco(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user = _load_current()
            if not user or user.kind != 'admin' or user.admin.role not in roles:
                return jsonify({'error': f'Role required: {roles}'}), 403
            g.current_admin = user.admin
            return fn(*args, **kwargs)
        return wrapper
    return deco


def super_admin_required(fn):
    return role_required('Super Admin')(fn)


def auth_required(fn):
    """Accept any authenticated user (CHW or admin)."""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = _load_current()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        if user.kind == 'chw':
            g.current_chw = user.chw
        else:
            g.current_admin = user.admin
        return fn(*args, **kwargs)
    return wrapper
