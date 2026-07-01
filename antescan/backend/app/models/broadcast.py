"""Broadcast messages from admin to CHWs."""
from app.extensions import db
from .user import TimestampMixin


class Broadcast(db.Model, TimestampMixin):
    __tablename__ = 'broadcasts'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=False)
    channel = db.Column(db.String(20), default='both')  # sms | app | both
    audience = db.Column(db.String(40), default='all')  # all | region | district | individual
    target_region = db.Column(db.String(80), nullable=True)
    target_district = db.Column(db.String(80), nullable=True)
    target_chw_ids = db.Column(db.Text, nullable=True)  # JSON list
    language = db.Column(db.String(20), default='English')
    scheduled_at = db.Column(db.DateTime, nullable=True)
    sent_at = db.Column(db.DateTime, nullable=True)
    recipients_count = db.Column(db.Integer, default=0)
    opens_count = db.Column(db.Integer, default=0)
    created_by = db.Column(db.Integer, db.ForeignKey('admin_users.id'), nullable=True)
    status = db.Column(db.String(20), default='Draft')  # Draft | Scheduled | Sent | Failed

    def to_dict(self):
        return {
            'id': self.id, 'title': self.title, 'body': self.body, 'channel': self.channel,
            'audience': self.audience, 'language': self.language,
            'scheduledAt': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'sentAt': self.sent_at.isoformat() if self.sent_at else None,
            'recipients': self.recipients_count, 'opens': self.opens_count, 'status': self.status,
            'when': (self.sent_at or self.created_at).isoformat(),
        }
