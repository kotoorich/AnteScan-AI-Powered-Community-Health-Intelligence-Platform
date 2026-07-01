import { useState } from 'react'
import { Trophy, Award, Loader2 } from 'lucide-react'
import { useLeaderboard } from '../data/hooks.js'

const MEDAL = ['🥇', '🥈', '🥉']

export default function AdminLeaderboard() {
  const [scope, setScope] = useState('National')
  const [period, setPeriod] = useState('all')
  const { data, loading } = useLeaderboard(scope, period)

  const items = data?.items || []

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6 text-ghana-gold" /> Leaderboard
        </h1>
        <p className="text-sm text-fg-secondary">Top performing CHWs by screenings completed</p>
      </div>

      <div className="flex gap-2">
        <div className="flex gap-1 bg-bg-card border border-border rounded-xl p-1">
          {['National', 'Regional', 'District'].map((s) => (
            <button key={s} onClick={() => setScope(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${scope === s ? 'bg-ghana-gold text-black' : 'text-fg-secondary'}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-bg-card border border-border rounded-xl p-1">
          {[['all', 'All time'], ['month', 'Month'], ['week', 'Week']].map(([key, label]) => (
            <button key={key} onClick={() => setPeriod(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${period === key ? 'bg-ghana-red text-white' : 'text-fg-secondary'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="card-elevated bg-bg-card p-8 flex items-center justify-center gap-2 text-fg-secondary">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading rankings…
        </div>
      )}

      <div className="card-elevated bg-bg-card divide-y divide-border">
        {items.map((c, idx) => (
          <div key={c.id} className="flex items-center gap-3 p-3">
            <div className="w-10 text-center font-display font-bold text-lg">
              {MEDAL[idx] || `#${idx + 1}`}
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-ghana-gold to-amber-500 flex items-center justify-center text-black font-bold">
              {c.name?.split(' ').map(s => s[0]).slice(0, 2).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold truncate">{c.name}</div>
              <div className="text-xs text-fg-secondary truncate">{c.chwId} · {c.compound || c.region}</div>
            </div>
            <div className="text-right">
              <div className="font-display font-bold text-ghana-gold">{c.totalScreenings}</div>
              <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">Screenings</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
