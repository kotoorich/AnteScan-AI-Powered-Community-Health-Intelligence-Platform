"""SMS log — referrals, family elder alerts, broadcasts, OTPs."""
from app.extensions import db
from .user import TimestampMixin


class SMSLog(db.Model, TimestampMixin):
    __tablename__ = 'sms_logs'

    id = db.Column(db.Integer, primary_key=True)
    kind = db.Column(db.String(40), nullable=False, index=True)
    # referral | elder_alert | broadcast | otp | reminder
    to_phone = db.Column(db.String(20), nullable=False, index=True)
    to_name = db.Column(db.String(120), nullable=True)
    body = db.Column(db.Text, nullable=False)
    language = db.Column(db.String(20), default='English')
    status = db.Column(db.String(20), default='Pending')  # Pending | Sent | Delivered | Failed
    provider = db.Column(db.String(40), nullable=True)
    provider_sid = db.Column(db.String(80), nullable=True)
    error = db.Column(db.String(255), nullable=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=True)
    referral_id = db.Column(db.Integer, db.ForeignKey('referrals.id'), nullable=True)
    family_elder_id = db.Column(db.Integer, db.ForeignKey('family_elders.id'), nullable=True)
    sent_by_chw_id = db.Column(db.Integer, db.ForeignKey('chws.id'), nullable=True)
    cost_pesewas = db.Column(db.Integer, default=0)
    sent_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            'id': self.id, 'kind': self.kind, 'toPhone': self.to_phone, 'toName': self.to_name,
            'body': self.body, 'language': self.language, 'status': self.status,
            'provider': self.provider, 'error': self.error,
            'sentAt': self.sent_at.isoformat() if self.sent_at else None,
            'createdAt': self.created_at.isoformat(),
            'costPesewas': self.cost_pesewas,
        }
