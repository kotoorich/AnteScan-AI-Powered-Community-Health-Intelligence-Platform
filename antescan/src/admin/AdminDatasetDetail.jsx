import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, FileText, Columns3, Eye, Activity, Loader2, AlertCircle } from 'lucide-react'
import { useDataset } from '../data/hooks.js'
import { api } from '../services/api.js'

export default function AdminDatasetDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { data, loading, error } = useDataset(id)
  const [tab, setTab] = useState('overview')
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    if (tab === 'preview' && id && !preview) {
      setPreviewLoading(true)
      api.datasets.preview(id)
        .then((p) => setPreview(p))
        .catch((e) => setPreview({ error: e.message }))
        .finally(() => setPreviewLoading(false))
    }
  }, [tab, id, preview])

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-fg-secondary">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading dataset…
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="p-6 text-fg-secondary">
        <AlertCircle className="w-5 h-5 text-ghana-red mb-2" />
        Dataset not found: {error?.message || id}
        <button onClick={() => nav('/admin/datasets')} className="block mt-3 text-ghana-gold underline text-sm">
          Back to datasets
        </button>
      </div>
    )
  }

  const TABS = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'columns', label: `Columns (${data.columns?.length || 0})`, icon: Columns3 },
    { id: 'preview', label: 'Data preview', icon: Eye },
    { id: 'quality', label: 'Quality', icon: Activity },
  ]

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <button onClick={() => nav('/admin/datasets')} className="text-sm text-fg-secondary flex items-center gap-1.5">
        <ArrowLeft className="w-4 h-4" /> Back to datasets
      </button>

      <div className="card-elevated bg-bg-card p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-ghana-gold font-bold">
              {data.code} · v{data.version} · {data.module}
            </div>
            <h1 className="text-xl font-display font-bold">{data.name}</h1>
            <p className="text-sm text-fg-secondary mt-1">{data.description}</p>
            <div className="text-xs text-fg-tertiary mt-2">
              Source: {data.source}
              {data.sourceUrl && (
                <a href={data.sourceUrl} target="_blank" rel="noreferrer"
                   className="ml-2 text-ghana-gold underline">View original</a>
              )}
            </div>
          </div>
          {data.downloadable && (
            <button onClick={() => api.datasets.download(data.id, data.code + '.zip').catch((err) => alert('Download failed: ' + err.message))}
                    className="btn-primary inline-flex items-center gap-2 self-start">
              <Download className="w-4 h-4" /> Download
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 lg:grid-cols-5 gap-2 mt-4 text-center text-xs">
          <Stat label="Rows" value={data.rows?.toLocaleString() || '—'} />
          <Stat label="Columns" value={data.columns?.length ?? data.columnsCount ?? '—'} />
          <Stat label="Size" value={data.size || '—'} />
          <Stat label="Format" value={data.fileType || '—'} />
          <Stat label="Quality" value={data.qualityScore != null ? `${Math.round(data.qualityScore * 100)}%` : '—'} />
        </div>
      </div>

      <div className="flex gap-1 bg-bg-card border border-border rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button key={tid} onClick={() => setTab(tid)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap ${tab === tid ? 'bg-ghana-gold text-black' : 'text-fg-secondary'}`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="card-elevated bg-bg-card p-4 text-sm space-y-3">
          <div><strong>Uploaded by:</strong> {data.uploadedBy}</div>
          <div><strong>Uploaded at:</strong> {data.uploadedAt ? new Date(data.uploadedAt).toLocaleString() : '—'}</div>
          <div><strong>Files:</strong> {data.files?.join(', ') || '—'}</div>
          <div><strong>Status:</strong> {data.status}</div>
        </div>
      )}

      {tab === 'columns' && (
        <div className="card-elevated bg-bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary text-xs uppercase tracking-wider text-fg-secondary">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Label</th>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-right px-4 py-2">Nulls</th>
                <th className="text-right px-4 py-2">Unique</th>
              </tr>
            </thead>
            <tbody>
              {(data.columns || []).map((c) => (
                <tr key={c.name} className="border-t border-border">
                  <td className="px-4 py-2 font-mono text-xs">{c.name}</td>
                  <td className="px-4 py-2 text-fg-secondary truncate max-w-xs">{c.label || '—'}</td>
                  <td className="px-4 py-2"><span className="text-[10px] uppercase tracking-wider text-ghana-gold">{c.type}</span></td>
                  <td className="px-4 py-2 text-right">{c.nulls}</td>
                  <td className="px-4 py-2 text-right">{c.unique}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'preview' && (
        <div className="card-elevated bg-bg-card overflow-x-auto">
          {previewLoading && (
            <div className="p-6 flex items-center gap-2 text-fg-secondary">
              <Loader2 className="w-4 h-4 animate-spin" /> Parsing first 30 rows…
            </div>
          )}
          {preview?.error && <div className="p-4 text-sm text-ghana-red">{preview.error}</div>}
          {preview?.rows?.length > 0 && (
            <table className="w-full text-xs">
              <thead className="bg-bg-secondary">
                <tr>
                  {Object.keys(preview.rows[0]).slice(0, 12).map((k) => (
                    <th key={k} className="text-left px-3 py-2 font-mono">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    {Object.entries(row).slice(0, 12).map(([k, v]) => (
                      <td key={k} className="px-3 py-2 text-fg-secondary">{String(v ?? '').slice(0, 40)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {preview && !preview.rows?.length && !preview.error && (
            <div className="p-4 text-sm text-fg-secondary">No preview available.</div>
          )}
        </div>
      )}

      {tab === 'quality' && (
        <div className="card-elevated bg-bg-card p-4">
          <div className="text-3xl font-display font-bold mb-2 text-ghana-gold">
            {data.qualityScore != null ? `${Math.round(data.qualityScore * 100)}%` : '—'}
          </div>
          <div className="text-sm text-fg-secondary mb-3">Overall data quality score</div>
          {data.qualityIssues?.length > 0 ? (
            <ul className="space-y-1.5 text-sm">
              {data.qualityIssues.map((i, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-ghana-gold mt-0.5 shrink-0" />
                  <span className="text-fg-secondary">{i}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-ghana-green">No quality issues detected.</div>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-fg-tertiary uppercase tracking-wider">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  )
}
