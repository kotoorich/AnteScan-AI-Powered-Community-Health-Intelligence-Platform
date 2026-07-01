import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, Download, Upload, Search, AlertCircle, Loader2, CheckCircle2, FileArchive } from 'lucide-react'
import { useDatasets } from '../data/hooks.js'
import { api } from '../services/api.js'

const MODULE_COLORS = {
  ANC: 'bg-ghana-red/15 text-ghana-red',
  NutriCheck: 'bg-ghana-green/15 text-ghana-green',
  'Sickle Cell': 'bg-purple-500/15 text-purple-400',
  Voice: 'bg-blue-500/15 text-blue-400',
  Unassigned: 'bg-gray-500/15 text-gray-400',
}

export default function AdminDatasetManager() {
  const nav = useNavigate()
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const { data, loading, error, refetch } = useDatasets()

  const items = (data?.items || []).filter((d) =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code.toLowerCase().includes(search.toLowerCase())
  )

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('module', 'Unassigned')
      await api.datasets.upload(form)
      await refetch()
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className="space-y-5 p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Database className="w-6 h-6 text-ghana-gold" /> Dataset Manager
          </h1>
          <p className="text-sm text-fg-secondary">
            Real datasets powering all AI screening — view, download, or upload new training data.
          </p>
        </div>
        <label className={`btn-primary inline-flex items-center gap-2 cursor-pointer ${uploading ? 'opacity-60' : ''}`}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading & parsing…' : 'Upload dataset'}
          <input type="file" hidden onChange={handleUpload} disabled={uploading}
                 accept=".zip,.sav,.csv,.dat,.xlsx" />
        </label>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 w-4 h-4 text-fg-tertiary" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search datasets…"
          className="w-full pl-9 pr-3 py-2.5 bg-bg-card border border-border rounded-xl text-sm" />
      </div>

      {loading && (
        <div className="card-elevated bg-bg-card p-8 flex items-center justify-center gap-2 text-fg-secondary">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading from API…
        </div>
      )}
      {error && (
        <div className="card-elevated bg-ghana-red/10 border border-ghana-red/30 p-4 text-sm flex gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>Could not load datasets: {error.message}.<br/>
          Check that the backend is running on the configured base URL.</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {items.map((d) => (
          <div key={d.id}
               onClick={() => nav(`/admin/datasets/${d.id}`)}
               className="card-elevated bg-bg-card p-4 cursor-pointer hover:border-ghana-gold/50 border border-transparent transition">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-ghana-gold/10 flex items-center justify-center">
                <FileArchive className="w-5 h-5 text-ghana-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold leading-tight truncate">{d.name}</div>
                <div className="text-[10px] uppercase tracking-wider text-fg-tertiary font-bold">
                  {d.code} · {d.version}
                </div>
              </div>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${MODULE_COLORS[d.module] || MODULE_COLORS.Unassigned}`}>
                {d.module}
              </span>
            </div>

            <p className="text-xs text-fg-secondary line-clamp-2 mb-3">{d.description}</p>

            <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
              <div>
                <div className="text-fg-tertiary">Rows</div>
                <div className="font-bold">{d.rows?.toLocaleString() || '—'}</div>
              </div>
              <div>
                <div className="text-fg-tertiary">Columns</div>
                <div className="font-bold">{d.columns || '—'}</div>
              </div>
              <div>
                <div className="text-fg-tertiary">Size</div>
                <div className="font-bold">{d.size}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-1 text-xs">
                {d.status === 'Active' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-ghana-green" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-ghana-gold" />
                )}
                <span className="text-fg-secondary">{d.status}</span>
              </div>
              {d.downloadable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    api.datasets.download(d.id, d.code + '.zip').catch((err) => alert('Download failed: ' + err.message))
                  }}
                  className="text-xs flex items-center gap-1 text-ghana-gold font-bold hover:underline">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {data?.total > 0 && (
        <div className="text-xs text-center text-fg-tertiary">
          {items.length} of {data.total} datasets · sourced from DHS Program, UNICEF MICS6, WHO, GHS
        </div>
      )}
    </div>
  )
}
