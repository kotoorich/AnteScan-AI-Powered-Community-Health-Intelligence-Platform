"""Referral records — sent from CHW to nearest health facility."""
from datetime import datetime
from app.extensions import db
from .user import TimestampMixin


class Referral(db.Model, TimestampMixin):
    __tablename__ = 'referrals'

    id = db.Column(db.Integer, primary_key=True)
    screening_id = db.Column(db.Integer, db.ForeignKey('screenings.id'), nullable=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False, index=True)
    chw_id = db.Column(db.Integer, db.ForeignKey('chws.id'), nullable=False, index=True)
    module = db.Column(db.String(40), nullable=False)
    urgency = db.Column(db.String(20), default='Routine')  # Routine | Urgent | Emergency
    facility_name = db.Column(db.String(160), nullable=False)
    facility_phone = db.Column(db.String(20), nullable=True)
    sms_status = db.Column(db.String(20), default='Pending')
    sms_sid = db.Column(db.String(80), nullable=True)
    status = db.Column(db.String(20), default='Sent')  # Sent | Received | Completed | No-show | Cancelled
    elder_notified = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text, nullable=True)
    closed_at = db.Column(db.DateTime, nullable=True)

    patient = db.relationship('Patient', backref='referrals')
    chw = db.relationship('CHW', backref='referrals')
    screening = db.relationship('Screening', backref='referrals')

    @property
    def days_open(self):
        end = self.closed_at or datetime.utcnow()
        return max(0, (end - self.created_at).days)

    def to_dict(self):
        return {
            'id': self.id, 'patient': self.patient.full_name if self.patient else None,
            'patientId': self.patient_id, 'module': self.module, 'urgency': self.urgency,
            'chw': self.chw.name if self.chw else None,
            'compound': self.chw.compound_obj.name if self.chw and self.chw.compound_obj else None,
            'district': self.chw.district if self.chw else None,
            'facility': self.facility_name, 'status': self.status,
            'smsStatus': self.sms_status, 'elderNotified': self.elder_notified,
            'dateSent': self.created_at.isoformat(), 'daysOpen': self.days_open,
            'closedAt': self.closed_at.isoformat() if self.closed_at else None,
        }
