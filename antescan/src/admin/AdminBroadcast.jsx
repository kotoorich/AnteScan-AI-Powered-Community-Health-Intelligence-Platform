import { useState } from 'react'
import { Megaphone, Send, MessageSquare, Smartphone, Globe, Loader2 } from 'lucide-react'
import { useToast } from '../context/ToastContext.jsx'
import { useBroadcasts } from '../data/hooks.js'
import { api } from '../services/api.js'
import { GHANA_REGIONS } from '../data/mockData.js'

export default function AdminBroadcast() {
  const toast = useToast()
  const { data, loading, error, refetch } = useBroadcasts()
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    title: '', body: '', channel: 'both', audience: 'all', region: '',
    language: 'English', scheduled: '',
  })
  const set = (k, v) => setForm({ ...form, [k]: v })

  const sent = data?.items || []

  const handleSend = async () => {
    if (!form.title || !form.body) return toast.error('Title and body required')
    setSubmitting(true)
    try {
      await api.broadcasts.create({
        title: form.title,
        body: form.body,
        channel: form.channel,
        audience: form.audience,
        target_region: form.region,
        language: form.language,
        scheduledAt: form.scheduled || null,
      })
      toast.success('Broadcast sent successfully')
      await refetch()
      setForm({ title: '', body: '', channel: 'both', audience: 'all', region: '', language: 'English', scheduled: '' })
    } catch (err) {
      toast.error('Failed to send broadcast: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-ghana-gold mb-1">CHWs</div>
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
          <Megaphone className="w-7 h-7 text-ghana-gold" /> Broadcast Message
        </h1>
        <p className="text-sm text-fg-secondary">Send announcements to CHWs across regions, districts or individuals.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card p-6 space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Important: Malaria week starts Monday" />
          </div>
          <div>
            <label className="label">Message body *</label>
            <textarea className="input min-h-[140px]" value={form.body} onChange={(e) => set('body', e.target.value)} placeholder="Write your message…" />
            <div className="text-[10px] text-fg-tertiary mt-1">{form.body.length}/450 characters</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Channel</label>
              <select className="input" value={form.channel} onChange={(e) => set('channel', e.target.value)}>
                <option value="both">SMS + In-app</option>
                <option value="sms">SMS only</option>
                <option value="app">In-app only</option>
              </select>
            </div>
            <div>
              <label className="label">Language</label>
              <select className="input" value={form.language} onChange={(e) => set('language', e.target.value)}>
                <option>English</option><option>Twi</option><option>Ga</option><option>Ewe</option><option>Hausa</option>
              </select>
            </div>
            <div>
              <label className="label">Audience</label>
              <select className="input" value={form.audience} onChange={(e) => set('audience', e.target.value)}>
                <option value="all">All CHWs</option>
                <option value="region">By Region</option>
                <option value="district">By District</option>
                <option value="individual">Individual</option>
              </select>
            </div>
            {form.audience === 'region' && (
              <div>
                <label className="label">Region</label>
                <select className="input" value={form.region} onChange={(e) => set('region', e.target.value)}>
                  <option>Select…</option>{GHANA_REGIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="label">Schedule (optional)</label>
              <input className="input" type="datetime-local" value={form.scheduled} onChange={(e) => set('scheduled', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleSend} disabled={submitting} className="btn-gold flex items-center gap-2 ml-auto">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Sending…' : 'Send Broadcast'}
            </button>
          </div>
        </div>

        <div className="card p-5 space-y-4 h-fit">
          <div>
            <div className="text-xs uppercase tracking-wider text-fg-tertiary mb-2">Preview</div>
            <div className="border border-border rounded-xl p-4 bg-bg-secondary">
              <div className="flex items-center gap-2 text-xs text-fg-tertiary mb-1.5">
                <Smartphone className="w-3.5 h-3.5" /> AnteScan SMS / Push
              </div>
              <div className="font-semibold mb-1">{form.title || 'Title preview'}</div>
              <div className="text-sm text-fg-secondary">{form.body || 'Message body will appear here…'}</div>
            </div>
          </div>
          <div className="text-xs text-fg-tertiary">
            Recipients estimate: <span className="font-mono font-bold text-fg">
              {form.audience === 'all' ? '1,124' : form.audience === 'region' ? '~78' : form.audience === 'district' ? '~24' : '1'}
            </span> CHWs
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="font-display font-bold">Recent Broadcasts</h3>
        </div>
        {loading ? (
          <div className="p-6 text-center text-fg-secondary">
            <Loader2 className="w-5 h-5 animate-spin mx-auto" /> Loading…
          </div>
        ) : sent.length === 0 ? (
          <div className="p-6 text-center text-fg-secondary">No broadcasts yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary text-xs uppercase tracking-wider text-fg-tertiary">
              <tr>
                <th className="text-left px-5 py-3">Title</th>
                <th className="text-left px-5 py-3">When</th>
                <th className="text-right px-5 py-3">Recipients</th>
                <th className="text-right px-5 py-3">Read</th>
                <th className="text-right px-5 py-3">Open rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sent.map((s) => (
                <tr key={s.id} className="hover:bg-bg-secondary">
                  <td className="px-5 py-3 font-semibold">{s.title}</td>
                  <td className="px-5 py-3 text-fg-secondary">
                    {s.sentAt ? new Date(s.sentAt).toLocaleDateString() : 'Draft'}
                  </td>
                  <td className="px-5 py-3 text-right font-mono">{s.recipients || 0}</td>
                  <td className="px-5 py-3 text-right font-mono">{s.opens || 0}</td>
                  <td className="px-5 py-3 text-right font-mono font-bold text-success">
                    {s.recipients ? Math.round((s.opens || 0) / s.recipients * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}