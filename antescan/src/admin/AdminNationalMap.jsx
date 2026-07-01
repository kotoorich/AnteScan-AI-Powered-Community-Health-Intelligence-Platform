import { useState } from 'react'
import { Map, Loader2 } from 'lucide-react'
import { useRegionBreakdown } from '../data/hooks.js'

/**
 * Ghana's 16 administrative regions (post-2019 reform), with approximate
 * relative pin positions on a stylised map (0-100 of container).
 */
const REGION_PINS = {
  'Greater Accra':  { x: 56, y: 82 },
  'Central':        { x: 42, y: 80 },
  'Western':        { x: 28, y: 78 },
  'Western North':  { x: 22, y: 65 },
  'Ashanti':        { x: 46, y: 60 },
  'Eastern':        { x: 60, y: 70 },
  'Volta':          { x: 78, y: 60 },
  'Oti':            { x: 74, y: 45 },
  'Bono':           { x: 32, y: 50 },
  'Bono East':      { x: 48, y: 45 },
  'Ahafo':          { x: 38, y: 55 },
  'Savannah':       { x: 46, y: 30 },
  'Northern':       { x: 56, y: 25 },
  'North East':     { x: 60, y: 18 },
  'Upper West':     { x: 38, y: 13 },
  'Upper East':     { x: 62, y: 10 },
}

const LAYER_COLOR = {
  alerts:   '#CE1126',
  patients: '#FCD116',
  chws:     '#006B3F',
}

export default function AdminNationalMap() {
  const [layer, setLayer] = useState('alerts')
  const { data, loading, error } = useRegionBreakdown()
  const regions = data?.items || []

  const values = regions.map((r) => r[layer] || 0)
  const max = Math.max(1, ...values)
  const total = values.reduce((a, b) => a + b, 0)
  const color = LAYER_COLOR[layer]

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-ghana-gold mb-1">Overview</div>
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
          <Map className="w-7 h-7 text-ghana-gold" /> National Health Map
        </h1>
        <p className="text-sm text-fg-secondary">
          {loading
            ? 'Loading…'
            : `Live distribution across Ghana's 16 regions — ${total.toLocaleString()} total ${layer}`}
        </p>
      </div>

      <div className="flex gap-2">
        {['alerts', 'patients', 'chws'].map((l) => (
          <button key={l} onClick={() => setLayer(l)}
            className={`pill border capitalize ${
              layer === l ? 'bg-ghana-gold text-black border-ghana-gold' : 'bg-bg-card border-border text-fg-secondary'
            }`}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card-elevated bg-bg-card p-12 flex justify-center text-fg-secondary">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="card-elevated bg-bg-card p-8 text-center text-ghana-red">
          Could not load region data.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card-elevated bg-bg-card p-6">
            <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-ghana-green/10 via-bg-secondary to-ghana-gold/5 relative overflow-hidden border border-border">
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <defs>
                  <pattern id="topo" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor"
                          strokeWidth="0.5" className="text-fg-tertiary opacity-20" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#topo)" />
              </svg>

              {regions.map((r) => {
                const pin = REGION_PINS[r.region]
                if (!pin) return null
                const v = r[layer] || 0
                // Pin size scales with value (min 6px, max 22px)
                const size = v === 0 ? 8 : 8 + Math.round((v / max) * 14)
                const opacity = v === 0 ? 0.3 : 1
                return (
                  <div key={r.region}
                    style={{ left: pin.x + '%', top: pin.y + '%' }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group">
                    <div
                      style={{
                        width: size + 'px', height: size + 'px',
                        background: color, opacity,
                        boxShadow: `0 0 0 4px ${color}33`,
                      }}
                      className={`rounded-full ${v > 0 ? 'animate-pulse' : ''}`}
                    />
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 bg-bg-card text-[10px] font-bold rounded whitespace-nowrap shadow opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                      {r.region}: {v}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="text-[10px] text-fg-tertiary text-center mt-3">
              Hover a pin for region detail. Pin size = relative {layer} count.
            </div>
          </div>

          <div className="card-elevated bg-bg-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-display font-bold">Region Breakdown</h3>
              <div className="text-[10px] uppercase tracking-wider text-fg-tertiary font-bold mt-0.5">
                All 16 regions
              </div>
            </div>
            <div className="overflow-y-auto pretty-scroll max-h-[500px] divide-y divide-border">
              {regions.map((r) => {
                const v = r[layer] || 0
                return (
                  <div key={r.region} className="px-4 py-3 hover:bg-bg-secondary">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{r.region}</span>
                      <span className="text-xs font-mono text-fg-tertiary">{v}</span>
                    </div>
                    <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: max > 0 ? Math.max(2, (v / max) * 100) + '%' : '2%', background: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
