# AnteScan Backend — Flask + SQLAlchemy + ML

Production-grade backend for the **AnteScan** CHW community health platform.
Built for the **Ghana AI Innovation Challenge 2026**.

## What's inside

| Layer | Technology |
|-------|-----------|
| Framework | Flask 3.0 + SQLAlchemy 2.0 |
| Auth | Flask-JWT-Extended (access + refresh tokens) |
| Database | SQLite (dev) — PostgreSQL ready (set `DATABASE_URL`) |
| ML | scikit-learn (RandomForest), joblib persistence |
| Data parsing | pyreadstat (SPSS .sav), custom DHS .DAT parser |
| SMS | Africa's Talking API + dry-run mode |
| Exports | reportlab (PDF), openpyxl (XLSX), CSV |
| Audit | Append-only audit log with critical-action flagging |

## Quick start

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env       # edit JWT secrets, AT keys
python seed.py             # registers datasets, seeds CHWs/admins/compounds
python train_models.py     # trains real ML models on MICS6 data
python run.py              # API live on http://localhost:5000
```

## Real Ghana datasets

`seed.py` registers and parses these into the database:

| Dataset | Source | Real rows × cols |
|---------|--------|------------------|
| **GHBR8CFL** — DHS Births Recode 2022 | DHS Program | 34,595 × 64 |
| **GHKR8CFL** — DHS Kids Recode 2022 | DHS Program | (DHS flat-file) |
| **MICS6_CH** — Children under 5 | UNICEF / GSS | 8,903 × 80 |
| **MICS6_WM** — Women | UNICEF / GSS | 14,609 × 80 |
| **WHO Growth Standards** | WHO | Built-in LMS |
| **GHS ANC Risk** | Ghana Health Service | Built-in |
| **Sickle Cell Labels** | Korle-Bu Hospital | Placeholder |

All zips remain downloadable via `GET /api/datasets/<id>/download`.

## Real ML models

`train_models.py` trains and persists:

- **`anc_risk_model.pkl`** — RandomForest on 6,705 MICS6 women records.
  Features: respondent age, parity, education, prior stillbirth.
- **`nutricheck_classifier.pkl`** — RandomForest on MICS6 children.
  Features: child age, anthropometry, ARI symptoms.

**Clinical safety**: the ANC predictor combines ML probabilities with rule-based
GHS guidelines and takes the *maximum* score, so red flags (BP ≥ 160/110,
convulsions, severe bleeding) are never missed even if the trained model
under-weights them.

## Demo credentials

| Role | Login | Password |
|------|-------|----------|
| Super Admin | `super@ghs.gov.gh` | `changeme123` |
| Regional Admin (Ashanti) | `region.ashanti@ghs.gov.gh` | `changeme123` |
| District Admin (Kumasi) | `district.kumasi@ghs.gov.gh` | `changeme123` |
| Data Scientist | `data@ghs.gov.gh` | `changeme123` |
| CHW (Akosua Mensah, Tafo CHPS) | `GHS-CHW-00100` | `changeme` |

OTP for forgot-password demo: `1234` in dry-run SMS mode.

## API surface (63 endpoints)

| Group | Routes |
|-------|--------|
| Auth | `/api/auth/chw/login`, `/chw/register`, `/admin/login`, `/refresh`, `/forgot/request`, `/forgot/verify`, `/me` |
| Patients | `GET/POST /api/patients`, `GET /api/patients/<id>`, `GET /api/patients/<id>/timeline` |
| Screenings | `POST /api/screenings` (ML + rules), `POST /api/screenings/voice/map`, `POST /api/screenings/bulk-sync` |
| Referrals | `GET/POST/PATCH /api/referrals` (auto-SMS to facility + family elder) |
| Alerts | `GET/PATCH /api/alerts` (acknowledge / resolve) |
| Lab Results | `POST/GET /api/lab-results/patients/<pid>` (multipart upload) |
| Datasets | `GET /api/datasets`, `/<id>/preview`, `/<id>/download`, `POST /upload` |
| Models | `GET /api/models`, `POST /api/models/<id>/rollback/<run_id>` |
| Training | `POST /api/training` (background), `GET /api/training/jobs/<id>` |
| CHWs | `GET /api/chws`, `GET /api/compounds`, `GET /api/leaderboard` |
| Dashboard | `/kpis`, `/trend`, `/risk-distribution`, `/referral-outcomes`, `/region-breakdown` |
| Reports | `/antenatal`, `/nutricheck`, `/growth-curve`, `/sickle`, `/model-performance`, `/activity-heatmap` |
| System | `/notifications`, `/broadcasts`, `/settings`, `/admin-users`, `/audit-log`, `/sms-logs`, `/exports/*` |

## Example calls

```bash
# Login
curl -X POST http://localhost:5000/api/auth/chw/login \
  -H 'Content-Type: application/json' \
  -d '{"chwId":"GHS-CHW-00100","password":"changeme"}'

# ANC screening with red flags
curl -X POST http://localhost:5000/api/screenings \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "module": "ANC",
    "patientId": 1,
    "vitals": {"bp_systolic": 165, "bp_diastolic": 115, "gestational_age": 30},
    "symptoms": ["headache", "blurred_vision", "bleeding"]
  }'
# → risk_level: emergency, score: 87/100, model_version: 1.0.<timestamp>

# Twi voice transcript
curl -X POST http://localhost:5000/api/screenings/voice/map \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"transcript":"me ti yi me na mogya retu, ahome den"}'
# → {"symptoms":["headache","bleeding","breathing"],"language":"Twi"}
```

## Architecture notes

- **Idempotent screenings**: every POST `/api/screenings` accepts a `clientUuid`;
  a second submit with the same UUID returns the original record. Built for
  offline-mode sync from a phone that batches submissions when reconnected.

- **Multilingual SMS**: templates exist for Twi, Ga, Ewe, Hausa and English.
  Referrals automatically text the receiving facility **and** the patient's
  Family Elder (Grandmother Network) for Urgent/Emergency cases.

- **Model rollback**: every `POST /api/training` saves a versioned `.pkl` so
  admins can `POST /api/models/<id>/rollback/<run_id>` to revert.

- **Audit log**: 14 actions flagged critical (USER_DELETE, MODEL_DEPLOY,
  BROADCAST_SEND_ALL, etc.) trigger highlighted log entries.

- **Real WHO Z-scores**: `app/services/ml/who_zscore.py` implements the WHO
  Multicentre Growth Reference Study LMS formula. Returns WHZ, HAZ, WAZ and
  combined SAM/MAM/Normal classification using MUAC thresholds (115/125 mm)
  + oedema check.

## Files

```
backend/
├── app/
│   ├── __init__.py           Flask factory, 15 blueprints
│   ├── config.py             Env-driven config
│   ├── extensions.py         db, jwt, cors, migrate singletons
│   ├── models/               14 SQLAlchemy models
│   ├── routes/               15 blueprints, 63 endpoints
│   ├── services/
│   │   ├── ml/
│   │   │   ├── anc_risk.py      ML + rule hybrid predictor
│   │   │   └── who_zscore.py    WHO LMS Z-scores
│   │   ├── dhs_parser.py        DHS / MICS6 / SPSS parser
│   │   ├── voice_mapper.py      Twi/Ga/Ewe/Hausa NLP
│   │   ├── sms.py               Africa's Talking + dry-run
│   │   ├── audit_logger.py      Critical action tracking
│   │   └── pdf_export.py        reportlab PDFs + Excel exports
│   └── utils/                Decorators, pagination
├── data/
│   ├── datasets/             Real DHS + MICS6 zips (preserved)
│   ├── ml_models/            Trained .pkl artifacts + versioned snapshots
│   ├── exports/              Generated CSV/XLSX/PDF
│   └── uploads/              CHW-uploaded lab documents
├── seed.py                   Loads real Ghana data
├── train_models.py           Trains real ML models on MICS6
├── run.py                    Entry point
├── requirements.txt
└── .env.example
```

---

Built with ❤ for the Ghana AI Innovation Challenge.
