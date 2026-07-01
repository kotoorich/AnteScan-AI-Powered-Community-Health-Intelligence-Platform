"""Key-value system settings."""
from app.extensions import db
from .user import TimestampMixin


class Setting(db.Model, TimestampMixin):
    __tablename__ = 'settings'

    id = db.Column(db.Integer, primary_key=True)
    section = db.Column(db.String(40), nullable=False, index=True)  # sms | thresholds | security
    key = db.Column(db.String(80), nullable=False)
    value = db.Column(db.Text, nullable=True)
    value_type = db.Column(db.String(20), default='string')  # string | int | float | bool | json

    __table_args__ = (db.UniqueConstraint('section', 'key', name='uq_section_key'),)

    def cast_value(self):
        if self.value is None:
            return None
        if self.value_type == 'int':
            try: return int(self.value)
            except: return None
        if self.value_type == 'float':
            try: return float(self.value)
            except: return None
        if self.value_type == 'bool':
            return self.value.lower() in ('true', '1', 'yes')
        if self.value_type == 'json':
            import json
            try: return json.loads(self.value)
            except: return None
        return self.value
