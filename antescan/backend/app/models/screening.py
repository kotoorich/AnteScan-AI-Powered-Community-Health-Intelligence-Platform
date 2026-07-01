"""Screening records and reported symptoms."""
import json
from datetime import datetime
from app.extensions import db
from .user import TimestampMixin


class Screening(db.Model, TimestampMixin):
    """A single risk assessment performed by a CHW."""
    __tablename__ = 'screenings'

    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False, index=True)
    chw_id = db.Column(db.Integer, db.ForeignKey('chws.id'), nullable=False, index=True)
    module = db.Column(db.String(40), nullable=False)  # ANC | NutriCheck | Sickle Cell

    # ANC vitals
    bp_systolic = db.Column(db.Integer, nullable=True)
    bp_diastolic = db.Column(db.Integer, nullable=True)
    weight_kg = db.Column(db.Float, nullable=True)
    height_cm = db.Column(db.Float, nullable=True)
    temperature_c = db.Column(db.Float, nullable=True)
    pulse_bpm = db.Column(db.Integer, nullable=True)

    # ANC obstetric
    gestational_age = db.Column(db.Integer, nullable=True)
    fundal_height = db.Column(db.Float, nullable=True)
    fetal_hr = db.Column(db.Integer, nullable=True)
    presentation = db.Column(db.String(40), nullable=True)
    gravida = db.Column(db.Integer, nullable=True)
    parity = db.Column(db.Integer, nullable=True)

    # NutriCheck anthropometry
    muac_mm = db.Column(db.Float, nullable=True)
    oedema = db.Column(db.Boolean, default=False)
    breastfeeding = db.Column(db.Boolean, nullable=True)
    meals_per_day = db.Column(db.Integer, nullable=True)
    diarrhea_2w = db.Column(db.Boolean, nullable=True)

    # WHO Z-scores (calculated server-side)
    whz = db.Column(db.Float, nullable=True)  # weight-for-height
    haz = db.Column(db.Float, nullable=True)  # height-for-age
    waz = db.Column(db.Float, nullable=True)  # weight-for-age
    muac_z = db.Column(db.Float, nullable=True)

    # NutriCheck classification
    nutri_class = db.Column(db.String(20), nullable=True)  # Normal | MAM | SAM

    # Sickle Cell
    has_image = db.Column(db.Boolean, default=False)
    image_path = db.Column(db.String(255), nullable=True)
    cv_confidence = db.Column(db.Float, nullable=True)
    sickle_signs_count = db.Column(db.Integer, default=0)

    # Voice input
    voice_transcript = db.Column(db.Text, nullable=True)
    voice_language = db.Column(db.String(20), nullable=True)

    # Risk output
    risk_score = db.Column(db.Integer, nullable=False, default=0)
    risk_level = db.Column(db.String(20), nullable=False, default='low')
    risk_reasons = db.Column(db.Text, nullable=True)  # JSON list
    model_version = db.Column(db.String(40), nullable=True)
    used_rule_fallback = db.Column(db.Boolean, default=False)

    # Sync metadata
    client_uuid = db.Column(db.String(40), unique=True, nullable=True)  # for offline sync dedup
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    synced_at = db.Column(db.DateTime, nullable=True)

    symptoms = db.relationship('ScreeningSymptom', backref='screening', cascade='all, delete-orphan')

    @property
    def reasons_list(self):
        try:
            return json.loads(self.risk_reasons) if self.risk_reasons else []
        except Exception:
            return []

    def to_dict(self, full=False):
        d = {
            'id': self.id,
            'patientId': self.patient_id,
            'chwId': self.chw_id,
            'module': self.module,
            'riskScore': self.risk_score,
            'riskLevel': self.risk_level,
            'reasons': self.reasons_list,
            'createdAt': self.created_at.isoformat(),
            'modelVersion': self.model_version,
        }
        if full:
            d.update({
                'bp': f"{self.bp_systolic}/{self.bp_diastolic}" if self.bp_systolic else None,
                'weight': self.weight_kg, 'height': self.height_cm,
                'temperature': self.temperature_c, 'pulse': self.pulse_bpm,
                'gestationalAge': self.gestational_age, 'fetalHr': self.fetal_hr,
                'muac': self.muac_mm, 'oedema': self.oedema, 'nutriClass': self.nutri_class,
                'whz': self.whz, 'haz': self.haz, 'waz': self.waz, 'muacZ': self.muac_z,
                'symptoms': [s.symptom_key for s in self.symptoms],
                'voiceTranscript': self.voice_transcript,
                'voiceLanguage': self.voice_language,
                'usedRuleFallback': self.used_rule_fallback,
            })
        return d


class ScreeningSymptom(db.Model):
    """Many-to-many: a screening can have multiple symptoms reported."""
    __tablename__ = 'screening_symptoms'

    id = db.Column(db.Integer, primary_key=True)
    screening_id = db.Column(db.Integer, db.ForeignKey('screenings.id'), nullable=False)
    symptom_key = db.Column(db.String(60), nullable=False)
    voice_matched = db.Column(db.Boolean, default=False)
