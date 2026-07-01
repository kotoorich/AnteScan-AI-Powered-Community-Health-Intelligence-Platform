"""Append-only audit log for admin actions."""
from datetime import datetime
from app.extensions import db


class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    actor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    actor_email = db.Column(db.String(120), nullable=True)
    action = db.Column(db.String(80), nullable=False, index=True)
    target = db.Column(db.String(255), nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    is_critical = db.Column(db.Boolean, default=False)
    details_json = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S') if self.timestamp else None,
            'actor': self.actor_email or '—',
            'action': self.action,
            'target': self.target,
            'ip': self.ip_address,
            'critical': self.is_critical,
        }
