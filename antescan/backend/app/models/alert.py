"""High-risk alerts surfaced to admins."""
from datetime import datetime
from app.extensions import db
from .user import TimestampMixin


class Alert(db.Model, TimestampMixin):
    __tablename__ = 'alerts'

    id = db.Column(db.Integer, primary_key=True)
    screening_id = db.Column(db.Integer, db.ForeignKey('screenings.id'), nullable=False, index=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False, index=True)
    chw_id = db.Column(db.Integer, db.ForeignKey('chws.id'), nullable=False)
    severity = db.Column(db.String(20), nullable=False)  # high | emergency
    status = db.Column(db.String(20), default='Open')   # Open | Acknowledged | Resolved
    acknowledged_by = db.Column(db.Integer, db.ForeignKey('admin_users.id'), nullable=True)
    acknowledged_at = db.Column(db.DateTime, nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    resolution_notes = db.Column(db.Text, nullable=True)

    screening = db.relationship('Screening', backref='alerts')
    patient = db.relationship('Patient', backref='alerts')
    chw = db.relationship('CHW', backref='alerts')

    def to_dict(self):
        elapsed_s = (datetime.utcnow() - self.created_at).total_seconds()
        if elapsed_s < 60:
            elapsed = 'just now'
        elif elapsed_s < 3600:
            elapsed = f'{int(elapsed_s / 60)} min ago'
        elif elapsed_s < 86400:
            elapsed = f'{int(elapsed_s / 3600)} hours ago'
        else:
            elapsed = f'{int(elapsed_s / 86400)} days ago'

        return {
            'id': self.id,
            'patient': self.patient.full_name if self.patient else None,
            'age': self.patient.age if self.patient else None,
            'chw': self.chw.name if self.chw else None,
            'compound': self.chw.compound_obj.name if self.chw and self.chw.compound_obj else None,
            'district': self.chw.district if self.chw else None,
            'riskScore': self.screening.risk_score if self.screening else 0,
            'risk': self.severity,
            'symptoms': [s.symptom_key for s in (self.screening.symptoms if self.screening else [])],
            'elapsed': elapsed,
            'status': self.status,
            'referralStatus': self.screening.referrals[0].status if self.screening and self.screening.referrals else 'None',
        }
