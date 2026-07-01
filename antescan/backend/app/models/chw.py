"""CHW (Community Health Worker) and CHPS compound models."""
from datetime import datetime
from app.extensions import db
from .user import TimestampMixin


class Compound(db.Model, TimestampMixin):
    """CHPS (Community-based Health Planning and Services) compound."""
    __tablename__ = 'compounds'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    region = db.Column(db.String(80), nullable=False)
    district = db.Column(db.String(80), nullable=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    catchment_population = db.Column(db.Integer, default=0)
    chws = db.relationship('CHW', backref='compound_obj', lazy='dynamic')

    def to_dict(self, include_metrics=False):
        d = {
            'id': self.id, 'name': self.name, 'region': self.region, 'district': self.district,
            'latitude': self.latitude, 'longitude': self.longitude, 'phone': self.phone,
            'catchmentPopulation': self.catchment_population,
        }
        if include_metrics:
            d['chws'] = self.chws.count()
            d['patients'] = sum(c.patients.count() for c in self.chws)
        return d


class CHW(db.Model, TimestampMixin):
    """Community Health Worker — links to a User for auth."""
    __tablename__ = 'chws'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    chw_id = db.Column(db.String(40), unique=True, nullable=False)  # GHS-CHW-XXXXX
    name = db.Column(db.String(120), nullable=False)
    region = db.Column(db.String(80), nullable=False)
    district = db.Column(db.String(80), nullable=False)
    compound_id = db.Column(db.Integer, db.ForeignKey('compounds.id'), nullable=True)
    badge = db.Column(db.String(20), default='Bronze')  # Bronze/Silver/Gold/Diamond
    status = db.Column(db.String(20), default='Active')
    language = db.Column(db.String(20), default='English')
    last_active = db.Column(db.DateTime, nullable=True)

    user = db.relationship('User', backref=db.backref('chw', uselist=False))
    patients = db.relationship('Patient', backref='chw', lazy='dynamic', foreign_keys='Patient.chw_id')

    @property
    def total_screenings(self):
        from .screening import Screening
        return Screening.query.filter_by(chw_id=self.id).count()

    @property
    def week_screenings(self):
        from .screening import Screening
        from datetime import timedelta
        week_ago = datetime.utcnow() - timedelta(days=7)
        return Screening.query.filter(Screening.chw_id == self.id, Screening.created_at >= week_ago).count()

    def to_dict(self, compact=False):
        d = {
            'id': self.id, 'chwId': self.chw_id, 'name': self.name,
            'region': self.region, 'district': self.district, 'badge': self.badge,
            'status': self.status, 'language': self.language,
            'compound': self.compound_obj.name if self.compound_obj else None,
            'lastActive': self.last_active.isoformat() if self.last_active else None,
        }
        if not compact:
            d.update({
                'totalScreenings': self.total_screenings,
                'weekScreenings': self.week_screenings,
                'phone': self.user.phone if self.user else None,
            })
        return d
