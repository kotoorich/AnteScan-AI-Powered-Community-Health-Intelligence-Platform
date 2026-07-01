import { Trophy, Loader2 } from 'lucide-react'
import { useLeaderboard } from '../data/hooks.js'
import { useAuth } from '../context/AuthContext.jsx'

const MEDAL = ['🥇', '🥈', '🥉']

export default function LeaderboardScreen() {
  const { user } = useAuth()
  const { data, loading } = useLeaderboard('National', 'all')
  const items = data?.items || []
  const myRank = items.findIndex((c) => c.chwId === user?.chwId) + 1

  return (
    <div className="space-y-4 p-4 lg:p-0">
      <div className="card-elevated bg-gradient-to-br from-ghana-red to-red-800 text-white p-4">
        <div className="flex items-center gap-3">
          <Trophy className="w-10 h-10 text-ghana-gold" />
          <div>
            <div className="text-xs uppercase tracking-wider opacity-75">Your rank</div>
            <div className="font-display text-3xl font-bold">
              {myRank > 0 ? `#${myRank}` : '—'}
            </div>
            <div className="text-xs opacity-90">{user?.totalScreenings ?? 0} screenings</div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="card-elevated bg-bg-card p-6 flex items-center justify-center gap-2 text-fg-secondary">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading rankings…
        </div>
      )}

      <div className="card-elevated bg-bg-card divide-y divide-border">
        {items.map((c, idx) => {
          const isMe = c.chwId === user?.chwId
          return (
            <div key={c.id} className={`flex items-center gap-3 p-3 ${isMe ? 'bg-ghana-gold/5' : ''}`}>
              <div className="w-8 text-center font-bold">{MEDAL[idx] || `#${idx + 1}`}</div>
              <div className="flex-1 min-w-0">
                <div className={`font-display font-bold truncate ${isMe ? 'text-ghana-gold' : ''}`}>
                  {c.name} {isMe && <span className="text-[10px]">(you)</span>}
                </div>
                <div className="text-xs text-fg-secondary truncate">{c.region}</div>
              </div>
              <div className="text-right">
                <div className="font-bold">{c.totalScreenings}</div>
                <div className="text-[10px] text-fg-tertiary">screenings</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
