"""Dataset registry — DHS/MICS6/WHO datasets that admins manage."""
from app.extensions import db
from .user import TimestampMixin


class Dataset(db.Model, TimestampMixin):
    __tablename__ = 'datasets'

    id = db.Column(db.String(40), primary_key=True)  # ds_ghbr, ds_mics_ch, etc.
    name = db.Column(db.String(200), nullable=False)
    code = db.Column(db.String(40), unique=True, nullable=False)
    description = db.Column(db.Text, nullable=True)
    source = db.Column(db.String(160), nullable=True)
    source_url = db.Column(db.String(255), nullable=True)
    module = db.Column(db.String(40), default='Unassigned')
    version = db.Column(db.String(40), default='v1.0')
    file_type = db.Column(db.String(40), nullable=True)  # DAT+DCF, SPSS .sav, CSV, etc.
    archive_filename = db.Column(db.String(200), nullable=True)
    storage_path = db.Column(db.String(255), nullable=True)
    size_bytes = db.Column(db.BigInteger, default=0)
    rows = db.Column(db.Integer, default=0)
    columns_count = db.Column(db.Integer, default=0)
    files_json = db.Column(db.Text, nullable=True)  # JSON array of filenames
    status = db.Column(db.String(40), default='Active')  # Active | Awaiting Upload | Processing | Error
    uploaded_by = db.Column(db.String(120), default='System')
    quality_score = db.Column(db.Float, nullable=True)  # 0-1 data quality assessment
    quality_issues = db.Column(db.Text, nullable=True)  # JSON list of issues

    columns = db.relationship('DatasetColumn', backref='dataset', cascade='all, delete-orphan', lazy='dynamic')

    def to_dict(self):
        import json
        try:
            files = json.loads(self.files_json) if self.files_json else []
        except Exception:
            files = []
        try:
            issues = json.loads(self.quality_issues) if self.quality_issues else []
        except Exception:
            issues = []
        size_mb = round(self.size_bytes / 1024 / 1024, 2) if self.size_bytes else 0
        return {
            'id': self.id, 'name': self.name, 'code': self.code,
            'description': self.description, 'source': self.source, 'sourceUrl': self.source_url,
            'module': self.module, 'version': self.version, 'fileType': self.file_type,
            'rows': self.rows, 'columns': self.columns_count,
            'size': f'{size_mb} MB' if size_mb else '—',
            'files': files,
            'status': self.status, 'uploadedBy': self.uploaded_by,
            'uploadedAt': self.created_at.isoformat() if self.created_at else None,
            'downloadable': self.status == 'Active' and bool(self.storage_path),
            'archiveUrl': f'/api/datasets/{self.id}/download' if self.storage_path else None,
            'qualityScore': self.quality_score,
            'qualityIssues': issues,
        }


class DatasetColumn(db.Model):
    __tablename__ = 'dataset_columns'

    id = db.Column(db.Integer, primary_key=True)
    dataset_id = db.Column(db.String(40), db.ForeignKey('datasets.id'), nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    label = db.Column(db.String(255), nullable=True)
    dtype = db.Column(db.String(40), nullable=False)  # numeric | categorical | string | datetime
    nulls = db.Column(db.Integer, default=0)
    unique_count = db.Column(db.Integer, default=0)
    is_target = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            'name': self.name, 'label': self.label, 'type': self.dtype,
            'nulls': self.nulls, 'unique': self.unique_count, 'target': self.is_target,
        }
