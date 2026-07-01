/**
 * BACKWARDS-COMPAT SHIM — no mock data, only thin API wrappers.
 *
 * Real data lives in the Flask backend. Screens that imported named
 * collections here now receive empty defaults; they should migrate to the
 * `useApi` hooks in `./hooks.js`. The empty defaults guarantee imports
 * never crash, but live data must come from the API.
 */
import { api } from '../services/api.js'

// --- Named legacy exports used by existing screens ---

export const SEED_PATIENTS = []         // → useApi(api.patients.list)
export const SEED_REFERRALS = []        // → useApi(api.referrals.list)
export const SEED_ALERTS = []           // → useApi(api.alerts.list)
export const SEED_CHWS = []             // → useApi(api.chws.list)
export const SEED_DATASETS = []         // → useApi(api.datasets.list)
export const SEED_MODELS = []           // → useApi(api.models.list)
export const DASHBOARD_STATS = {
  todayScreenings: 0,
  weeklyScreenings: 0,
  totalPatients: 0,
  highRiskAlerts: 0,
}
export const RISK_DISTRIBUTION = []
export const SCREENING_TREND = []
export const DATASET_PREVIEW = []
export const DATASET_COLUMNS = []
export const GHANA_REGIONS = [
  'Ashanti', 'Greater Accra', 'Western', 'Central', 'Eastern', 'Volta',
  'Northern', 'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo',
  'Western North', 'Oti', 'Savannah', 'North East',
]
export const HERO_SLIDES = [
  {
    id: 1, title: 'Welcome to AnteScan',
    subtitle: 'AI-powered community health for Ghana',
    color: 'from-ghana-red to-red-700',
  },
  {
    id: 2, title: 'Screen Faster',
    subtitle: 'ANC, NutriCheck and Sickle Cell in one app',
    color: 'from-ghana-gold to-amber-600',
  },
  {
    id: 3, title: 'Save Lives',
    subtitle: 'Refer urgent cases instantly via SMS',
    color: 'from-ghana-green to-emerald-700',
  },
]

// --- Lowercase shorthand (some screens reference these) ---

export const patients = []
export const referrals = []
export const screenings = []
export const chws = []
export const compounds = []
export const alerts = []
export const broadcasts = []
export const notifications = []
export const auditLogs = []
export const adminUsers = []
export const seedDatasets = []
export const modelMetrics = []
export const dashboardKpis = DASHBOARD_STATS
export const screeningTrend = []
export const riskDistribution = []
export const referralOutcomes = []
export const regionBreakdown = []
export const systemSettings = {}

// --- Re-export the API client for ergonomic access ---

export { api }
export const mockApi = api

export const loaders = {
  patients: (params) => api.patients.list(params),
  referrals: (params) => api.referrals.list(params),
  chws: (params) => api.chws.list(params),
  alerts: (params) => api.alerts.list(params),
  kpis: () => api.dashboard.kpis(),
  trend: () => api.dashboard.trend(),
  datasets: () => api.datasets.list(),
  models: () => api.models.list(),
  notifications: () => api.notifications.list(),
  broadcasts: () => api.broadcasts.list(),
  leaderboard: (scope, period) => api.leaderboard.get(scope, period),
  auditLog: (params) => api.audit.log(params),
}

export default { api, loaders }
