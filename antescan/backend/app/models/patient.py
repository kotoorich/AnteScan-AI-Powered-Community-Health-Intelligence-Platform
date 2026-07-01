"""Patient and Family Elder (Grandmother Network) models."""
from datetime import datetime
from app.extensions import db
from .user import TimestampMixin


class Patient(db.Model, TimestampMixin):
    """Person enrolled in any of the three modules."""
    __tablename__ = 'patients'

    id = db.Column(db.Integer, primary_key=True)
    chw_id = db.Column(db.Integer, db.ForeignKey('chws.id'), nullable=False, index=True)
    full_name = db.Column(db.String(160), nullable=False)
    age = db.Column(db.Float, nullable=False)
    sex = db.Column(db.String(10), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    village = db.Column(db.String(120), nullable=True)
    gps_lat = db.Column(db.Float, nullable=True)
    gps_lng = db.Column(db.Float, nullable=True)
    primary_module = db.Column(db.String(40), nullable=False)  # ANC | NutriCheck | Sickle Cell
    pregnancy_status = db.Column(db.String(40), nullable=True)
    gestational_age = db.Column(db.Integer, nullable=True)
    expected_delivery = db.Column(db.Date, nullable=True)

    # NEW: Region and District for proper mapping on admin map
    region = db.Column(db.String(80), nullable=True)
    district = db.Column(db.String(80), nullable=True)

    family_elder_id = db.Column(db.Integer, db.ForeignKey('family_elders.id'), nullable=True)
    last_visit = db.Column(db.DateTime, nullable=True)

    screenings = db.relationship('Screening', backref='patient', lazy='dynamic', foreign_keys='Screening.patient_id')
    family_elder = db.relationship('FamilyElder', backref='patients')

    @property
    def latest_risk(self):
        latest = self.screenings.order_by(db.desc('created_at')).first()
        return latest.risk_level if latest else None

    @property
    def latest_risk_score(self):
        latest = self.screenings.order_by(db.desc('created_at')).first()
        return latest.risk_score if latest else None

    def to_dict(self, compact=True):
        d = {
            'id': self.id, 'name': self.full_name, 'age': self.age,
            'sex': self.sex, 'phone': self.phone, 'village': self.village,
            'module': self.primary_module, 'gestationalAge': self.gestational_age,
            'risk': self.latest_risk, 'riskScore': self.latest_risk_score,
            'lastVisit': self.last_visit.isoformat() if self.last_visit else None,
            'region': self.region,  # ADDED
            'district': self.district,  # ADDED
        }
        if not compact:
            d.update({
                'gpsLat': self.gps_lat, 'gpsLng': self.gps_lng,
                'pregnancyStatus': self.pregnancy_status,
                'expectedDelivery': self.expected_delivery.isoformat() if self.expected_delivery else None,
                'elderName': self.family_elder.name if self.family_elder else None,
                'elderPhone': self.family_elder.phone if self.family_elder else None,
                'chwName': self.chw.name if self.chw else None,
            })
        return d


class FamilyElder(db.Model, TimestampMixin):
    """Grandmother Network — trusted female elders who receive SMS alerts."""
    __tablename__ = 'family_elders'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    relationship = db.Column(db.String(40), default='Grandmother')
    village = db.Column(db.String(120), nullable=True)
    language = db.Column(db.String(20), default='Twi')
    sms_consent = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'phone': self.phone,
            'relationship': self.relationship, 'village': self.village,
            'language': self.language, 'smsConsent': self.sms_consent,
        }