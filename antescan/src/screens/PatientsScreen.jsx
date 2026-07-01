import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, UserPlus, Loader2 } from 'lucide-react'
import { PatientCard } from '../components/ui/Primitives.jsx'
import { usePatients } from '../data/hooks.js'

const MODULES = ['All', 'ANC', 'NutriCheck', 'Sickle Cell']
const RISK_LEVELS = ['All', 'low', 'moderate', 'high', 'emergency']

export default function PatientsScreen() {
  const nav = useNavigate()
  const [search, setSearch] = useState('')
  const [module, setModule] = useState('All')
  const [risk, setRisk] = useState('All')
  const { data, loading, error } = usePatients({ search, module })

  const items = data?.items || []

  // Client-side risk filtering (backend doesn't support risk param yet)
  const filteredByRisk = risk === 'All' 
    ? items 
    : items.filter(p => (p.risk || '').toLowerCase() === risk.toLowerCase())

  return (
    <div className="space-y-4 pb-6">
      <div className="px-4 lg:px-0 pt-2 flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-fg-tertiary" />
          <input
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="w-full pl-9 pr-3 py-2 bg-bg-card border border-border rounded-xl text-sm"
          />
        </div>
        <select
          value={module} 
          onChange={(e) => setModule(e.target.value)}
          className="bg-bg-card border border-border rounded-xl px-3 py-2 text-sm"
        >
          {MODULES.map(m => <option key={m}>{m}</option>)}
        </select>
        <select
          value={risk} 
          onChange={(e) => setRisk(e.target.value)}
          className="bg-bg-card border border-border rounded-xl px-3 py-2 text-sm"
        >
          {RISK_LEVELS.map(r => (
            <option key={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="px-4 lg:px-0">
        <button onClick={() => nav('/screen')}
          className="w-full card-elevated bg-ghana-gold text-black py-3 flex items-center justify-center gap-2 font-bold">
          <UserPlus className="w-4 h-4" /> Register new patient
        </button>
      </div>

      <div className="px-4 lg:px-0 space-y-2">
        {loading && (
          <div className="card-elevated bg-bg-card p-6 flex items-center justify-center gap-2 text-fg-secondary">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        )}
        {error && (
          <div className="card-elevated bg-ghana-red/10 border border-ghana-red/30 p-4 text-sm">
            Could not load patients: {error.message}
          </div>
        )}
        {!loading && !error && filteredByRisk.length === 0 && (
          <div className="card-elevated bg-bg-card p-6 text-center text-sm text-fg-secondary">
            {items.length === 0 ? (
              'No patients yet. Tap "Register new patient" to get started.'
            ) : (
              `No patients found with risk level: "${risk}". Try selecting "All".`
            )}
          </div>
        )}
        {filteredByRisk.map((p) => (
          <PatientCard key={p.id} patient={p} onClick={() => nav(`/patients/${p.id}`)} />
        ))}
        {data?.total > 0 && (
          <div className="text-xs text-center text-fg-tertiary pt-2">
            Showing {filteredByRisk.length} of {data.total} patients
            {risk !== 'All' && ` (filtered by risk: ${risk})`}
          </div>
        )}
      </div>
    </div>
  )
}