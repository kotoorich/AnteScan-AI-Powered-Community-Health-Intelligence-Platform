import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api } from '../services/api.js'

const STORAGE_KEY = 'antescan_offline_queue'
const OfflineContext = createContext()

function readQueue() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] }
  catch { return [] }
}
function writeQueue(q) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(q)) } catch {}
}

export function OfflineProvider({ children }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queue, setQueue] = useState(readQueue)
  const [syncing, setSyncing] = useState(false)

  // Network listeners
  useEffect(() => {
    const onUp = () => setIsOnline(true)
    const onDown = () => setIsOnline(false)
    window.addEventListener('online', onUp)
    window.addEventListener('offline', onDown)
    return () => {
      window.removeEventListener('online', onUp)
      window.removeEventListener('offline', onDown)
    }
  }, [])

  const queueScreening = useCallback((payload) => {
    const item = {
      clientUuid: payload.clientUuid || `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      module: payload.module,
      patientName: payload.patientName || payload.fullName,
      data: payload,
      queuedAt: new Date().toISOString(),
      status: 'pending',
    }
    setQueue((q) => { const next = [...q, item]; writeQueue(next); return next })
    return item.clientUuid
  }, [])

  const syncNow = useCallback(async () => {
    if (!isOnline || syncing) return { synced: 0 }
    const current = readQueue()
    if (current.length === 0) return { synced: 0 }

    setSyncing(true)
    let synced = 0
    const failed = []
    for (const item of current) {
      try {
        await api.screenings.create({ ...item.data, clientUuid: item.clientUuid })
        synced++
      } catch (err) {
        failed.push({ ...item, status: 'failed', error: err.message || 'Network error' })
      }
    }
    writeQueue(failed)
    setQueue(failed)
    setSyncing(false)
    return { synced, failed: failed.length }
  }, [isOnline, syncing])

  // Auto-sync when we come back online
  useEffect(() => {
    if (isOnline && queue.length > 0 && !syncing) syncNow().catch(() => {})
    // eslint-disable-next-line
  }, [isOnline])

  const clearQueue = useCallback(() => {
    writeQueue([])
    setQueue([])
  }, [])

  return (
    <OfflineContext.Provider value={{
      isOnline, online: isOnline,           // alias for back-compat
      queue, pendingSync: queue.length,
      syncing, syncNow, queueScreening, clearQueue,
    }}>
      {children}
    </OfflineContext.Provider>
  )
}

export const useOffline = () => useContext(OfflineContext)
