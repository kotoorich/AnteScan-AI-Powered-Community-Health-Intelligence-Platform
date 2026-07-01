import { useState } from 'react'
import { Users, Search, Loader2 } from 'lucide-react'
import { useChws } from '../data/hooks.js'
import { GHANA_REGIONS } from '../data/mockData.js'

const STATUS_COLORS = {
  Active: 'bg-ghana-green/15 text-ghana-green',
  Inactive: 'bg-fg-tertiary/15 text-fg-tertiary',
  Suspended: 'bg-ghana-red/15 text-ghana-red',
}

export default function AdminAllChws() {
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('All')
  const [status, setStatus] = useState('All')
  const { data, loading, error } = useChws({ search, region, status })

  const items = data?.items || []

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-ghana-gold" /> Community Health Workers
        </h1>
        <p className="text-sm text-fg-secondary">{data?.total ?? 0} CHWs registered nationwide</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-fg-tertiary" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or CHW ID…"
            className="w-full pl-9 pr-3 py-2.5 bg-bg-card border border-border rounded-xl text-sm" />
        </div>
        <select value={region} onChange={(e) => setRegion(e.target.value)}
          className="bg-bg-card border border-border rounded-xl px-3 py-2.5 text-sm">
          <option>All</option>
          {GHANA_REGIONS.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="bg-bg-card border border-border rounded-xl px-3 py-2.5 text-sm">
          <option>All</option>
          <option>Active</option>
          <option>Inactive</option>
          <option>Suspended</option>
        </select>
      </div>

      {loading && (
        <div className="card-elevated bg-bg-card p-8 flex items-center justify-center gap-2 text-fg-secondary">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading CHWs…
        </div>
      )}
      {error && (
        <div className="card-elevated bg-ghana-red/10 border border-ghana-red/30 p-4 text-sm">
          Could not load CHWs: {error.message}
        </div>
      )}

      <div className="card-elevated bg-bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-secondary text-fg-secondary text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">CHW</th>
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Compound</th>
              <th className="text-left px-4 py-3">Region</th>
              <th className="text-right px-4 py-3">Screenings</th>
              <th className="text-center px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t border-border hover:bg-bg-secondary/40">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-fg-secondary text-xs">{c.chwId}</td>
                <td className="px-4 py-3 text-fg-secondary">{c.compound || '—'}</td>
                <td className="px-4 py-3 text-fg-secondary">{c.region}</td>
                <td className="px-4 py-3 text-right font-bold">{c.totalScreenings ?? 0}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[c.status] || ''}`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
