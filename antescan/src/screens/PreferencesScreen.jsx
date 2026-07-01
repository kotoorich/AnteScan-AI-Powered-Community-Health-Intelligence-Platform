import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Bell, Wifi, Moon, Globe, Loader2 } from 'lucide-react'
import { api } from '../services/api.js'
import { useToast } from '../context/ToastContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'

function Switch({ checked, onChange, label, desc }) {
  return (
    <label className="flex items-start justify-between gap-3 py-3 cursor-pointer">
      <div>
        <div className="font-semibold text-sm">{label}</div>
        {desc && <div className="text-xs text-fg-secondary">{desc}</div>}
      </div>
      <button type="button" onClick={() => onChange(!checked)}
        className={`shrink-0 mt-1 w-11 h-6 rounded-full transition ${checked ? 'bg-ghana-gold' : 'bg-bg-secondary border border-border'}`}>
        <span className={`block w-5 h-5 bg-white rounded-full transform transition ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </label>
  )
}

export default function PreferencesScreen() {
  const nav = useNavigate()
  const toast = useToast()
  const { theme, setTheme } = useTheme()
  const [prefs, setPrefs] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.auth.getPreferences()
      .then(setPrefs)
      .catch(() => setPrefs({ language: 'en', notifications: {}, offlineSync: {} }))
  }, [])

  const save = async (next) => {
    setPrefs(next)
    setSaving(true)
    try { await api.auth.updatePreferences(next); toast.success('Saved') }
    catch (e) { toast.error(e.message); }
    finally { setSaving(false) }
  }

  if (!prefs) return (
    <div className="px-4 py-10 flex items-center justify-center text-fg-secondary">
      <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading preferences…
    </div>
  )

  return (
    <div className="space-y-4 pb-6 px-4 lg:px-0">
      <div className="flex items-center gap-2 -ml-2">
        <button onClick={() => nav(-1)} className="p-2 rounded-full hover:bg-bg-secondary">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-2xl font-extrabold">Preferences</h1>
        {saving && <Loader2 className="w-4 h-4 animate-spin text-ghana-gold ml-auto" />}
      </div>

      {/* Appearance */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="card-elevated bg-bg-card p-4">
        <div className="flex items-center gap-2 mb-2 text-ghana-gold font-bold text-xs uppercase tracking-wider">
          <Moon className="w-4 h-4" /> Appearance
        </div>
        <Switch label="Dark theme" desc="Reduces eye strain in low light"
          checked={theme === 'dark'} onChange={(v) => setTheme(v ? 'dark' : 'light')} />
      </motion.div>

      {/* Language */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="card-elevated bg-bg-card p-4">
        <div className="flex items-center gap-2 mb-2 text-ghana-gold font-bold text-xs uppercase tracking-wider">
          <Globe className="w-4 h-4" /> Language
        </div>
        <select className="input"
          value={prefs.language}
          onChange={(e) => save({ ...prefs, language: e.target.value })}>
          <option value="en">English</option>
          <option value="tw">Twi (Akan)</option>
          <option value="ga">Ga</option>
          <option value="ee">Ewe</option>
          <option value="ha">Hausa</option>
        </select>
        <p className="text-xs text-fg-secondary mt-2">Used for SMS messages and audio prompts.</p>
      </motion.div>

      {/* Notifications */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="card-elevated bg-bg-card p-4">
        <div className="flex items-center gap-2 mb-1 text-ghana-gold font-bold text-xs uppercase tracking-wider">
          <Bell className="w-4 h-4" /> Notifications
        </div>
        <Switch label="High-risk patient alerts"
          desc="Get notified when a screening produces a high or emergency risk"
          checked={prefs.notifications?.highRiskAlerts ?? true}
          onChange={(v) => save({ ...prefs, notifications: { ...prefs.notifications, highRiskAlerts: v } })} />
        <Switch label="SMS notifications"
          desc="Send referral confirmations to your phone"
          checked={prefs.notifications?.sms ?? true}
          onChange={(v) => save({ ...prefs, notifications: { ...prefs.notifications, sms: v } })} />
        <Switch label="Push notifications"
          desc="In-app banners and badges"
          checked={prefs.notifications?.push ?? true}
          onChange={(v) => save({ ...prefs, notifications: { ...prefs.notifications, push: v } })} />
      </motion.div>

      {/* Offline / Sync */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="card-elevated bg-bg-card p-4">
        <div className="flex items-center gap-2 mb-1 text-ghana-gold font-bold text-xs uppercase tracking-wider">
          <Wifi className="w-4 h-4" /> Offline & sync
        </div>
        <Switch label="Auto-sync when online"
          desc="Submit queued screenings as soon as the network returns"
          checked={prefs.offlineSync?.autoSync ?? true}
          onChange={(v) => save({ ...prefs, offlineSync: { ...prefs.offlineSync, autoSync: v } })} />
        <Switch label="Sync on Wi-Fi only"
          desc="Save mobile data — sync only over Wi-Fi"
          checked={prefs.offlineSync?.syncOnWifiOnly ?? false}
          onChange={(v) => save({ ...prefs, offlineSync: { ...prefs.offlineSync, syncOnWifiOnly: v } })} />
      </motion.div>
    </div>
  )
}
