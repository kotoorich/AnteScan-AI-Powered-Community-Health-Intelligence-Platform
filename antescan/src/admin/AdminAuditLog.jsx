import { useState } from 'react'
import { ScrollText, Search, Download, AlertTriangle, Loader2 } from 'lucide-react'
import { useAuditLog } from '../data/hooks.js'
import { api } from '../services/api.js'

export default function AdminAuditLog() {
  const [q, setQ] = useState('')
  const [actionFilter, setActionFilter] = useState('All')
  const [criticalOnly, setCriticalOnly] = useState(false)

  // ✅ FIXED: Use real API data
  const { data, loading, error } = useAuditLog({
    search: q,
    action: actionFilter !== 'All' ? actionFilter : undefined,
    criticalOnly: criticalOnly ? 'true' : undefined,
  })

  const list = data?.items || []
  const actions = data?.actions || []

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center text-fg-secondary">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading audit log…
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-ghana-red">
        Could not load audit log: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-ghana-gold mb-1">System</div>
          <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
            <ScrollText className="w-7 h-7 text-ghana-gold" /> Audit Log
          </h1>
          <p className="text-sm text-fg-secondary">All admin actions, immutable & timestamped</p>
        </div>
        <button 
          onClick={async () => {
            try {
              const blob = await api.exportsAuth.auditJson()
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'audit.json'
              a.click()
              a.remove()
              window.URL.revokeObjectURL(url)
            } catch (e) {
              alert('Export failed: ' + e.message)
            }
          }} 
          className="btn-outline flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Export JSON
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-tertiary" />
          <input 
            className="input pl-10" 
            placeholder="Search actor, action, target…" 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
          />
        </div>
        <select 
          className="input w-auto py-2.5" 
          value={actionFilter} 
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="All">All Actions</option>
          {actions.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 px-3 py-2.5 bg-bg-card border border-border rounded-xl text-sm cursor-pointer">
          <input 
            type="checkbox" 
            checked={criticalOnly} 
            onChange={(e) => setCriticalOnly(e.target.checked)} 
          />
          Critical only
        </label>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-bg-secondary text-xs uppercase tracking-wider text-fg-tertiary">
              <tr>
                <th className="text-left px-5 py-3">ID</th>
                <th className="text-left px-5 py-3">Timestamp (UTC)</th>
                <th className="text-left px-5 py-3">Actor</th>
                <th className="text-left px-5 py-3">Action</th>
                <th className="text-left px-5 py-3">Target</th>
                <th className="text-left px-5 py-3">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {list.map((r) => (
                <tr key={r.id} className={`hover:bg-bg-secondary ${r.critical ? 'bg-ghana-red/5' : ''}`}>
                  <td className="px-5 py-3 font-mono text-xs">{r.id}</td>
                  <td className="px-5 py-3 font-mono text-xs text-fg-secondary">{r.timestamp}</td>
                  <td className="px-5 py-3 font-mono text-xs">{r.actor}</td>
                  <td className="px-5 py-3">
                    <span className={`pill text-[10px] ${r.critical ? 'bg-ghana-red/15 text-ghana-red' : 'bg-bg-secondary text-fg-secondary'}`}>
                      {r.critical && <AlertTriangle className="w-3 h-3" />}
                      {r.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-fg-secondary">{r.target}</td>
                  <td className="px-5 py-3 font-mono text-xs text-fg-tertiary">{r.ip || '—'}</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-fg-secondary">
                    No audit entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}