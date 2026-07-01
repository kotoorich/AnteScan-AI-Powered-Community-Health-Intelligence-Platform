"""User authentication models."""
import bcrypt
from datetime import datetime
from app.extensions import db


class TimestampMixin:
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class User(db.Model, TimestampMixin):
    """Base authenticated identity — extended by CHW or AdminUser."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    kind = db.Column(db.String(20), nullable=False)  # 'chw' | 'admin'
    email = db.Column(db.String(120), unique=True, index=True, nullable=True)  # admin only
    phone = db.Column(db.String(20), unique=True, index=True, nullable=True)   # CHW primary
    password_hash = db.Column(db.String(128), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    twofa_enabled = db.Column(db.Boolean, default=False)
    last_login = db.Column(db.DateTime, nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)  # filename in /uploads/avatars/
    preferences = db.Column(db.Text, nullable=True)  # JSON blob of user prefs

    def set_password(self, raw: str):
        self.password_hash = bcrypt.hashpw(raw.encode(), bcrypt.gensalt()).decode()

    def check_password(self, raw: str) -> bool:
        try:
            return bcrypt.checkpw(raw.encode(), self.password_hash.encode())
        except Exception:
            return False


class AdminUser(db.Model, TimestampMixin):
    """Admin profile — Super / Regional / District / Data Scientist."""
    __tablename__ = 'admin_users'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(40), nullable=False, default='District Admin')
    region = db.Column(db.String(80), nullable=True)
    district = db.Column(db.String(80), nullable=True)
    status = db.Column(db.String(20), default='Active')

    user = db.relationship('User', backref=db.backref('admin', uselist=False))

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.user.email if self.user else None,
            'name': self.name,
            'role': self.role,
            'region': self.region,
            'district': self.district,
            'status': self.status,
            'lastLogin': self.user.last_login.isoformat() if self.user and self.user.last_login else None,
        }
