"""Lab result attachments — sickle cell electrophoresis, blood tests."""
from app.extensions import db
from .user import TimestampMixin


class LabResult(db.Model, TimestampMixin):
    __tablename__ = 'lab_results'

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False, index=True)
    screening_id = db.Column(db.Integer, db.ForeignKey('screenings.id'), nullable=True)
    test_type = db.Column(db.String(80), nullable=False)
    # hb_electrophoresis | hemoglobin | malaria_rdt | urinalysis | other
    result = db.Column(db.String(120), nullable=False)  # e.g. AA, AS, SS, SC, AC, etc.
    interpretation = db.Column(db.Text, nullable=True)
    facility = db.Column(db.String(160), nullable=True)
    performed_at = db.Column(db.Date, nullable=True)
    document_path = db.Column(db.String(255), nullable=True)
    uploaded_by_chw_id = db.Column(db.Integer, db.ForeignKey('chws.id'), nullable=True)

    patient = db.relationship('Patient', backref='lab_results')

    def to_dict(self):
        return {
            'id': self.id, 'patientId': self.patient_id, 'testType': self.test_type,
            'result': self.result, 'interpretation': self.interpretation,
            'facility': self.facility,
            'performedAt': self.performed_at.isoformat() if self.performed_at else None,
            'createdAt': self.created_at.isoformat(),
            'hasDocument': bool(self.document_path),
        }
