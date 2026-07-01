import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, Loader2, ChevronRight, CheckCircle2, RotateCcw } from 'lucide-react'
import { useModels } from '../data/hooks.js'
import { api } from '../services/api.js'

const STATUS_COLORS = {
  Active: 'bg-ghana-green/15 text-ghana-green',
  Testing: 'bg-ghana-gold/15 text-ghana-gold',
  Archived: 'bg-fg-tertiary/15 text-fg-tertiary',
}

export default function AdminModelManager() {
  const nav = useNavigate()
  const { data, loading, error, refetch } = useModels()
  const [rolling, setRolling] = useState(null)

  const items = data?.items || []

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-ghana-gold" /> Model Manager
          </h1>
          <p className="text-sm text-fg-secondary">{items.length} models registered · trained on real Ghana data</p>
        </div>
        <button onClick={() => nav('/admin/training')} className="btn-primary inline-flex items-center gap-2">
          Train new model
        </button>
      </div>

      {loading && (
        <div className="card-elevated bg-bg-card p-8 flex items-center justify-center gap-2 text-fg-secondary">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading models…
        </div>
      )}
      {error && (
        <div className="card-elevated bg-ghana-red/10 border border-ghana-red/30 p-4 text-sm">
          {error.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {items.map((m) => (
          <div key={m.id} className="card-elevated bg-bg-card p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-display font-bold">{m.name}</div>
                <div className="text-[10px] uppercase tracking-wider text-fg-tertiary font-bold">
                  {m.module} · v{m.version} · {m.algorithm}
                </div>
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[m.status] || ''}`}>
                {m.status}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs mb-3">
              {['accuracy', 'precision', 'recall', 'f1'].map((k) => (
                <div key={k}>
                  <div className="text-fg-tertiary uppercase tracking-wider">{k}</div>
                  <div className="font-bold">{m[k] != null ? (m[k] * 100).toFixed(1) + '%' : '—'}</div>
                </div>
              ))}
            </div>

            {m.trainingDataset && (
              <div className="text-xs text-fg-secondary pt-2 border-t border-border">
                Trained on <span className="text-ghana-gold font-bold">{m.trainingDataset}</span>
                {m.deployedAt && (
                  <span className="ml-2 text-fg-tertiary">
                    · deployed {new Date(m.deployedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
