import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, Loader2, ChevronRight } from 'lucide-react'
import { useAlerts } from '../data/hooks.js'
import { api } from '../services/api.js'

const SEVERITY_COLORS = {
  emergency: 'bg-ghana-red text-white',
  high: 'bg-orange-500/15 text-orange-400 border border-orange-500/40',
  moderate: 'bg-ghana-gold/15 text-ghana-gold',
}

export default function AdminAlerts() {
  const [status, setStatus] = useState('Open')
  const { data, loading, error, refetch } = useAlerts({ status })

  const items = data?.items || []

  const handleAck = async (id) => {
    try { await api.alerts.update(id, { action: 'acknowledge' }); refetch() }
    catch (e) { alert('Failed: ' + e.message) }
  }
  const handleResolve = async (id) => {
    const notes = prompt('Resolution notes (optional):')
    try { await api.alerts.update(id, { action: 'resolve', notes }); refetch() }
    catch (e) { alert('Failed: ' + e.message) }
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-ghana-red" /> Alerts
          </h1>
          <p className="text-sm text-fg-secondary">High-risk screenings requiring admin review</p>
        </div>
        <div className="flex gap-1 bg-bg-card border border-border rounded-xl p-1">
          {['Open', 'Acknowledged', 'Resolved', 'All'].map((s) => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${status === s ? 'bg-ghana-gold text-black' : 'text-fg-secondary'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="card-elevated bg-bg-card p-8 flex items-center justify-center gap-2 text-fg-secondary">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading alerts…
        </div>
      )}
      {error && (
        <div className="card-elevated bg-ghana-red/10 border border-ghana-red/30 p-4 text-sm">
          Could not load alerts: {error.message}
        </div>
      )}
      {!loading && items.length === 0 && (
        <div className="card-elevated bg-bg-card p-8 text-center text-fg-secondary text-sm">
          No {status.toLowerCase()} alerts. Critical screenings will appear here automatically.
        </div>
      )}

      <div className="space-y-2">
        {items.map((a) => (
          <div key={a.id} className="card-elevated bg-bg-card p-4">
            <div className="flex items-start gap-3">
              <div className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${SEVERITY_COLORS[a.risk] || ''}`}>
                {a.risk}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold">{a.patient || '—'} <span className="text-xs text-fg-tertiary">· {a.age}yr</span></div>
                <div className="text-xs text-fg-secondary">
                  Risk score: {a.riskScore}/100 · CHW: {a.chw} · {a.compound || a.district}
                </div>
                {a.symptoms?.length > 0 && (
                  <div className="text-xs text-fg-tertiary mt-1">Symptoms: {a.symptoms.join(', ')}</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-fg-tertiary flex items-center gap-1 justify-end">
                  <Clock className="w-3 h-3" /> {a.elapsed}
                </div>
                <div className="text-xs mt-1">{a.status}</div>
              </div>
            </div>
            {a.status === 'Open' && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                <button onClick={() => handleAck(a.id)} className="btn-outline py-1.5 text-xs flex-1">Acknowledge</button>
                <button onClick={() => handleResolve(a.id)} className="btn-primary py-1.5 text-xs flex-1 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
