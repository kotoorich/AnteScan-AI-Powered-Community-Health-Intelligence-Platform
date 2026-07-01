import { Send, Loader2 } from 'lucide-react'
import { useReferrals } from '../data/hooks.js'

const URGENCY_COLORS = {
  Emergency: 'bg-ghana-red text-white',
  Urgent: 'bg-orange-500/20 text-orange-400',
  Routine: 'bg-ghana-green/15 text-ghana-green',
}

export default function ReferralsScreen() {
  const { data, loading, error } = useReferrals()
  const items = data?.items || []

  return (
    <div className="space-y-3 p-4 lg:p-0">
      <div className="flex items-center gap-2 mb-2">
        <Send className="w-5 h-5 text-ghana-green" />
        <h2 className="font-display text-lg font-bold">My Referrals</h2>
        <span className="ml-auto text-xs text-fg-tertiary">{data?.total ?? 0} total</span>
      </div>

      {loading && (
        <div className="card-elevated bg-bg-card p-6 flex items-center justify-center gap-2 text-fg-secondary">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}
      {error && <div className="card-elevated bg-ghana-red/10 border border-ghana-red/30 p-4 text-sm">{error.message}</div>}
      {!loading && items.length === 0 && (
        <div className="card-elevated bg-bg-card p-6 text-center text-sm text-fg-secondary">
          No referrals yet. They're created automatically when you submit a high-risk screening.
        </div>
      )}

      <div className="space-y-2">
        {items.map((r) => (
          <div key={r.id} className="card-elevated bg-bg-card p-3">
            <div className="flex items-start gap-3">
              <div className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold ${URGENCY_COLORS[r.urgency] || ''}`}>
                {r.urgency}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold">{r.patient}</div>
                <div className="text-xs text-fg-secondary">
                  → {r.facility} · {r.module}
                </div>
                <div className="text-[10px] text-fg-tertiary mt-1 flex items-center gap-2">
                  <span>{r.status}</span>
                  <span>·</span>
                  <span>SMS {r.smsStatus || 'pending'}</span>
                  {r.elderNotified && <><span>·</span><span className="text-ghana-gold">Elder notified</span></>}
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="text-fg-tertiary">{r.daysOpen ?? 0} days</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
