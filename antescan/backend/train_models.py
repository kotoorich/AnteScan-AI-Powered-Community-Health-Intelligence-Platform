"""Train baseline ML models on the seeded real Ghana datasets.

Run after seed.py:
    python train_models.py

Trains:
  - anc_risk_model   on  MICS6 wm.sav  (women / ANC features)
  - nutricheck_classifier  on  MICS6 ch.sav  (children / anthropometry)

Persists .pkl artifacts in data/ml_models/ and updates MLModel registry.
"""
import os, sys, json, time, joblib
from datetime import datetime
import pyreadstat
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app import create_app
from app.extensions import db
from app.models import MLModel, ModelTrainingRun, Dataset
from app.services.dhs_parser import extract_zip, find_primary_file


def _find_sav(dataset_id: str) -> str | None:
    """Locate a .sav file for the given seeded dataset.

    Tries in order:
      1. Dataset.storage_path from DB
      2. data/datasets/Ghana_MICS6_SPSS_Datasets.zip (extract on the fly)
      3. data/datasets/**/*.sav (already extracted)
    """
    inner_target = {'ds_mics_wm': 'wm.sav', 'ds_mics_ch': 'ch.sav'}.get(dataset_id)

    # 1. Try DB-recorded storage path
    storage_path = None
    try:
        app = create_app()
        with app.app_context():
            ds = Dataset.query.get(dataset_id)
            if ds and ds.storage_path and os.path.exists(ds.storage_path):
                storage_path = ds.storage_path
    except Exception:
        pass

    # 2. Fall back to direct file system search
    if not storage_path:
        base_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'datasets')
        # Walk for a loose .sav file first
        if inner_target:
            for root, _, files in os.walk(base_dir):
                if inner_target in files:
                    return os.path.join(root, inner_target)
        # Try the MICS6 zip in the datasets dir
        for f in os.listdir(base_dir) if os.path.isdir(base_dir) else []:
            if f.lower().endswith('.zip') and 'mics6' in f.lower():
                storage_path = os.path.join(base_dir, f)
                break

    if not storage_path:
        return None

    if storage_path.endswith('.sav'):
        return storage_path

    if storage_path.endswith('.zip'):
        import tempfile
        tmp = tempfile.mkdtemp(prefix='extract_')
        files = extract_zip(storage_path, tmp)
        if inner_target:
            for f in files:
                if f.endswith(inner_target):
                    return f
        return find_primary_file(files)
    return None


def train_anc_model(models_dir: str):
    print('\n=== Training ANC Risk Model on MICS6 women ===')
    sav = _find_sav('ds_mics_wm')
    if not sav:
        print('  MICS6 wm.sav not found, skipping.')
        return None

    df, meta = pyreadstat.read_sav(sav)
    print(f'  Loaded {len(df):,} rows × {len(df.columns)} columns')

    # Pick clinically meaningful columns that exist
    target_candidates = ['CM11']  # parity (proxy for high-risk grand multipara)
    feature_candidates = [
        'WB4',     # respondent age
        'CM11',    # total children ever born
        'MN6',     # number of ANC visits
        'MN17A',   # blood pressure measured
        'MN17B',   # urine sample taken
        'WB6A',    # education
        'WB13',    # ever attended school
        'CM17',    # had stillbirth or miscarriage
    ]
    features = [c for c in feature_candidates if c in df.columns]
    target = next((c for c in target_candidates if c in df.columns), None)
    # Remove target from features to avoid leakage / duplicates
    features = [f for f in features if f != target]
    print(f'  Using features: {features}')
    print(f'  Target column: {target}')

    if not target or len(features) < 2:
        print('  Not enough features/target available, skipping.')
        return None

    sub = df[features + [target]].dropna()
    print(f'  After dropping NaNs: {len(sub):,} rows')

    # Derive a 4-class risk target: low (parity 0-1), moderate (2-3), high (4-5), emergency (6+)
    parity = sub[target].astype(int).to_numpy()
    y_arr = np.zeros(len(parity), dtype=int)
    y_arr[(parity >= 2) & (parity <= 3)] = 1
    y_arr[(parity >= 4) & (parity <= 5)] = 2
    y_arr[parity >= 6] = 3
    y = pd.Series(y_arr, index=sub.index)
    X = sub[features].astype(float)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    t0 = time.time()
    clf = RandomForestClassifier(n_estimators=150, max_depth=12, random_state=42, n_jobs=-1)
    clf.fit(X_train, y_train)
    duration = int(time.time() - t0)
    pred = clf.predict(X_test)

    metrics = {
        'accuracy': float(accuracy_score(y_test, pred)),
        'precision': float(precision_score(y_test, pred, average='weighted', zero_division=0)),
        'recall': float(recall_score(y_test, pred, average='weighted', zero_division=0)),
        'f1': float(f1_score(y_test, pred, average='weighted', zero_division=0)),
    }
    print(f'  Trained in {duration}s')
    print(f'  Accuracy: {metrics["accuracy"]:.3f}  Precision: {metrics["precision"]:.3f}  Recall: {metrics["recall"]:.3f}  F1: {metrics["f1"]:.3f}')

    # Map MICS6 features to the names the predictor expects
    feature_alias = {
        'WB4': 'age',
        'CM11': 'parity',
        'MN6': 'anc_visits',
        'WB6A': 'education',
    }
    # Save with original column names but expose aliases in meta
    os.makedirs(models_dir, exist_ok=True)
    pkl = os.path.join(models_dir, 'anc_risk_model.pkl')
    meta_file = os.path.join(models_dir, 'anc_risk_model.meta.json')
    joblib.dump(clf, pkl)
    with open(meta_file, 'w') as f:
        json.dump({
            'features': features,
            'feature_aliases': feature_alias,
            'classes': ['low', 'moderate', 'high', 'emergency'],
            'training_dataset': 'ds_mics_wm',
            'training_rows': len(sub),
            'version': f'1.0.{int(time.time())}',
            'algorithm': 'RandomForestClassifier',
            'hyperparameters': {'n_estimators': 150, 'max_depth': 12},
        }, f, indent=2)
    print(f'  Saved: {pkl}')

    # Update DB
    app = create_app()
    with app.app_context():
        m = MLModel.query.get('anc_risk_model')
        if m:
            m.accuracy = metrics['accuracy']; m.precision = metrics['precision']
            m.recall = metrics['recall']; m.f1 = metrics['f1']
            m.status = 'Active'
            m.algorithm = 'Random Forest'
            m.training_dataset_id = 'ds_mics_wm'
            m.artifact_path = pkl
            m.feature_columns = json.dumps(features)
            m.hyperparameters = json.dumps({'n_estimators': 150, 'max_depth': 12})
            m.version = f'1.0.{int(time.time())}'
            m.deployed_at = datetime.utcnow()
            db.session.add(ModelTrainingRun(
                model_id='anc_risk_model', started_at=datetime.utcnow(),
                completed_at=datetime.utcnow(), status='Success',
                accuracy=metrics['accuracy'], precision=metrics['precision'],
                recall=metrics['recall'], f1=metrics['f1'],
                artifact_path=pkl, duration_seconds=duration,
                log='Initial training on MICS6 wm.sav',
            ))
            db.session.commit()
    return metrics


def train_nutricheck_model(models_dir: str):
    print('\n=== Training NutriCheck Classifier on MICS6 children ===')
    sav = _find_sav('ds_mics_ch')
    if not sav:
        print('  MICS6 ch.sav not found, skipping.')
        return None

    df, meta = pyreadstat.read_sav(sav)
    print(f'  Loaded {len(df):,} rows × {len(df.columns)} columns')

    # Look for the standard anthropometry columns
    target_col = 'WAZNS' if 'WAZNS' in df.columns else 'WAZ2' if 'WAZ2' in df.columns else None
    features_pref = ['CAGE', 'HAZNS', 'WHZNS', 'CDOI', 'AN3']
    features = [c for c in features_pref if c in df.columns]

    if not target_col or len(features) < 2:
        # Fallback to first 5 numeric columns + last numeric as target
        num_cols = list(df.select_dtypes(include='number').columns)
        features = num_cols[:5]
        target_col = num_cols[5] if len(num_cols) > 5 else None

    print(f'  Features: {features}, target: {target_col}')
    if not target_col:
        print('  No usable target column, skipping.')
        return None

    sub = df[features + [target_col]].dropna()
    if len(sub) < 100:
        print(f'  Only {len(sub)} rows after dropna — skipping.')
        return None

    # Classify into Normal / MAM / SAM based on WHO Z-score thresholds
    y_raw = sub[target_col].astype(float)
    if y_raw.dtype.kind in 'fc' and abs(y_raw).max() > 10:
        # Likely an integer-coded column rather than z-score; bin into quartiles
        y = pd.qcut(y_raw, q=3, labels=[0, 1, 2], duplicates='drop')
    else:
        y_arr = np.zeros(len(y_raw), dtype=int)
        y_arr[(y_raw < -2) & (y_raw >= -3)] = 1   # MAM
        y_arr[y_raw < -3] = 2                       # SAM
        y = pd.Series(y_arr, index=sub.index)
    X = sub[features].astype(float)

    if y.nunique() < 2:
        print('  Target has fewer than 2 classes — skipping.')
        return None

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    t0 = time.time()
    clf = RandomForestClassifier(n_estimators=150, max_depth=10, random_state=42, n_jobs=-1)
    clf.fit(X_train, y_train)
    duration = int(time.time() - t0)
    pred = clf.predict(X_test)
    metrics = {
        'accuracy': float(accuracy_score(y_test, pred)),
        'precision': float(precision_score(y_test, pred, average='weighted', zero_division=0)),
        'recall': float(recall_score(y_test, pred, average='weighted', zero_division=0)),
        'f1': float(f1_score(y_test, pred, average='weighted', zero_division=0)),
    }
    print(f'  Trained in {duration}s. Accuracy: {metrics["accuracy"]:.3f}, F1: {metrics["f1"]:.3f}')

    os.makedirs(models_dir, exist_ok=True)
    pkl = os.path.join(models_dir, 'nutricheck_classifier.pkl')
    meta_file = os.path.join(models_dir, 'nutricheck_classifier.meta.json')
    joblib.dump(clf, pkl)
    with open(meta_file, 'w') as f:
        json.dump({
            'features': features,
            'classes': ['Normal', 'MAM', 'SAM'],
            'training_dataset': 'ds_mics_ch',
            'training_rows': len(sub),
            'version': f'1.0.{int(time.time())}',
            'algorithm': 'RandomForestClassifier',
        }, f, indent=2)

    app = create_app()
    with app.app_context():
        m = MLModel.query.get('nutricheck_classifier')
        if m:
            m.accuracy = metrics['accuracy']; m.precision = metrics['precision']
            m.recall = metrics['recall']; m.f1 = metrics['f1']
            m.status = 'Active'
            m.training_dataset_id = 'ds_mics_ch'
            m.artifact_path = pkl
            m.feature_columns = json.dumps(features)
            m.version = f'1.0.{int(time.time())}'
            m.deployed_at = datetime.utcnow()
            db.session.add(ModelTrainingRun(
                model_id='nutricheck_classifier', started_at=datetime.utcnow(),
                completed_at=datetime.utcnow(), status='Success',
                accuracy=metrics['accuracy'], precision=metrics['precision'],
                recall=metrics['recall'], f1=metrics['f1'],
                artifact_path=pkl, duration_seconds=duration,
                log='Initial training on MICS6 ch.sav',
            ))
            db.session.commit()
    return metrics


if __name__ == '__main__':
    base = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(base, 'data', 'ml_models')
    train_anc_model(models_dir)
    train_nutricheck_model(models_dir)
    print('\nAll training complete.')
