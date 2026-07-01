/**
 * AnteScan API client.
 * One module, every backend endpoint, JWT-authenticated.
 *
 * Usage:
 *   import { api } from './services/api'
 *   const { items } = await api.patients.list()
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const STORAGE_KEY = 'antescan_auth'

// --- Token store ---

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  } catch {
    return null
  }
}

export function setAuth(auth) {
  if (auth) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

// --- Core fetch wrapper ---

class ApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.status = status
    this.payload = payload
  }
}

async function request(path, options = {}) {
  const auth = getAuth()
  const isFormData = options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(auth?.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {}),
    ...(options.headers || {}),
  }

  let resp
  try {
    resp = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  } catch (e) {
    throw new ApiError('Network error — check that the API is running.', 0, null)
  }

  // Auto-refresh on 401, auto-logout on 422 (stale/invalid JWT)
  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  const loginRoute = isAdminRoute ? '/admin/login' : '/login'

  if (resp.status === 422 && auth?.accessToken) {
    // JWT signature/format invalid — token from a previous DB or different secret. Clear & redirect.
    console.warn('[api] 422 on', path, '— clearing stale auth and returning to login')
    setAuth(null)
    if (typeof window !== 'undefined' && !window.location.pathname.endsWith('login')) {
      window.location.href = loginRoute
    }
    throw new ApiError('Session expired. Please log in again.', 422, null)
  }

  if (resp.status === 401 && auth?.refreshToken && !path.startsWith('/api/auth/refresh')) {
    const refreshResp = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.refreshToken}` },
    })
    if (refreshResp.ok) {
      const data = await refreshResp.json()
      setAuth({ ...auth, accessToken: data.accessToken })
      headers.Authorization = `Bearer ${data.accessToken}`
      resp = await fetch(`${BASE_URL}${path}`, { ...options, headers })
    } else {
      setAuth(null)
      if (typeof window !== 'undefined' && !window.location.pathname.endsWith('login')) {
        window.location.href = loginRoute
      }
    }
  }

  if (resp.status === 204) return null

  const contentType = resp.headers.get('Content-Type') || ''
  if (!resp.ok) {
    const payload = contentType.includes('application/json') ? await resp.json() : await resp.text()
    throw new ApiError(payload?.error || resp.statusText, resp.status, payload)
  }
  if (contentType.includes('application/json')) {
    return resp.json()
  }
  return resp.blob()
}

const get = (path) => request(path)
const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) })
const postForm = (path, formData) => request(path, { method: 'POST', body: formData })
const patch = (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) })
const del = (path, body) => request(path, { method: 'DELETE', body: body !== undefined ? JSON.stringify(body) : undefined })

// --- API surface ---

export const api = {
  // Auth
  auth: {
    chwLogin: (chwId, password) => post('/api/auth/chw/login', { chwId, password }),
    chwRegister: (body) => post('/api/auth/chw/register', body),
    adminLogin: (email, password) => post('/api/auth/admin/login', { email, password }),
    forgotRequest: (phone) => post('/api/auth/forgot/request', { phone }),
    forgotVerify: (phone, code, newPassword) =>
      post('/api/auth/forgot/verify', { phone, code, newPassword }),
    me: () => get('/api/auth/me'),
    updateProfile: (data) => patch('/api/auth/profile', data),
    uploadAvatar: (file) => {
      const fd = new FormData(); fd.append('file', file)
      return postForm('/api/auth/avatar', fd)
    },
    deleteAvatar: () => del('/api/auth/avatar'),
    getPreferences: () => get('/api/auth/preferences'),
    updatePreferences: (data) => patch('/api/auth/preferences', data),
    deleteAccount: (password) => del('/api/auth/account', { password }),
  },

  // Patients & screenings
  patients: {
    list: (params = {}) => get(`/api/patients${qs(params)}`),
    get: (id) => get(`/api/patients/${id}`),
    create: (body) => post('/api/patients', body),
    timeline: (id) => get(`/api/patients/${id}/timeline`),
  },
  screenings: {
    create: (body) => post('/api/screenings', body),
    get: (id) => get(`/api/screenings/${id}`),
    voiceMap: (transcript) => post('/api/screenings/voice/map', { transcript }),
    bulkSync: (items) => post('/api/screenings/bulk-sync', { items }),
  },

  // Referrals, alerts, labs
  referrals: {
    list: (params = {}) => get(`/api/referrals${qs(params)}`),
    create: (body) => post('/api/referrals', body),
    update: (id, body) => patch(`/api/referrals/${id}`, body),
  },
  alerts: {
    list: (params = {}) => get(`/api/alerts${qs(params)}`),
    update: (id, body) => patch(`/api/alerts/${id}`, body),
  },
  labs: {
    forPatient: (pid) => get(`/api/lab-results/patients/${pid}`),
    upload: (pid, formData) => postForm(`/api/lab-results/patients/${pid}`, formData),
  },

  // Datasets / Models / Training
  datasets: {
    list: () => get('/api/datasets'),
    get: (id) => get(`/api/datasets/${id}`),
    preview: (id) => get(`/api/datasets/${id}/preview`),
    download: async (id, filename) => {
      // Authenticated download: fetch with JWT, then trigger browser save
      const auth = getAuth()
      const resp = await fetch(`${BASE_URL}/api/datasets/${id}/download`, {
        headers: auth?.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {},
      })
      if (!resp.ok) throw new ApiError('Download failed', resp.status, null)
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || `${id}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    },
    upload: (formData) => postForm('/api/datasets/upload', formData),
    delete: (id) => del(`/api/datasets/${id}`),
  },
  models: {
    list: () => get('/api/models'),
    get: (id) => get(`/api/models/${id}`),
    rollback: (id, runId) => post(`/api/models/${id}/rollback/${runId}`),
  },
  training: {
    start: (body) => post('/api/training', body),
    status: (jobId) => get(`/api/training/jobs/${jobId}`),
  },

  // People
  chws: {
    list: (params = {}) => get(`/api/chws${qs(params)}`),
  },
  compounds: {
    list: () => get('/api/compounds'),
    create: (body) => post('/api/compounds', body),
  },
  leaderboard: {
    get: (scope = 'National', period = 'all') =>
      get(`/api/leaderboard${qs({ scope, period })}`),
  },

  // Dashboard & reports
  dashboard: {
    kpis: () => get('/api/dashboard/kpis'),
    trend: (days = 30) => get(`/api/dashboard/trend${qs({ days })}`),
    riskDistribution: () => get('/api/dashboard/risk-distribution'),
    referralOutcomes: () => get('/api/dashboard/referral-outcomes'),
    regionBreakdown: () => get('/api/dashboard/region-breakdown'),
  },
  reports: {
    antenatal: () => get('/api/reports/antenatal'),
    nutricheck: () => get('/api/reports/nutricheck'),
    growthCurve: (sex = 'F', metric = 'waz') =>
      get(`/api/reports/growth-curve${qs({ sex, metric })}`),
    sickle: () => get('/api/reports/sickle'),
    modelPerformance: () => get('/api/reports/model-performance'),
    activityHeatmap: () => get('/api/reports/activity-heatmap'),
  },

  // System
  notifications: {
    list: () => get('/api/notifications'),
    markRead: (id) => post('/api/notifications/mark-read', { id }),
    markAllRead: () => post('/api/notifications/mark-read', { all: true }),
    deleteOne: (id) => del(`/api/notifications/${id}`),
    clearAll: () => del('/api/notifications'),
    unreadCount: () => get('/api/notifications/unread-count'),
    createSelf: (body) => post('/api/notifications/self', body),
  },
  broadcasts: {
    list: () => get('/api/broadcasts'),
    create: (body) => post('/api/broadcasts', body),
  },
  exports: {
    screeningsCsv: () => `${BASE_URL}/api/exports/screenings.csv`,
    referralsCsv: () => `${BASE_URL}/api/exports/referrals.csv`,
    chwsXlsx: () => `${BASE_URL}/api/exports/chws.xlsx`,
  },
  // Authenticated blob downloads (use these from the admin Export Center)
  exportsAuth: {
    screeningsCsv: () => request('/api/exports/screenings.csv'),
    referralsCsv: () => request('/api/exports/referrals.csv'),
    chwsXlsx: () => request('/api/exports/chws.xlsx'),
    auditJson: () => request('/api/exports/audit.json'),
  },
  settings: {
    get: () => get('/api/settings'),
    update: (section, body) => request(`/api/settings/${section}`,
      { method: 'PUT', body: JSON.stringify(body) }),
  },
  adminUsers: {
    list: () => get('/api/admin-users'),
    create: (body) => post('/api/admin-users', body),
    delete: (id) => del(`/api/admin-users/${id}`),
  },
  audit: {
    log: (params = {}) => get(`/api/audit-log${qs(params)}`),
  },
  smsLogs: {
    list: (params = {}) => get(`/api/sms-logs${qs(params)}`),
  },
  health: () => get('/api/health'),
}

function qs(params) {
  const usable = Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  if (!usable.length) return ''
  return '?' + new URLSearchParams(usable.map(([k, v]) => [k, String(v)])).toString()
}

export { ApiError }
export default api
