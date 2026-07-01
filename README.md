# AnteScan — Testing Guide

**Ghana AI Innovation Challenge 2026 submission.**
Community Health Worker (CHW) PWA + Admin dashboard, powered by real DHS / MICS6 datasets and locally-trained scikit-learn models.

---

## 1. Setup (Windows / PowerShell)

You only need to do this once.

### Backend (Flask + SQLite)

```powershell
cd backend
pip install -r requirements.txt
del antescan.db           # only if you've run it before
python seed.py            # creates antescan.db, 2 CHWs, 4 admins, datasets, settings
python train_models.py    # trains ANC + NutriCheck models from real data
```

Start the backend:

```powershell
python run.py
```

It listens on **http://localhost:5000**. Leave this window running.

### Frontend (React + Vite)

In a **new terminal**:

```powershell
npm install
npm run dev
```

Vite serves on **http://localhost:5173** and proxies `/api/*` to the backend.

> If you ever see `422 Unprocessable Entity` in the console, that's a stale token
> from a previous DB seed — the app now auto-clears it and bounces you to login.

---

## 2. Demo credentials

| Role | Login ID | Password |
|------|----------|----------|
| CHW #1 (Twi, Ashanti) | `GHS-CHW-00100` | `changeme` |
| CHW #2 (English, Central) | `GHS-CHW-00200` | `changeme` |
| Super Admin | `super@ghs.gov.gh` | `changeme123` |
| Regional Admin (Ashanti) | `region.ashanti@ghs.gov.gh` | `changeme123` |
| District Admin (Kumasi) | `district.kumasi@ghs.gov.gh` | `changeme123` |
| Data Scientist | `data@ghs.gov.gh` | `changeme123` |

The login screen shows these in the gold box for you.

---

## 3. CHW flow — full walkthrough

Open http://localhost:5173 in your browser.

### 3.1 First visit & onboarding
1. **Splash** screen with Ghana flag colors and the kente-cloth mother illustration.
2. **Onboarding** — 5 slides about ANC, NutriCheck, Sickle Cell, SMS alerts, grandmother network. Tap "Get Started" → goes to login.

### 3.2 Login
1. Use **GHS-CHW-00100** / **changeme**.
2. You land on the **Home** screen.

### 3.3 Home screen
You should see:
- **Top header** with your avatar (initials by default), name ("Hello, Akosua!"), compound, theme toggle, notification bell.
- **Sliding banner carousel** — 4 slides rotating every 5 seconds (ANC / NutriCheck / Sickle Cell / Grandmother Network) with inline SVG illustrations. Tap dots to jump.
- **4 KPI cards** — Today's Screenings, This Week, Total Patients, Open Alerts. All start at **0** because there are zero patients on a fresh seed.
- **4 quick action buttons** — New Screening, Patients, Referrals, Reports.
- **Recent Patients** — empty state ("No patients yet").

### 3.4 New Screening (Antenatal)
1. Tap **New Screening** → choose **Antenatal Care**.
2. Pick or create a patient (form has age, parity, weeks pregnant, BP).
3. Check symptoms (Headache, Swelling, Bleeding, etc.).
4. Tap **Calculate Risk**. The result shows:
   - Risk level: **Normal / Low / Medium / High / Emergency**
   - Probability and key drivers
   - If **High/Emergency**: an **Alert** is automatically created and an SMS is dispatched (dry-run mode by default).
5. Tap **Save** → patient and screening are stored.

### 3.5 NutriCheck (child growth)
1. Tap **New Screening** → **NutriCheck**.
2. Enter child age (months), weight (kg), height (cm), MUAC (mm).
3. Z-scores (WAZ/HAZ/WHZ) are computed against WHO 2006 growth charts and a classification is shown:
   - **MUAC ≥ 12.5 cm** → Normal
   - **11.5 – 12.5 cm** → MAM (moderate acute malnutrition)
   - **< 11.5 cm** → SAM (severe acute malnutrition, emergency referral)

### 3.6 Sickle Cell
1. Tap **New Screening** → **Sickle Cell**.
2. Upload a lab strip image (any image — file is just stored).
3. Enter the visible result (Normal / Trait / Disease) and tap Save.

### 3.7 Referrals
- Open the **Referrals** screen via the bottom nav.
- All referrals you created appear here with status filters (Pending / Acknowledged / Completed).
- Tap a referral to see the SMS that was sent and the facility info.

### 3.8 Notifications
- Tap the **bell** in the top-right.
- On a fresh seed: **"All quiet"** empty state — no fake notifications.
- Once you create a High/Emergency screening, an alert appears here.
- For each notification you can:
  - Tap to mark as read (gold dot disappears)
  - Tap the **x** to delete it
  - Tap **Clear all** to wipe everything
  - Tap **Mark all read**
- The bell badge in the header shows the **real unread count**, polled every 30 seconds.

### 3.9 More menu
The bottom-right **More** button opens the menu with:
- **My Profile** — real profile editor (see 3.10)
- **Preferences** — theme / language / notification toggles (real backend)
- **Offline Sync** — real network status, pending queue, manual sync
- **About** — app info, dataset stats, contact
- **Log out**

### 3.10 My Profile (CHW)
1. Tap **My Profile** in the More menu.
2. **Avatar** — tap the camera icon, pick an image (max 2 MB). It uploads and immediately shows in:
   - The profile screen
   - The top header (replacing your initials)
3. **Name** — change it and tap Save. The new name shows up in:
   - "Hello, [first name]!" in the top header
   - Recent activity, audit log
4. **Phone** — must be a valid Ghana number (e.g. `+233241234567` or `0241234567`).
5. **Language** — English / Twi / Ga / Ewe / Hausa.
6. **Change password** — toggle the lock icon, enter current + new password.
7. **Danger zone → Delete my account**:
   - Reveals a password field. Type your password and click "Permanently delete".
   - Two confirmations (inline + browser confirm).
   - On success: you're logged out, redirected to login. Trying to log back in returns 401.
   - **Super admins** cannot delete themselves if they're the last super admin.

---

## 4. Admin flow — full walkthrough

Go to **http://localhost:5173/admin** (or `/admin/login`).

### 4.1 Login
Use **super@ghs.gov.gh** / **changeme123**.

### 4.2 Sidebar
On the left you have grouped navigation:
- **Operations** — Dashboard, National Map, CHWs, Compounds, Alerts, Referrals
- **Health Operations** — Antenatal Reports, NutriCheck Reports, Sickle Cell Reports
- **Engagement** — Broadcast, Leaderboard
- **Data & AI** — Dataset Manager, Model Manager, Training Lab, Performance
- **System** — Notifications, Exports, Settings, Admin Users, Audit Log

At the bottom you see your **avatar + name** — clicking it opens **/admin/profile** which is the same profile editor as CHWs use (with email instead of phone).

### 4.3 Dashboard
- 4 KPI cards (Screenings Today, This Week, Active CHWs, Alerts) — all real numbers.
- Trend chart (last 30 days of screenings).
- Risk distribution donut.
- Referral outcomes funnel.
- Region breakdown bar chart.
- All return real data from `/api/dashboard/*` — on a fresh seed everything is 0 / empty.

### 4.4 CHWs
- Lists all CHWs with status, region, compound, total screenings.
- Filter by region, search by name.

### 4.5 Compounds
- Lists CHPS compounds across Ghana.
- Add a new one (admin only).

### 4.6 Alerts
- All open clinical alerts (High / Emergency screenings).
- Mark as acknowledged or resolved.

### 4.7 Reports (Antenatal / NutriCheck / Sickle)
- **All charts and KPIs are now real**, fetched from `/api/reports/*`.
- On a fresh seed they show empty states with friendly messages.
- Once CHWs screen patients, the charts populate live.

### 4.8 Notifications (Admin)
- Click the **bell** in the top-right of any admin page → opens the Notifications page.
- The bell shows a red pill badge with the **real** unread count.
- Filters: **All / Alerts / System / Messages / Unread**.
- Each notification has:
  - **Tap** to mark as read
  - **x** to delete (per-user; admins don't affect each other)
- Top-right buttons:
  - **Mark all read**
  - **Clear all** (with confirmation)
- On a fresh seed: completely empty. **No fake notifications anywhere.**

### 4.9 Broadcast
- Compose a message, pick audience.
- Sends real SMS through Africa's Talking (or dry-run by default).

### 4.10 Dataset Manager
- Lists the 4 real datasets bundled in the repo:
  - **GHBR8CFL.zip** (DHS births recode) — 34,595 rows × 64 cols
  - **GHKR8CFL.zip** (DHS children) — DCT parser limit
  - **Ghana_MICS6_SPSS_Datasets.zip** — MICS6_CH 8,903 × 80, MICS6_WM 14,609 × 80
- Click a dataset to see column metadata and preview rows.
- The **Download** button uses an authenticated blob download.

### 4.11 Model Manager
- Lists deployed models with version, accuracy, F1.
- The two trained models (ANC RF, NutriCheck classifier) appear after running `train_models.py`.
- **Rollback** to a previous version with one click.

### 4.12 Training Lab
- Step 1: Pick module (ANC / NutriCheck / Sickle Cell).
- Step 2: Pick a dataset (real list from Dataset Manager).
- Step 3: Set hyperparameters (algorithm, n_estimators, max_depth, test size).
- Step 4: Click **Start training**. The backend kicks off a real scikit-learn job in a background thread; the UI polls `/api/training/jobs/<id>` every 2 seconds and shows live metrics when complete.

### 4.13 Export Center
4 real downloads, each fetched with your auth token:
- **All Screenings** (CSV)
- **All Referrals** (CSV)
- **CHW Performance Workbook** (XLSX)
- **Audit Log Export** (JSON)

### 4.14 Admin Users (Super Admin only)
- Lists all admins from `/api/admin-users` (real data, no mock array).
- **Add admin** modal: name, email, role, region, password.
- **Delete admin** — confirmation, then they're removed.

### 4.15 Settings
- Real settings table grouped by section (SMS, ML, Branding).
- Editable in-place; saves via `PUT /api/settings/<section>`.

### 4.16 Audit Log
- Every event: logins, profile updates, model deploys, account deletions, etc.
- Filter by actor, target, action type, date range.

---

## 5. Things to verify "no mock data anywhere"

Open the browser dev tools network tab and confirm:

1. **Home → KPI cards** all show **0** initially.
2. **Home → Recent Patients** shows empty state.
3. **CHW Notifications screen** → empty ("All quiet").
4. **Admin Notifications screen** → empty.
5. **Admin Users page** → shows the 4 admins from `seed.py`, not 6 fake ones.
6. **Admin reports** (Antenatal / NutriCheck / Sickle) all show "No data yet" empty states.
7. **Admin Performance page** → no random curves; shows "No training history yet" until you train.
8. **Banner carousel on home** → shows 4 Ghana-themed slides (real branded content).

If anything shows pre-seeded content other than the 2 CHWs, 4 admins, the 4 datasets, and the carousel slides, something is wrong.

---

## 6. Profile propagation test

1. Log in as **GHS-CHW-00100** (initial name "Akosua Mensah").
2. The top header shows **"Hello, Akosua!"** and avatar with initials **AM**.
3. Tap **More → My Profile**.
4. Change the name to **"Akua Updated"**.
5. Tap **Save**.
6. Tap the back arrow.
7. The top header now shows **"Hello, Akua!"** with initials **AU**.
8. Tap the avatar camera icon, upload an image.
9. The image immediately appears in the profile screen AND in the top header.
10. Same flow on **admin side**: log in as super admin, click your name in the sidebar bottom-left, edit it, save — sidebar updates.

After saving, the app now also re-fetches `/me` from the server to guarantee the canonical user state replaces any cached version.

---

## 7. End-to-end clinical test

This proves the whole stack works together:

1. Log in as CHW.
2. New Screening → Antenatal.
3. Enter patient: Mary Awo, 26, parity 1, 32 weeks pregnant.
4. BP: **170/115** (high)
5. Symptoms: tick **Severe headache** and **Blurred vision**.
6. Calculate → result should be **HIGH RISK** or **EMERGENCY** because the rule-based safety net adds +40 for BP and +25 for headache+blurred (pre-eclampsia signal).
7. Save.
8. An **Alert** is auto-created in the database.
9. **Switch to admin** → Alerts page → you should see Mary Awo's alert at the top.
10. **CHW Notifications** → see the alert.
11. **Admin Notifications** → also see it.
12. **CHW Referrals** → if you created a referral, it's here.
13. **Audit Log (admin)** → `SCREENING_CREATE`, `ALERT_CREATE`, `SMS_SEND` (dry-run) all recorded.

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `422 Unprocessable Entity` everywhere | Stale JWT from before re-seed | Log out and back in. The app now auto-clears stale tokens. |
| `Network error` toast | Backend not running | `python run.py` in the `backend` folder |
| Login says "Invalid credentials" | DB not seeded | `python seed.py` |
| Datasets empty in Dataset Manager | Seed didn't find the zip files | Verify `backend/data/datasets/` has the 3 zip files. Re-run `python seed.py`. |
| Models page shows no models | Models not trained | `python train_models.py` |
| `Could not load report data` toast | Backend crashed or unreachable | Check the Flask terminal for tracebacks |
| Avatar not showing in header after upload | Browser cache | Hard refresh: Ctrl+Shift+R |
| `removeChild` React error in console | Was an AnimatePresence race in old build | Fixed — the carousel is now a pure CSS crossfade |

---

## 9. What's "static UI content" (NOT mock data)

These are legitimate static UI content — **not mock data** in the misleading sense:

- **Banner carousel slides** — app branding (ANC tip / NutriCheck tip / etc.). These are like the welcome screens in any app.
- **GHANA_REGIONS** — the actual list of Ghana's 16 administrative regions. Static reference data.
- **Form options** — symptom checklists, language dropdowns, role dropdowns, filter pills. These define the UI, not the data.
- **Help / FAQ content** — the floating help bubble has 4 hardcoded FAQs about how to use the app.
- **Step labels** — "Module / Dataset / Hyperparameters / Train" in the Training Lab wizard.

Everything that represents **real-world data** (patients, screenings, alerts, referrals, notifications, model metrics, dataset stats, CHWs, admins) is fetched from the backend API and starts empty on a fresh seed.

---

## 10. Architecture summary

```
React (Vite) ──── /api/* ───▶ Flask ──── SQLAlchemy ──▶ SQLite (antescan.db)
   │                              │
   │                              ├──▶ scikit-learn models (data/ml_models/)
   │                              ├──▶ pyreadstat / DCT parser (data/datasets/)
   │                              ├──▶ WHO 2006 LMS tables
   │                              ├──▶ Africa's Talking SMS (dry-run by default)
   │                              └──▶ ReportLab / openpyxl exports
   │
   └──▶ localStorage (offline queue, JWT, theme, onboarding flag)
```

- **Backend:** ~63 endpoints across 15 blueprints.
- **Frontend:** ~150 files, single 970 KB JS bundle (gzipped ~263 KB).
- **No mock data** — every list comes from a real endpoint or shows an empty state.
- **Real Ghana datasets** — DHS BR/KR recodes + MICS6 SPSS files, parsed live.
- **Real ML models** — Random Forest + Gradient Boosting trained on real data with cross-validation.

---

## 11. Things to demo to judges

1. Open with the **CHW flow** — most visually compelling.
2. Show the **sliding banners** and the **animated Ghanaian mother SVG illustration**.
3. Live-screen a high-risk ANC patient, watch the **rule-based safety net** override a low ML score because of dangerous BP.
4. Switch to admin → show the new Alert appear in real time → show the audit log entry.
5. Open the Training Lab → train a real model on real DHS data while they watch.
6. Open the Dataset Manager → click into GHBR8CFL → show the 64 columns of real DHS data.
7. Show the **Grandmother Network SMS template** in the Settings / SMS section — local-language Twi/Ga/Ewe/Hausa templates for elder alerts.
8. Show the **offline sync queue** — toggle airplane mode on the phone, do a screening, toggle back, watch the queue drain.

Good luck.
