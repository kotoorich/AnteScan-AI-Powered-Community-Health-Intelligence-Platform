"""ML model registry — supports versioning and rollback."""
from app.extensions import db
from .user import TimestampMixin


class MLModel(db.Model, TimestampMixin):
    __tablename__ = 'ml_models'

    id = db.Column(db.String(80), primary_key=True)  # e.g. anc_risk_model
    name = db.Column(db.String(160), nullable=False)
    module = db.Column(db.String(40), nullable=False)
    algorithm = db.Column(db.String(80), nullable=False)
    version = db.Column(db.String(40), nullable=False, default='1.0.0')
    training_dataset_id = db.Column(db.String(40), db.ForeignKey('datasets.id'), nullable=True)
    accuracy = db.Column(db.Float, nullable=True)
    precision = db.Column(db.Float, nullable=True)
    recall = db.Column(db.Float, nullable=True)
    f1 = db.Column(db.Float, nullable=True)
    status = db.Column(db.String(40), default='Testing')  # Active | Testing | Archived | Deprecated
    artifact_path = db.Column(db.String(255), nullable=True)  # .pkl on disk
    feature_columns = db.Column(db.Text, nullable=True)  # JSON list
    hyperparameters = db.Column(db.Text, nullable=True)  # JSON dict
    deployed_at = db.Column(db.DateTime, nullable=True)

    training_runs = db.relationship('ModelTrainingRun', backref='model_obj', lazy='dynamic')

    def to_dict(self):
        import json
        try:
            features = json.loads(self.feature_columns) if self.feature_columns else []
        except Exception:
            features = []
        try:
            hps = json.loads(self.hyperparameters) if self.hyperparameters else {}
        except Exception:
            hps = {}
        return {
            'id': self.id, 'name': self.name, 'module': self.module,
            'algorithm': self.algorithm, 'version': self.version,
            'trainingDataset': self.training_dataset_id,
            'accuracy': self.accuracy, 'precision': self.precision,
            'recall': self.recall, 'f1': self.f1,
            'status': self.status, 'features': features, 'hyperparameters': hps,
            'deployedAt': self.deployed_at.isoformat() if self.deployed_at else None,
        }


class ModelTrainingRun(db.Model, TimestampMixin):
    """Each training execution — for audit + rollback."""
    __tablename__ = 'model_training_runs'

    id = db.Column(db.Integer, primary_key=True)
    model_id = db.Column(db.String(80), db.ForeignKey('ml_models.id'), nullable=False)
    started_by = db.Column(db.Integer, db.ForeignKey('admin_users.id'), nullable=True)
    started_at = db.Column(db.DateTime, nullable=False)
    completed_at = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(40), default='Running')  # Running | Success | Failed
    accuracy = db.Column(db.Float, nullable=True)
    precision = db.Column(db.Float, nullable=True)
    recall = db.Column(db.Float, nullable=True)
    f1 = db.Column(db.Float, nullable=True)
    artifact_path = db.Column(db.String(255), nullable=True)
    log = db.Column(db.Text, nullable=True)
    duration_seconds = db.Column(db.Integer, nullable=True)

    def to_dict(self):
        return {
            'id': self.id, 'modelId': self.model_id,
            'startedAt': self.started_at.isoformat() if self.started_at else None,
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
            'status': self.status, 'durationSeconds': self.duration_seconds,
            'accuracy': self.accuracy, 'precision': self.precision,
            'recall': self.recall, 'f1': self.f1,
            'artifactPath': self.artifact_path,
        }
