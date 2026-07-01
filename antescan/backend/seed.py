"""Seed the database with real Ghana data + dataset registry.

Usage:
    python seed.py                 # full seed (idempotent)
    python seed.py --reset         # drop all and reseed
    python seed.py --datasets-only # only register datasets
    python seed.py --uploads PATH  # custom dataset source directory

This script:
  1. Creates required admin + CHW accounts.
  2. Registers the 7 reference datasets (DHS GHBR, GHKR, MICS6 ch/wm, WHO, GHS ANC, Sickle).
  3. If actual zip files exist in DATASETS_DIR (or --uploads source), copies them in,
     parses their schemas with pyreadstat, and writes column metadata.
  4. Spawns a small set of seed patients from real MICS6 records to demonstrate the system.
"""
import os, sys, json, shutil, argparse, time
from datetime import datetime, timedelta

# Allow running this script standalone
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models import (
    User, AdminUser, CHW, Compound, Patient, FamilyElder,
    Dataset, DatasetColumn, MLModel, Setting, Notification,
)
from app.services.dhs_parser import parse_dataset, detect_format, extract_zip, find_primary_file, quality_check


# --- The 7 reference datasets (mirroring the frontend mockData) ---

REFERENCE_DATASETS = [
    {
        'id': 'ds_ghbr', 'name': 'Ghana DHS 2022 — Births Recode', 'code': 'GHBR8CFL',
        'description': 'Demographic and Health Survey 2022 Ghana, Births Recode. Real maternal and birth records — pregnancy outcomes, ANC visits, vitals, complications, delivery.',
        'source': 'DHS Program / Ghana Statistical Service',
        'source_url': 'https://dhsprogram.com/data/dataset/Ghana_Standard-DHS_2022.cfm',
        'module': 'ANC', 'version': 'v1.0',
        'file_type': 'DAT + DCF (DHS flat file)',
        'archive_filename': 'GHBR8CFL.zip',
        'files': ['GHBR8CFL.DAT', 'GHBR8CFL.DCF', 'GHBR8CFL.SPS', 'GHBR8CFL.MAP'],
    },
    {
        'id': 'ds_ghkr', 'name': 'Ghana DHS 2022 — Kids Recode', 'code': 'GHKR8CFL',
        'description': 'Demographic and Health Survey 2022 Ghana, Kids Recode. Child health records — vaccinations, anthropometry, illness episodes, feeding.',
        'source': 'DHS Program / Ghana Statistical Service',
        'source_url': 'https://dhsprogram.com/data/dataset/Ghana_Standard-DHS_2022.cfm',
        'module': 'NutriCheck', 'version': 'v1.0',
        'file_type': 'DAT + DCF (DHS flat file)',
        'archive_filename': 'GHKR8CFL.zip',
        'files': ['GHKR8CFL.DAT', 'GHKR8CFL.DCF', 'GHKR8CFL.SPS'],
    },
    {
        'id': 'ds_mics_ch', 'name': 'UNICEF Ghana MICS6 — Children Under 5', 'code': 'MICS6_CH',
        'description': 'Multiple Indicator Cluster Survey Round 6 — children under 5 module. MUAC, weight, height, oedema, breastfeeding, ARI symptoms. Primary training dataset for NutriCheck.',
        'source': 'UNICEF / Ghana Statistical Service',
        'source_url': 'https://mics.unicef.org/surveys',
        'module': 'NutriCheck', 'version': 'v1.0',
        'file_type': 'SPSS .sav',
        'archive_filename': 'Ghana_MICS6_SPSS_Datasets.zip',
        'inner_path': 'Ghana MICS6 SPSS Datasets/ch.sav',
        'files': ['ch.sav'],
    },
    {
        'id': 'ds_mics_wm', 'name': 'UNICEF Ghana MICS6 — Women', 'code': 'MICS6_WM',
        'description': 'MICS6 women module — maternal health, ANC visits, pregnancy outcomes, education, household indicators. Supports ANC risk model.',
        'source': 'UNICEF / Ghana Statistical Service',
        'source_url': 'https://mics.unicef.org/surveys',
        'module': 'ANC', 'version': 'v1.0',
        'file_type': 'SPSS .sav',
        'archive_filename': 'Ghana_MICS6_SPSS_Datasets.zip',
        'inner_path': 'Ghana MICS6 SPSS Datasets/wm.sav',
        'files': ['wm.sav'],
    },
    {
        'id': 'ds_who_growth', 'name': 'WHO Child Growth Standards', 'code': 'WHO_GROWTH',
        'description': 'WHO reference percentile curves (weight-for-age, height-for-age, weight-for-height, BMI-for-age, MUAC-for-age, 0–60 months).',
        'source': 'World Health Organization',
        'source_url': 'https://www.who.int/tools/child-growth-standards',
        'module': 'NutriCheck', 'version': 'v2006',
        'file_type': 'Built-in (LMS tables)',
        'archive_filename': None,
        'files': [],
    },
    {
        'id': 'ds_ghs_anc', 'name': 'Ghana Health Service — ANC Risk Features', 'code': 'GHS_ANC',
        'description': 'Clinical thresholds and risk-feature mapping derived from GHS Antenatal Care Guidelines. Used as rule-based fallback.',
        'source': 'Ghana Health Service',
        'source_url': 'https://www.ghanahealthservice.org/',
        'module': 'ANC', 'version': 'v2020',
        'file_type': 'Built-in rule table',
        'archive_filename': None,
        'files': [],
    },
    {
        'id': 'ds_sickle', 'name': 'Ghana Sickle Cell Blood Smears (labels)', 'code': 'GHS_SICKLE',
        'description': 'Annotated blood smear morphology labels. Used to fine-tune the on-device TFLite CV model.',
        'source': 'Korle-Bu Teaching Hospital / Sickle Cell Foundation Ghana',
        'source_url': '',
        'module': 'Sickle Cell', 'version': 'v0.3',
        'file_type': 'CSV + image folder',
        'archive_filename': None,
        'files': [],
    },
]


def seed_admin_users():
    print('› Seeding admin users…')
    admins = [
        ('super@ghs.gov.gh', 'changeme123', 'Kwame Owusu', 'Super Admin', 'National', 'National'),
        ('region.ashanti@ghs.gov.gh', 'changeme123', 'Akua Boateng', 'Regional Admin', 'Ashanti', 'Ashanti'),
        ('district.kumasi@ghs.gov.gh', 'changeme123', 'Yaw Mensah', 'District Admin', 'Ashanti', 'Kumasi Metro'),
        ('data@ghs.gov.gh', 'changeme123', 'Adwoa Asante', 'Data Scientist', 'National', 'National'),
    ]
    for email, pw, name, role, region, district in admins:
        if User.query.filter_by(email=email).first():
            continue
        u = User(kind='admin', email=email)
        u.set_password(pw)
        db.session.add(u); db.session.flush()
        db.session.add(AdminUser(user_id=u.id, name=name, role=role,
                                   region=region, district=district))
    db.session.commit()


def seed_compounds_and_chws():
    print('› Seeding CHPS compounds…')
    compounds_data = [
        ('Tafo CHPS Compound', 'Ashanti', 'Kumasi Metro', 6.7167, -1.6042),
        ('Cape Coast CHPS', 'Central', 'Cape Coast Metro', 5.1053, -1.2466),
    ]
    for name, region, district, lat, lng in compounds_data:
        if Compound.query.filter_by(name=name).first():
            continue
        c = Compound(name=name, region=region, district=district,
                      latitude=lat, longitude=lng,
                      catchment_population=2500 + (hash(name) % 3000))
        db.session.add(c)
    db.session.commit()

    print('› Seeding 2 CHWs (demo)…')
    # Exactly two CHWs — one Ashanti (Twi), one Central (English)
    chw_data = [
        ('GHS-CHW-00100', 'Akosua Mensah', '0245678900', 'Tafo CHPS Compound', 'Twi', 'changeme'),
        ('GHS-CHW-00200', 'Kojo Annan',    '0245678901', 'Cape Coast CHPS',     'English', 'changeme'),
    ]
    for chw_id, name, phone, compound_name, language, pw in chw_data:
        if CHW.query.filter_by(chw_id=chw_id).first():
            continue
        compound = Compound.query.filter_by(name=compound_name).first()
        u = User(kind='chw', phone=phone)
        u.set_password(pw)
        db.session.add(u); db.session.flush()
        c = CHW(user_id=u.id, chw_id=chw_id, name=name,
                 region=compound.region if compound else 'Ashanti',
                 district=compound.district if compound else 'Kumasi Metro',
                 compound_id=compound.id if compound else None,
                 badge='Silver', status='Active', language=language,
                 last_active=datetime.utcnow() - timedelta(hours=hash(chw_id) % 48))
        db.session.add(c)
    db.session.commit()


def seed_datasets(datasets_source_dir: str, datasets_target_dir: str):
    """Register all 7 datasets.

    For each archive (zip), look in:
      1. target dir (data/datasets/) — where it's bundled in the zip
      2. source dir (typically ~/Downloads) — fallback if user has their own copy
    Parse the file in place, no copy needed.
    """
    print('› Registering reference datasets…')
    os.makedirs(datasets_target_dir, exist_ok=True)

    for entry in REFERENCE_DATASETS:
        existing = Dataset.query.get(entry['id'])
        # Allow re-parse if a previous run left storage_path empty
        if existing and existing.storage_path and os.path.exists(existing.storage_path):
            continue
        if existing:
            db.session.delete(existing); db.session.commit()

        size = 0
        rows = 0
        cols_count = 0
        columns_meta = []
        storage_path = None

        archive = entry.get('archive_filename')
        if archive:
            tgt = os.path.join(datasets_target_dir, archive)
            src = os.path.join(datasets_source_dir, archive)

            # 1. Prefer the bundled copy in target dir
            if os.path.exists(tgt):
                storage_path = tgt
            # 2. Fall back to user's Downloads / passed-in source dir
            elif os.path.exists(src):
                shutil.copy(src, tgt)
                storage_path = tgt

            if storage_path:
                size = os.path.getsize(storage_path)
                try:
                    parse_path = storage_path
                    if storage_path.lower().endswith('.zip'):
                        import tempfile
                        tmp = tempfile.mkdtemp()
                        files = extract_zip(storage_path, tmp)
                        if entry.get('inner_path'):
                            inner = entry['inner_path']
                            cand = [f for f in files if f.endswith(inner) or inner in f]
                            parse_path = cand[0] if cand else find_primary_file(files)
                        else:
                            parse_path = find_primary_file(files)
                    if parse_path and os.path.exists(parse_path):
                        preview_df, columns_meta, total_rows = parse_dataset(parse_path)
                        rows = total_rows
                        cols_count = len(columns_meta)
                        print(f'  · {entry["code"]}: {rows:,} rows × {cols_count} columns')
                except Exception as e:
                    print(f'  ! {entry["code"]} parse failed: {e}')
            else:
                print(f'  - {entry["code"]}: zip not found in {datasets_target_dir} or {datasets_source_dir}')

        d = Dataset(
            id=entry['id'], name=entry['name'], code=entry['code'],
            description=entry['description'], source=entry['source'],
            source_url=entry.get('source_url'), module=entry['module'],
            version=entry['version'], file_type=entry['file_type'],
            archive_filename=archive, storage_path=storage_path,
            size_bytes=size, rows=rows, columns_count=cols_count,
            files_json=json.dumps(entry.get('files', [])),
            # Reference-only (no archive) → status 'Reference'.
            # Real archive bundled → 'Active'. Missing archive → 'Awaiting Upload'.
            status='Reference' if not archive else ('Active' if storage_path else 'Awaiting Upload'),
            uploaded_by='System (pre-seeded)',
        )
        db.session.add(d); db.session.flush()
        for col in columns_meta:
            db.session.add(DatasetColumn(
                dataset_id=d.id, name=col['name'], label=col.get('label', ''),
                dtype=col.get('type', 'string'), nulls=col.get('nulls', 0),
                unique_count=col.get('unique', 0),
            ))
    db.session.commit()


def seed_initial_ml_models():
    print('› Registering initial ML model placeholders…')
    models = [
        ('anc_risk_model', 'ANC Risk Classifier', 'ANC', 'Random Forest'),
        ('nutricheck_classifier', 'NutriCheck Classifier', 'NutriCheck', 'Decision Tree + WHO thresholds'),
        ('sickle_cv_model', 'Sickle CV Model', 'Sickle Cell', 'CNN MobileNetV2 (TFLite)'),
        ('voice_keyword_mapper', 'Voice Keyword Mapper', 'Voice', 'Rule-based NLP'),
    ]
    for mid, name, module, algo in models:
        if MLModel.query.get(mid):
            continue
        db.session.add(MLModel(id=mid, name=name, module=module, algorithm=algo,
                                version='1.0.0', status='Testing'))
    db.session.commit()


def seed_settings():
    print('› Seeding system settings…')
    defaults = {
        'sms': {
            'provider': "Africa's Talking",
            'sender_id': 'AnteScan',
            'fallback': 'Twilio',
        },
        'thresholds': {
            'bp_systolic_severe': 160, 'bp_systolic_elevated': 140,
            'bp_diastolic_severe': 110, 'bp_diastolic_elevated': 90,
            'muac_sam': 115, 'muac_mam': 125,
            'risk_emergency': 80, 'risk_high': 60, 'risk_moderate': 35,
        },
        'security': {
            'twofa_enabled': False,
            'session_timeout_minutes': 30,
            'force_password_rotation_days': 90,
        },
    }
    for section, kvs in defaults.items():
        for key, value in kvs.items():
            if Setting.query.filter_by(section=section, key=key).first():
                continue
            vt = 'bool' if isinstance(value, bool) else 'int' if isinstance(value, int) else 'float' if isinstance(value, float) else 'string'
            db.session.add(Setting(section=section, key=key, value=str(value), value_type=vt))
    db.session.commit()


def seed_demo_patients_from_mics():
    """Pull 30 real records from MICS6 wm.sav and create demo patients/CHWs."""
    print('› Creating demo patients from real MICS6 records…')

    def _safe_int(v, default):
        try:
            import math
            if v is None: return default
            if isinstance(v, float) and math.isnan(v): return default
            return int(v)
        except Exception:
            return default

    try:
        import pyreadstat
        # Locate the wm.sav inside the datasets dir
        wm_path = None
        for root, _, files in os.walk(os.path.join(os.path.dirname(__file__), 'data', 'datasets')):
            for f in files:
                if f == 'wm.sav':
                    wm_path = os.path.join(root, f)
                    break
        if not wm_path:
            # Try extracting from MICS6 zip if present
            mics_zip = os.path.join(os.path.dirname(__file__), 'data', 'datasets',
                                     'Ghana_MICS6_SPSS_Datasets.zip')
            if os.path.exists(mics_zip):
                import tempfile
                tmp = tempfile.mkdtemp()
                files = extract_zip(mics_zip, tmp)
                cand = [f for f in files if f.endswith('wm.sav')]
                wm_path = cand[0] if cand else None

        if not wm_path or not os.path.exists(wm_path):
            print('  (MICS6 wm.sav not found — skipping demo patient hydration)')
            return

        df, _ = pyreadstat.read_sav(wm_path)
        sample = df.sample(n=min(10, len(df)), random_state=42)
        chws = CHW.query.all()
        if not chws:
            return

        names_first = ['Akua','Adwoa','Ama','Yaa','Esi','Akosua','Abena','Afia','Mansa','Serwaa']
        names_last = ['Boateng','Asantewaa','Mensah','Owusu','Frema','Nyarko','Sarpong','Acheampong','Donkor','Pokuaa']
        villages = ['Tafo','Suame','Bantama','Asokwa','Asawasi','Ayigya','Nhyiaeso']

        for idx, (_, row) in enumerate(sample.iterrows()):
            age = float(row.get('WB4') or 25)
            chw = chws[idx % len(chws)]
            p = Patient(
                chw_id=chw.id,
                full_name=f'{names_first[idx % len(names_first)]} {names_last[idx % len(names_last)]}',
                age=max(15, min(50, age)),
                sex='F', phone=f'024{1000000 + idx:07d}'[:11],
                village=villages[idx % len(villages)],
                primary_module='ANC',
                gestational_age=_safe_int(row.get('CM12'), 22),
                last_visit=datetime.utcnow() - timedelta(days=idx % 14),
            )
            db.session.add(p)
        db.session.commit()
        print(f'  · Created {min(10, len(sample))} demo patients from MICS6 records.')
    except Exception as e:
        print(f'  ! Demo patient seed skipped: {e}')


def seed_initial_notifications():
    if Notification.query.count() > 0:
        return
    print('› Seeding sample notifications…')
    db.session.add(Notification(
        kind='system', title='Welcome to AnteScan',
        body='Your platform is configured and ready. Pre-seeded datasets are visible in Dataset Manager.',
        severity='info', target_audience='admin',
    ))
    db.session.commit()


def reset_db(app):
    print('!! Resetting database (dropping all tables)…')
    with app.app_context():
        db.drop_all()
        db.create_all()
        print('Tables recreated.')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--reset', action='store_true', help='Drop all tables first')
    parser.add_argument('--datasets-only', action='store_true', help='Only register datasets')
    parser.add_argument('--uploads', default=None, help='Source dir for dataset zips (default: try /mnt/user-data/uploads then ./data/datasets)')
    args = parser.parse_args()

    app = create_app()
    if args.reset:
        reset_db(app)
    with app.app_context():
        db.create_all()

        target_dir = app.config['DATASETS_DIR']
        source_dir = args.uploads
        if not source_dir:
            # 1. target_dir first — that's where the bundled zips live
            # 2. fallback to user's Downloads
            for cand in [target_dir,
                         '/mnt/user-data/uploads',
                         os.path.expanduser('~/Downloads')]:
                if os.path.isdir(cand) and any(
                    f.lower().endswith('.zip') for f in os.listdir(cand)
                ):
                    source_dir = cand
                    break
            source_dir = source_dir or target_dir

        print(f'Source dataset dir: {source_dir}')
        print(f'Target dataset dir: {target_dir}')

        seed_datasets(source_dir, target_dir)
        if not args.datasets_only:
            seed_admin_users()
            seed_compounds_and_chws()
            seed_initial_ml_models()
            seed_settings()
            # NO demo patients — system starts clean.
            # CHWs register their own patients live via /screen → /patients.
            print('› No demo patients seeded (live entry only).')
        print('\nSeed complete.')
        print('')
        print('  ┌──────────────────────────────────────────────┐')
        print('  │  DEMO CREDENTIALS                            │')
        print('  ├──────────────────────────────────────────────┤')
        print('  │  CHW #1   GHS-CHW-00100 / changeme  (Twi)    │')
        print('  │  CHW #2   GHS-CHW-00200 / changeme  (English)│')
        print('  │                                              │')
        print('  │  Admin    super@ghs.gov.gh / changeme123     │')
        print('  └──────────────────────────────────────────────┘')


if __name__ == '__main__':
    main()
