import { useState } from 'react'
import { Send, Search, Loader2 } from 'lucide-react'
import { useReferrals } from '../data/hooks.js'
import { api } from '../services/api.js'

const STATUS_COLORS = {
  Sent: 'bg-ghana-gold/15 text-ghana-gold',
  Received: 'bg-blue-500/15 text-blue-400',
  Completed: 'bg-ghana-green/15 text-ghana-green',
  'No-show': 'bg-ghana-red/15 text-ghana-red',
  Cancelled: 'bg-fg-tertiary/15 text-fg-tertiary',
}

export default function AdminAllReferrals() {
  const [status, setStatus] = useState('All')
  const [search, setSearch] = useState('')
  const { data, loading, error, refetch } = useReferrals({ status, search })

  const items = data?.items || []

  const updateStatus = async (id, newStatus) => {
    try { await api.referrals.update(id, { status: newStatus }); refetch() }
    catch (e) { alert('Update failed: ' + e.message) }
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Send className="w-6 h-6 text-ghana-green" /> Referrals
        </h1>
        <p className="text-sm text-fg-secondary">{data?.total ?? 0} total referrals across all CHWs</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-fg-tertiary" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient name…"
            className="w-full pl-9 pr-3 py-2.5 bg-bg-card border border-border rounded-xl text-sm" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          className="bg-bg-card border border-border rounded-xl px-3 py-2.5 text-sm">
          {['All', 'Sent', 'Received', 'Completed', 'No-show', 'Cancelled'].map((s) =>
            <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading && (
        <div className="card-elevated bg-bg-card p-8 flex items-center justify-center gap-2 text-fg-secondary">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading referrals…
        </div>
      )}
      {error && (
        <div className="card-elevated bg-ghana-red/10 border border-ghana-red/30 p-4 text-sm">
          Could not load: {error.message}
        </div>
      )}

      <div className="card-elevated bg-bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-secondary text-fg-secondary text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Patient</th>
              <th className="text-left px-4 py-3">Urgency</th>
              <th className="text-left px-4 py-3">Facility</th>
              <th className="text-center px-4 py-3">Days Open</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3 text-fg-secondary text-xs">
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—'}
                </td>
                <td className="px-4 py-3 font-medium">{r.patient}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                    r.urgency === 'Emergency' ? 'bg-ghana-red text-white' :
                    r.urgency === 'Urgent' ? 'bg-orange-500/15 text-orange-400' :
                    'bg-ghana-green/15 text-ghana-green'
                  }`}>{r.urgency}</span>
                </td>
                <td className="px-4 py-3 text-fg-secondary">{r.facility}</td>
                <td className="px-4 py-3 text-center font-bold">{r.daysOpen ?? 0}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || ''}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {r.status === 'Sent' && (
                    <button onClick={() => updateStatus(r.id, 'Completed')}
                      className="text-xs text-ghana-green font-bold hover:underline">
                      Mark Complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
