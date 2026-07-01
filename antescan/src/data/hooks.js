/**
 * React hooks for fetching API data.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi(() => api.patients.list())
 */
import { useEffect, useState, useCallback, useRef } from 'react'
import { api } from '../services/api.js'

/**
 * Generic fetcher hook. Accepts a function returning a Promise.
 * Re-runs when `deps` change.
 */
export function useApi(fetcher, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const aliveRef = useRef(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      if (aliveRef.current) {
        setData(result)
      }
    } catch (e) {
      if (aliveRef.current) {
        setError(e)
      }
    } finally {
      if (aliveRef.current) {
        setLoading(false)
      }
    }
    // eslint-disable-next-line
  }, deps)

  useEffect(() => {
    aliveRef.current = true
    refetch()
    return () => { aliveRef.current = false }
    // eslint-disable-next-line
  }, [refetch])

  return { data, loading, error, refetch }
}

// --- Convenience wrappers around common endpoints ---

export const usePatients = (params) =>
  useApi(() => api.patients.list(params), [JSON.stringify(params)])

export const usePatient = (id) =>
  useApi(() => (id ? api.patients.get(id) : Promise.resolve(null)), [id])

export const usePatientTimeline = (id) =>
  useApi(() => (id ? api.patients.timeline(id) : Promise.resolve({ events: [] })), [id])

export const useReferrals = (params) =>
  useApi(() => api.referrals.list(params), [JSON.stringify(params)])

export const useAlerts = (params) =>
  useApi(() => api.alerts.list(params), [JSON.stringify(params)])

export const useChws = (params) =>
  useApi(() => api.chws.list(params), [JSON.stringify(params)])

export const useCompounds = () => useApi(() => api.compounds.list(), [])

export const useDatasets = () => useApi(() => api.datasets.list(), [])

export const useDataset = (id) =>
  useApi(() => (id ? api.datasets.get(id) : Promise.resolve(null)), [id])

export const useModels = () => useApi(() => api.models.list(), [])

export const useDashboardKpis = () => useApi(() => api.dashboard.kpis(), [])

export const useTrend = (days = 30) =>
  useApi(() => api.dashboard.trend(days), [days])

export const useRiskDistribution = () =>
  useApi(() => api.dashboard.riskDistribution(), [])

export const useReferralOutcomes = () =>
  useApi(() => api.dashboard.referralOutcomes(), [])

export const useRegionBreakdown = () =>
  useApi(() => api.dashboard.regionBreakdown(), [])

export const useLeaderboard = (scope = 'National', period = 'all') =>
  useApi(() => api.leaderboard.get(scope, period), [scope, period])

export const useNotifications = () => useApi(() => api.notifications.list(), [])

export const useBroadcasts = () => useApi(() => api.broadcasts.list(), [])

export const useSmsLogs = (params) =>
  useApi(() => api.smsLogs.list(params), [JSON.stringify(params)])

export const useAuditLog = (params) =>
  useApi(() => api.audit.log(params), [JSON.stringify(params)])

export const useAdminUsers = () => useApi(() => api.adminUsers.list(), [])

export const useSettings = () => useApi(() => api.settings.get(), [])

export const useAntenatalReport = () =>
  useApi(() => api.reports.antenatal(), [])

export const useNutricheckReport = () =>
  useApi(() => api.reports.nutricheck(), [])

export const useGrowthCurve = (sex = 'F', metric = 'waz') =>
  useApi(() => api.reports.growthCurve(sex, metric), [sex, metric])

export const useSickleReport = () => useApi(() => api.reports.sickle(), [])

export const useModelPerformance = () =>
  useApi(() => api.reports.modelPerformance(), [])

export const useActivityHeatmap = () =>
  useApi(() => api.reports.activityHeatmap(), [])
