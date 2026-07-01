import { useState } from 'react'
import { Building2, MapPin, Plus, Phone, Loader2 } from 'lucide-react'
import { useCompounds } from '../data/hooks.js'
import { api } from '../services/api.js'
import { useToast } from '../context/ToastContext.jsx'

export default function AdminCompounds() {
  const [view, setView] = useState('list')
  const { data, loading, error, refetch } = useCompounds()
  const toast = useToast()

  const compounds = data?.items || []

  const handleAddCompound = async () => {
    const name = prompt('Enter compound name:')
    if (!name) return
    const region = prompt('Region:')
    if (!region) return
    const district = prompt('District:')
    if (!district) return
    try {
      await api.compounds.create({ name, region, district })
      toast.success('Compound added')
      await refetch()
    } catch (err) {
      toast.error('Failed: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center text-fg-secondary">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading compounds…
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-ghana-red">Could not load compounds: {error.message}</div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-ghana-gold mb-1">CHWs</div>
          <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
            <Building2 className="w-7 h-7 text-ghana-gold" /> CHPS Compounds
          </h1>
          <p className="text-sm text-fg-secondary">{compounds.length} compounds managed</p>
        </div>
        <button onClick={handleAddCompound} className="btn-gold flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Compound
        </button>
      </div>

      <div className="flex gap-2">
        {['list', 'map'].map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`pill border capitalize ${view === v ? 'bg-ghana-gold text-black border-ghana-gold' : 'bg-bg-card border-border text-fg-secondary'}`}>
            {v} view
          </button>
        ))}
      </div>

      {view === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {compounds.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-ghana-gold/15 text-ghana-gold flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold truncate">{c.name}</div>
                  <div className="text-xs text-fg-secondary truncate">{c.district}, {c.region}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="bg-bg-secondary rounded-lg p-2 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">CHWs</div>
                  <div className="font-mono font-bold">{c.chws || 0}</div>
                </div>
                <div className="bg-bg-secondary rounded-lg p-2 text-center">
                  <div className="text-[10px] uppercase tracking-wider text-fg-tertiary">Patients</div>
                  <div className="font-mono font-bold">{c.patients || 0}</div>
                </div>
              </div>
              {c.phone && (
                <div className="flex items-center gap-1.5 mt-3 text-xs text-fg-secondary">
                  <Phone className="w-3.5 h-3.5" /> {c.phone}
                </div>
              )}
            </div>
          ))}
          {compounds.length === 0 && (
            <div className="col-span-full text-center text-fg-secondary py-8">
              No compounds found. Click "Add Compound" to create one.
            </div>
          )}
        </div>
      )}
      {view === 'map' && (
        <div className="card p-6">
          <div className="aspect-[16/9] rounded-xl bg-gradient-to-br from-ghana-green/10 to-bg-secondary flex items-center justify-center border border-border">
            <div className="text-center">
              <MapPin className="w-12 h-12 mx-auto text-ghana-gold mb-2" />
              <div className="font-display font-bold">Map view</div>
              <div className="text-xs text-fg-secondary">Interactive Leaflet view wired in Phase 2</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}