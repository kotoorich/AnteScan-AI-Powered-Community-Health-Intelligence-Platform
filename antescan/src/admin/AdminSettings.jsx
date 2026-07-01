import { useState, useEffect } from 'react'
import { Settings, MessageSquare, AlertTriangle, Shield, Save, Loader2 } from 'lucide-react'
import { useToast } from '../context/ToastContext.jsx'
import { useSettings } from '../data/hooks.js'
import { api } from '../services/api.js'

const SECTIONS = [
  { key: 'sms', label: 'SMS Gateway', icon: MessageSquare },
  { key: 'thresholds', label: 'Risk Thresholds', icon: AlertTriangle },
  { key: 'security', label: 'Security', icon: Shield },
]

export default function AdminSettings() {
  const toast = useToast()
  const [section, setSection] = useState('sms')
  const { data, loading, error, refetch } = useSettings()

  const [sms, setSms] = useState({})
  const [thr, setThr] = useState({})
  const [sec, setSec] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data) {
      setSms(data.sms || {})
      setThr(data.thresholds || {})
      setSec(data.security || {})
    }
  }, [data])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        sms: sms,
        thresholds: thr,
        security: sec,
      }
      // Save each section separately
      for (const [sectionKey, values] of Object.entries(payload)) {
        await api.settings.update(sectionKey, values)
      }
      toast.success('Settings saved')
      await refetch()
    } catch (err) {
      toast.error('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center text-fg-secondary">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading settings…
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-ghana-red">Could not load settings: {error.message}</div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-ghana-gold mb-1">System</div>
        <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
          <Settings className="w-7 h-7 text-ghana-gold" /> System Settings
        </h1>
        <p className="text-sm text-fg-secondary">Configure platform behavior, thresholds, and security policies</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="card p-2 h-fit space-y-0.5">
          {SECTIONS.map((s) => {
            const Icon = s.icon
            return (
              <button key={s.key} onClick={() => setSection(s.key)}
                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium ${
                  section === s.key ? 'bg-ghana-gold/15 text-ghana-gold' : 'text-fg-secondary hover:bg-bg-secondary'
                }`}>
                <Icon className="w-4 h-4" /> {s.label}
              </button>
            )
          })}
        </div>

        <div className="lg:col-span-3 card p-6 space-y-4">
          {section === 'sms' && (
            <>
              <div>
                <h3 className="font-display font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4" /> SMS Gateway</h3>
                <p className="text-xs text-fg-secondary">Outbound SMS configuration for referrals, alerts and grandmother network</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Provider</label>
                  <select className="input" value={sms.provider || ''} onChange={(e) => setSms({ ...sms, provider: e.target.value })}>
                    <option value="Africa's Talking">Africa's Talking</option>
                    <option value="Twilio">Twilio</option>
                    <option value="Hubtel">Hubtel</option>
                  </select>
                </div>
                <div>
                  <label className="label">Sender ID</label>
                  <input className="input" value={sms.sender_id || ''} onChange={(e) => setSms({ ...sms, sender_id: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <label className="label">API Key</label>
                  <input className="input font-mono" value={sms.api_key || ''} onChange={(e) => setSms({ ...sms, api_key: e.target.value })} />
                </div>
                <div>
                  <label className="label">Fallback provider</label>
                  <select className="input" value={sms.fallback || ''} onChange={(e) => setSms({ ...sms, fallback: e.target.value })}>
                    <option value="Twilio">Twilio</option>
                    <option value="Hubtel">Hubtel</option>
                    <option value="None">None</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {section === 'thresholds' && (
            <>
              <div>
                <h3 className="font-display font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Risk Thresholds</h3>
                <p className="text-xs text-fg-secondary">Clinical cut-offs used by the rule-based fallback and risk classifier</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">BP Systolic — Severe (mmHg)</label>
                  <input className="input" type="number" value={thr.bp_systolic_severe || 160} onChange={(e) => setThr({ ...thr, bp_systolic_severe: +e.target.value })} />
                </div>
                <div>
                  <label className="label">BP Systolic — Elevated (mmHg)</label>
                  <input className="input" type="number" value={thr.bp_systolic_elevated || 140} onChange={(e) => setThr({ ...thr, bp_systolic_elevated: +e.target.value })} />
                </div>
                <div>
                  <label className="label">BP Diastolic — Severe</label>
                  <input className="input" type="number" value={thr.bp_diastolic_severe || 110} onChange={(e) => setThr({ ...thr, bp_diastolic_severe: +e.target.value })} />
                </div>
                <div>
                  <label className="label">BP Diastolic — Elevated</label>
                  <input className="input" type="number" value={thr.bp_diastolic_elevated || 90} onChange={(e) => setThr({ ...thr, bp_diastolic_elevated: +e.target.value })} />
                </div>
                <div>
                  <label className="label">MUAC — SAM (mm)</label>
                  <input className="input" type="number" value={thr.muac_sam || 115} onChange={(e) => setThr({ ...thr, muac_sam: +e.target.value })} />
                </div>
                <div>
                  <label className="label">MUAC — MAM (mm)</label>
                  <input className="input" type="number" value={thr.muac_mam || 125} onChange={(e) => setThr({ ...thr, muac_mam: +e.target.value })} />
                </div>
                <div>
                  <label className="label">Risk Score — Emergency</label>
                  <input className="input" type="number" value={thr.risk_emergency || 80} onChange={(e) => setThr({ ...thr, risk_emergency: +e.target.value })} />
                </div>
                <div>
                  <label className="label">Risk Score — High</label>
                  <input className="input" type="number" value={thr.risk_high || 60} onChange={(e) => setThr({ ...thr, risk_high: +e.target.value })} />
                </div>
              </div>
            </>
          )}

          {section === 'security' && (
            <>
              <div>
                <h3 className="font-display font-bold flex items-center gap-2"><Shield className="w-4 h-4" /> Security</h3>
                <p className="text-xs text-fg-secondary">Authentication and access policies</p>
              </div>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-3 bg-bg-secondary rounded-xl cursor-pointer">
                  <div>
                    <div className="font-semibold">Two-Factor Authentication</div>
                    <div className="text-xs text-fg-secondary">Require 2FA for all admin accounts</div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={sec.twofa_enabled || false} 
                    onChange={(e) => setSec({ ...sec, twofa_enabled: e.target.checked })}
                    className="w-12 h-6 appearance-none bg-fg-tertiary checked:bg-success rounded-full relative cursor-pointer transition before:absolute before:left-0.5 before:top-0.5 before:w-5 before:h-5 before:bg-white before:rounded-full before:transition checked:before:translate-x-6" 
                  />
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Session timeout (minutes)</label>
                    <input className="input" type="number" value={sec.session_timeout_minutes || 30} onChange={(e) => setSec({ ...sec, session_timeout_minutes: +e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Force password rotation (days)</label>
                    <input className="input" type="number" value={sec.force_password_rotation_days || 90} onChange={(e) => setSec({ ...sec, force_password_rotation_days: +e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="label">IP Allowlist (CIDR, one per line)</label>
                    <textarea className="input min-h-[100px] font-mono" placeholder="10.0.0.0/8&#10;192.168.0.0/16"
                      value={sec.ip_allowlist || ''} onChange={(e) => setSec({ ...sec, ip_allowlist: e.target.value })} />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="pt-4 border-t border-border flex justify-end">
            <button onClick={handleSave} disabled={saving} className="btn-gold flex items-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}