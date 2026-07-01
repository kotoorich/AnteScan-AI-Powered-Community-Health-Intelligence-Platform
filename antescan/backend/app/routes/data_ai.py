"""Dataset Manager, Model Manager, Training Lab — Data & AI section."""
import os, json, time
from datetime import datetime
from threading import Thread
from flask import Blueprint, request, jsonify, g, current_app, send_file
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models import Dataset, DatasetColumn, MLModel, ModelTrainingRun
from app.utils.decorators import admin_required, role_required
from app.utils.pagination import paginate, to_response
from app.services.dhs_parser import parse_dataset, detect_format, extract_zip, find_primary_file, quality_check, to_records_safe
from app.services.audit_logger import log as audit

datasets_bp = Blueprint('datasets', __name__, url_prefix='/api/datasets')
models_bp = Blueprint('ml_models', __name__, url_prefix='/api/models')
training_bp = Blueprint('training', __name__, url_prefix='/api/training')


# --- Datasets ---

@datasets_bp.get('')
@admin_required
def list_datasets():
    q = Dataset.query.order_by(Dataset.created_at.desc())
    pag = paginate(q, default_per_page=50)
    return jsonify(to_response(pag, lambda d: d.to_dict()))


@datasets_bp.get('/<dataset_id>')
@admin_required
def get_dataset(dataset_id):
    d = Dataset.query.get_or_404(dataset_id)
    cols = [c.to_dict() for c in d.columns]
    return jsonify({**d.to_dict(), 'columns': cols})


@datasets_bp.get('/<dataset_id>/preview')
@admin_required
def preview_dataset(dataset_id):
    d = Dataset.query.get_or_404(dataset_id)
    if not d.storage_path or not os.path.exists(d.storage_path):
        return jsonify({'rows': [], 'note': 'No file on disk yet'})
    try:
        # If zip, extract first
        path = d.storage_path
        if path.lower().endswith('.zip'):
            import tempfile
            with tempfile.TemporaryDirectory() as tmp:
                files = extract_zip(path, tmp)
                primary = find_primary_file(files)
                if not primary:
                    return jsonify({'rows': []})
                preview_df, _, _ = parse_dataset(primary, preview_rows=30)
                rows = to_records_safe(preview_df, limit=30)
                return jsonify({'rows': rows})
        else:
            preview_df, _, _ = parse_dataset(path, preview_rows=30)
            rows = to_records_safe(preview_df, limit=30)
            return jsonify({'rows': rows})
    except Exception as e:
        return jsonify({'error': str(e), 'rows': []}), 500


@datasets_bp.get('/<dataset_id>/download')
@admin_required
def download_dataset(dataset_id):
    d = Dataset.query.get_or_404(dataset_id)
    if not d.storage_path or not os.path.exists(d.storage_path):
        return jsonify({'error': 'File not available'}), 404
    audit('DATASET_DOWNLOAD', target=dataset_id, actor=g.current_admin.user)
    return send_file(d.storage_path,
                     as_attachment=True,
                     download_name=d.archive_filename or os.path.basename(d.storage_path))


@datasets_bp.post('/upload')
@admin_required
def upload_dataset():
    """Drag-drop upload from admin UI. Parses + computes schema + quality score."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    f = request.files['file']
    if not f.filename:
        return jsonify({'error': 'Empty filename'}), 400

    safe_name = secure_filename(f.filename)
    storage_dir = current_app.config['DATASETS_DIR']
    os.makedirs(storage_dir, exist_ok=True)
    storage_path = os.path.join(storage_dir, f'{int(time.time())}_{safe_name}')
    f.save(storage_path)

    # Parse
    parse_path = storage_path
    if storage_path.lower().endswith('.zip'):
        import tempfile
        tmp = tempfile.mkdtemp(prefix='ds_extract_')
        files = extract_zip(storage_path, tmp)
        primary = find_primary_file(files)
        if not primary:
            return jsonify({'error': 'No parseable file inside zip'}), 400
        parse_path = primary

    try:
        preview_df, columns_meta, total_rows = parse_dataset(parse_path)
    except Exception as e:
        return jsonify({'error': f'Parse failed: {e}'}), 400

    quality = quality_check(preview_df, columns_meta)

    ds_id = f'ds_user_{int(time.time())}'
    module = request.form.get('module', 'Unassigned')
    d = Dataset(
        id=ds_id,
        name=os.path.splitext(safe_name)[0],
        code=safe_name.upper().replace('.', '_')[:30],
        description=request.form.get('description', 'User-uploaded dataset'),
        source=request.form.get('source', 'Manual upload'),
        module=module,
        file_type=detect_format(parse_path).upper(),
        archive_filename=safe_name,
        storage_path=storage_path,
        size_bytes=os.path.getsize(storage_path),
        rows=total_rows,
        columns_count=len(columns_meta),
        files_json=json.dumps([safe_name]),
        status='Active',
        uploaded_by=g.current_admin.name,
        quality_score=quality['score'],
        quality_issues=json.dumps(quality['issues']),
    )
    db.session.add(d)
    db.session.flush()
    for col in columns_meta:
        db.session.add(DatasetColumn(
            dataset_id=ds_id, name=col['name'], label=col.get('label', ''),
            dtype=col.get('type', 'string'), nulls=col.get('nulls', 0),
            unique_count=col.get('unique', 0), is_target=col.get('target', False),
        ))
    db.session.commit()
    audit('DATASET_UPLOAD', target=ds_id, actor=g.current_admin.user,
          details={'rows': total_rows, 'columns': len(columns_meta)})

    return jsonify(d.to_dict()), 201


@datasets_bp.delete('/<dataset_id>')
@admin_required
def delete_dataset(dataset_id):
    d = Dataset.query.get_or_404(dataset_id)
    db.session.delete(d)
    db.session.commit()
    audit('DATASET_DELETE', target=dataset_id, actor=g.current_admin.user)
    return jsonify({'ok': True})


# --- ML Models ---

@models_bp.get('')
@admin_required
def list_models():
    models = MLModel.query.order_by(MLModel.module).all()
    return jsonify({'items': [m.to_dict() for m in models]})


@models_bp.get('/<model_id>')
@admin_required
def get_model(model_id):
    m = MLModel.query.get_or_404(model_id)
    runs = [r.to_dict() for r in m.training_runs.order_by(ModelTrainingRun.started_at.desc()).limit(20)]
    return jsonify({**m.to_dict(), 'trainingRuns': runs})


@models_bp.post('/<model_id>/rollback/<int:run_id>')
@role_required('Super Admin', 'Data Scientist')
def rollback_model(model_id, run_id):
    m = MLModel.query.get_or_404(model_id)
    run = ModelTrainingRun.query.get_or_404(run_id)
    if run.model_id != model_id:
        return jsonify({'error': 'Run does not belong to model'}), 400
    if not run.artifact_path or not os.path.exists(run.artifact_path):
        return jsonify({'error': 'Artifact missing'}), 404

    # Swap active artifact
    import shutil
    target = m.artifact_path or os.path.join(current_app.config['ML_MODELS_DIR'], f'{model_id}.pkl')
    shutil.copy(run.artifact_path, target)
    m.accuracy, m.precision, m.recall, m.f1 = run.accuracy, run.precision, run.recall, run.f1
    m.artifact_path = target
    m.deployed_at = datetime.utcnow()
    m.status = 'Active'
    db.session.commit()
    audit('MODEL_ROLLBACK', target=model_id, actor=g.current_admin.user,
          details={'rolledBackTo': run_id})
    return jsonify(m.to_dict())


# --- Training ---

_training_jobs = {}


@training_bp.post('')
@role_required('Super Admin', 'Data Scientist')
def start_training():
    """Kick off a training job in a background thread.
    Returns immediately with job_id; client polls /api/training/jobs/<id> for status.
    """
    data = request.get_json() or {}
    module = data.get('module', 'ANC')
    dataset_id = data.get('datasetId')
    algorithm = data.get('algorithm', 'random_forest')
    hyperparameters = data.get('hyperparameters', {})

    dataset = Dataset.query.get(dataset_id) if dataset_id else None
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 400

    job_id = f'job_{int(time.time())}_{module}'
    _training_jobs[job_id] = {'status': 'Queued', 'progress': 0, 'logs': []}

    # Resolve model id
    model_id = {'ANC': 'anc_risk_model', 'NutriCheck': 'nutricheck_classifier',
                 'Sickle Cell': 'sickle_cv_model'}.get(module, 'custom_model')
    m = MLModel.query.get(model_id)
    if not m:
        m = MLModel(id=model_id, name=f'{module} Model', module=module, algorithm=algorithm)
        db.session.add(m)

    run = ModelTrainingRun(
        model_id=model_id, started_by=g.current_admin.id,
        started_at=datetime.utcnow(), status='Running',
    )
    db.session.add(run)
    db.session.commit()
    run_id = run.id

    audit('MODEL_TRAIN_START', target=model_id, actor=g.current_admin.user,
          details={'datasetId': dataset_id, 'algorithm': algorithm})

    # Background training
    app = current_app._get_current_object()
    Thread(target=_train_worker, args=(app, job_id, run_id, model_id, module,
                                         dataset, algorithm, hyperparameters), daemon=True).start()

    return jsonify({'jobId': job_id, 'runId': run_id, 'modelId': model_id}), 202


@training_bp.get('/jobs/<job_id>')
@admin_required
def training_status(job_id):
    job = _training_jobs.get(job_id)
    if not job:
        return jsonify({'error': 'Unknown job'}), 404
    return jsonify(job)


def _train_worker(app, job_id, run_id, model_id, module, dataset, algorithm, hyperparameters):
    """Background worker. Imports happen inside to avoid circular issues."""
    import pyreadstat, pandas as pd, numpy as np, joblib, json
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

    with app.app_context():
        job = _training_jobs[job_id]
        run = ModelTrainingRun.query.get(run_id)
        m = MLModel.query.get(model_id)
        t0 = time.time()
        try:
            job['status'] = 'Loading data'
            job['progress'] = 10
            job['logs'].append('Loading dataset from disk…')

            path = dataset.storage_path
            if path.endswith('.zip'):
                import tempfile
                with tempfile.TemporaryDirectory() as tmp:
                    files = extract_zip(path, tmp)
                    primary = find_primary_file(files)
                    df, _ = pyreadstat.read_sav(primary) if primary.endswith('.sav') else (pd.read_csv(primary), None)
            elif path.endswith('.sav'):
                df, _ = pyreadstat.read_sav(path)
            else:
                df = pd.read_csv(path)

            job['progress'] = 30
            job['logs'].append(f'Loaded {len(df)} rows, {len(df.columns)} columns')

            # Feature selection per module
            if module == 'ANC':
                candidate_features = ['WB4', 'CM11', 'MN6', 'MN17A', 'MN17B', 'WB6A', 'WB13']
                target_col = 'CM11'  # parity used as proxy
            elif module == 'NutriCheck':
                candidate_features = ['CAGE', 'HAZ', 'WAZ', 'WHZ', 'MUAC']
                target_col = 'WHZ'
            else:
                candidate_features = list(df.select_dtypes(include='number').columns[:10])
                target_col = candidate_features[-1] if candidate_features else None

            features = [c for c in candidate_features if c in df.columns]
            if not features or target_col not in df.columns:
                # Fallback: pick first numeric columns
                num_cols = list(df.select_dtypes(include='number').columns[:8])
                features = num_cols[:-1] if len(num_cols) > 1 else num_cols
                target_col = num_cols[-1] if num_cols else None

            if not features or not target_col:
                raise RuntimeError('Could not auto-select features and target from dataset.')

            job['logs'].append(f'Features: {features}, target: {target_col}')

            sub = df[features + [target_col]].dropna()
            X = sub[features]
            y_raw = sub[target_col]
            # Bin into 2 classes if continuous, otherwise use as-is
            if y_raw.dtype.kind in 'fc' and y_raw.nunique() > 6:
                threshold = y_raw.median()
                y = (y_raw > threshold).astype(int)
            else:
                y = y_raw.astype(int)

            job['progress'] = 50
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=hyperparameters.get('test_size', 0.2), random_state=42
            )

            if algorithm == 'gradient_boosting':
                clf = GradientBoostingClassifier(
                    n_estimators=hyperparameters.get('n_estimators', 100),
                    max_depth=hyperparameters.get('max_depth', 6), random_state=42,
                )
            elif algorithm == 'logistic_regression':
                clf = LogisticRegression(max_iter=1000)
            else:
                clf = RandomForestClassifier(
                    n_estimators=hyperparameters.get('n_estimators', 120),
                    max_depth=hyperparameters.get('max_depth', 12),
                    random_state=42, n_jobs=-1,
                )

            job['progress'] = 60
            job['logs'].append(f'Training {algorithm}…')
            clf.fit(X_train, y_train)

            job['progress'] = 85
            pred = clf.predict(X_test)
            acc = float(accuracy_score(y_test, pred))
            prec = float(precision_score(y_test, pred, average='weighted', zero_division=0))
            rec = float(recall_score(y_test, pred, average='weighted', zero_division=0))
            f1 = float(f1_score(y_test, pred, average='weighted', zero_division=0))

            # Persist artifact
            models_dir = app.config['ML_MODELS_DIR']
            os.makedirs(models_dir, exist_ok=True)
            artifact_path = os.path.join(models_dir, f'{model_id}.pkl')
            joblib.dump(clf, artifact_path)
            # also save a versioned snapshot for rollback
            version_path = os.path.join(models_dir, f'{model_id}.run{run_id}.pkl')
            joblib.dump(clf, version_path)
            # save metadata used by predictor
            with open(os.path.join(models_dir, f'{model_id}.meta.json'), 'w') as fmeta:
                json.dump({'features': features, 'version': f'1.0.{run_id}'}, fmeta)

            # Update DB
            run.status = 'Success'
            run.accuracy, run.precision, run.recall, run.f1 = acc, prec, rec, f1
            run.duration_seconds = int(time.time() - t0)
            run.completed_at = datetime.utcnow()
            run.artifact_path = version_path
            run.log = '\n'.join(job['logs'])

            m.accuracy, m.precision, m.recall, m.f1 = acc, prec, rec, f1
            m.algorithm = algorithm
            m.training_dataset_id = dataset.id
            m.artifact_path = artifact_path
            m.feature_columns = json.dumps(features)
            m.hyperparameters = json.dumps(hyperparameters)
            m.version = f'1.0.{run_id}'
            m.deployed_at = datetime.utcnow()
            m.status = 'Active'
            db.session.commit()

            job['status'] = 'Success'
            job['progress'] = 100
            job['logs'].append(f'Done. Accuracy={acc:.3f}')
            audit('MODEL_TRAIN_SUCCESS', target=model_id,
                  details={'runId': run_id, 'accuracy': acc})
        except Exception as e:
            run.status = 'Failed'
            run.log = '\n'.join(job['logs']) + f'\nERROR: {e}'
            db.session.commit()
            job['status'] = 'Failed'
            job['error'] = str(e)
            audit('MODEL_TRAIN_FAILED', target=model_id, details={'error': str(e)})
