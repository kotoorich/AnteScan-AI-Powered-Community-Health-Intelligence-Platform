import { useState } from 'react'
import { Download, FileText, Loader2, FileSpreadsheet, FileJson } from 'lucide-react'
import { useToast } from '../context/ToastContext.jsx'
import { api } from '../services/api.js'

const REPORTS = [
  {
    id: 'screenings-csv',
    name: 'All Screenings',
    description: 'Every patient screening with risk, module, and CHW attribution',
    icon: FileText, format: 'CSV',
    download: () => api.exportsAuth.screeningsCsv(),
    filename: 'antescan-screenings.csv',
  },
  {
    id: 'referrals-csv',
    name: 'All Referrals',
    description: 'Referral records with status, facility, and timing',
    icon: FileText, format: 'CSV',
    download: () => api.exportsAuth.referralsCsv(),
    filename: 'antescan-referrals.csv',
  },
  {
    id: 'chws-xlsx',
    name: 'CHW Performance Workbook',
    description: 'Excel workbook with CHW totals, regions, and last activity',
    icon: FileSpreadsheet, format: 'XLSX',
    download: () => api.exportsAuth.chwsXlsx(),
    filename: 'antescan-chws.xlsx',
  },
  {
    id: 'audit-csv',
    name: 'Audit Log Export',
    description: 'Full audit trail of system events',
    icon: FileJson, format: 'JSON',
    download: () => api.exportsAuth.auditJson(),
    filename: 'antescan-audit.json',
  },
]

export default function AdminExports() {
  const toast = useToast()
  const [busy, setBusy] = useState(null)

  const run = async (r) => {
    setBusy(r.id)
    try {
      const blob = await r.download()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = r.filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`${r.name} downloaded`)
    } catch (err) {
      toast.error(err.message || `Could not download ${r.name}`)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-ghana-gold mb-1">System</div>
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
          <Download className="w-7 h-7 text-ghana-gold" /> Export Center
        </h1>
        <p className="text-sm text-fg-secondary">Generate and download reports straight from the production database</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((r) => {
          const Icon = r.icon
          const isBusy = busy === r.id
          return (
            <div key={r.id} className="card-elevated bg-bg-card p-5 flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-ghana-gold/15 text-ghana-gold flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold leading-tight">{r.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-ghana-gold font-bold mt-1">{r.format}</div>
                </div>
              </div>
              <p className="text-xs text-fg-secondary flex-1 mb-3">{r.description}</p>
              <button onClick={() => run(r)} disabled={isBusy}
                className="btn-outline w-full flex items-center justify-center gap-2 text-sm disabled:opacity-50">
                {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {isBusy ? 'Preparing…' : 'Download'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
