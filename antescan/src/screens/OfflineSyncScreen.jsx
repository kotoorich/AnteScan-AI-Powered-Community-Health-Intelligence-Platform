import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Wifi, WifiOff, RefreshCw, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { useOffline } from '../context/OfflineContext.jsx'
import { useToast } from '../context/ToastContext.jsx'

export default function OfflineSyncScreen() {
  const nav = useNavigate()
  const { isOnline, queue, syncing, syncNow, clearQueue } = useOffline()
  const toast = useToast()

  const handleSync = async () => {
    try {
      const result = await syncNow()
      toast.success(`Synced ${result?.synced ?? 0} item(s)`)
    } catch (e) {
      toast.error(e.message || 'Sync failed')
    }
  }

  return (
    <div className="space-y-4 pb-6 px-4 lg:px-0">
      <div className="flex items-center gap-2 -ml-2">
        <button onClick={() => nav(-1)} className="p-2 rounded-full hover:bg-bg-secondary">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-2xl font-extrabold">Offline Sync</h1>
      </div>

      {/* Network status */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className={`card-elevated p-5 flex items-center gap-4 ${
          isOnline ? 'bg-ghana-green/10 border border-ghana-green/30' : 'bg-ghana-red/10 border border-ghana-red/30'
        }`}>
        {isOnline
          ? <Wifi className="w-10 h-10 text-ghana-green" />
          : <WifiOff className="w-10 h-10 text-ghana-red" />}
        <div className="flex-1">
          <div className="font-bold">{isOnline ? 'Online' : 'Offline'}</div>
          <div className="text-xs text-fg-secondary">
            {isOnline
              ? 'Connected to the server. Sync runs automatically.'
              : 'No network. Screenings are saved locally and will sync when you reconnect.'}
          </div>
        </div>
      </motion.div>

      {/* Queue */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="card-elevated bg-bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-bold">Pending queue</div>
            <div className="text-xs text-fg-secondary">{queue.length} item(s) waiting</div>
          </div>
          <button onClick={handleSync} disabled={syncing || !isOnline || queue.length === 0}
            className="px-4 py-2 rounded-full bg-ghana-gold text-black text-sm font-bold flex items-center gap-2 disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} /> Sync now
          </button>
        </div>

        {queue.length === 0 ? (
          <div className="text-center py-6 text-fg-secondary text-sm">
            <CheckCircle2 className="w-10 h-10 mx-auto text-ghana-green mb-2" />
            All caught up — no pending items.
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map((item, i) => (
              <div key={item.clientUuid || i}
                className="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary border border-border text-sm">
                {item.status === 'failed'
                  ? <AlertCircle className="w-5 h-5 text-ghana-red shrink-0" />
                  : <Clock className="w-5 h-5 text-ghana-gold shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {item.module || 'Screening'} · {item.patientName || 'Patient'}
                  </div>
                  <div className="text-xs text-fg-secondary truncate">
                    Queued {item.queuedAt ? new Date(item.queuedAt).toLocaleString() : ''}
                    {item.error && <span className="text-ghana-red"> · {item.error}</span>}
                  </div>
                </div>
              </div>
            ))}
            {queue.length > 0 && (
              <button onClick={() => { if (confirm('Discard all pending items?')) clearQueue() }}
                className="w-full text-xs text-ghana-red font-bold mt-2 py-2">
                Discard queue
              </button>
            )}
          </div>
        )}
      </motion.div>

      {/* Help */}
      <div className="card-elevated bg-bg-card p-4 text-xs text-fg-secondary space-y-2">
        <div className="font-bold text-fg">How offline sync works</div>
        <p>Screenings created without network are stored on this device with a unique ID.
        When you reconnect, AnteScan submits them in order, and the server uses the ID to
        prevent duplicates if a request is retried.</p>
        <p>Lab results and patient photos are uploaded only on Wi-Fi by default to save data.</p>
      </div>
    </div>
  )
}
