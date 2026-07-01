import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronLeft, Camera, Trash2, Loader2, Save, Lock } from 'lucide-react'
import { api } from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { LoadingSpinner } from '../components/ui/Primitives.jsx'
import Avatar from '../components/ui/Avatar.jsx'

export default function ProfileScreen() {
  const nav = useNavigate()
  const { user, setUserOverride, refresh } = useAuth()
  const toast = useToast()
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    language: user?.language || 'English',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const onAvatarPicked = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 2 * 1024 * 1024) return toast.error('Image must be under 2 MB')
    setUploading(true)
    try {
      const r = await api.auth.uploadAvatar(f)
      setUserOverride?.(r.user)
      await refresh?.()
      toast.success('Avatar updated')
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onRemoveAvatar = async () => {
    setUploading(true)
    try {
      const r = await api.auth.deleteAvatar()
      setUserOverride?.(r.user)
      await refresh?.()
      toast.success('Avatar removed')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (pwOpen) {
      if (form.newPassword !== form.confirmPassword)
        return toast.error('Passwords do not match')
      if (form.newPassword.length < 6)
        return toast.error('Password must be at least 6 characters')
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name, language: form.language,
        ...(user?.kind === 'chw' ? { phone: form.phone } : { email: form.email }),
        ...(pwOpen ? { currentPassword: form.currentPassword, newPassword: form.newPassword } : {}),
      }
      const r = await api.auth.updateProfile(payload)
      setUserOverride?.(r.user)
      await refresh?.()   // re-fetch /me so every consumer is canonically synced
      toast.success('Profile saved')
      setForm((f) => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }))
      setPwOpen(false)
    } catch (err) {
      toast.error(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const initials = (form.name || 'U').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()
  const avatarBase = import.meta.env.PROD ? '' : ''  // proxy handles it

  return (
    <div className="space-y-4 pb-6 px-4 lg:px-0">
      <div className="flex items-center gap-2 -ml-2">
        <button onClick={() => nav(-1)} className="p-2 rounded-full hover:bg-bg-secondary">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-2xl font-extrabold">My Profile</h1>
      </div>

      {/* Avatar card */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        className="card-elevated bg-bg-card p-5 flex items-center gap-4">
        <div className="relative">
          <Avatar url={user?.avatarUrl} name={user?.name} size={80}
            ringClass="border-2 border-ghana-gold" />
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-ghana-gold" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{form.name || 'Your name'}</div>
          <div className="text-xs text-fg-secondary truncate">
            {user?.kind === 'chw' ? `CHW · ${user?.chwId}` : `Admin · ${user?.role}`}
          </div>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full bg-ghana-gold text-black font-bold">
              <Camera className="w-3.5 h-3.5" /> Change photo
            </button>
            {user?.avatarUrl && (
              <button type="button" onClick={onRemoveAvatar}
                className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full bg-bg-secondary text-fg-secondary">
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp"
            onChange={onAvatarPicked} className="hidden" />
        </div>
      </motion.div>

      {/* Profile form */}
      <form onSubmit={onSubmit} className="card-elevated bg-bg-card p-5 space-y-4">
        <div>
          <label className="label">Full Name</label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        {user?.kind === 'chw' ? (
          <>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="024xxxxxxx" />
            </div>
            <div>
              <label className="label">Language</label>
              <select className="input" value={form.language} onChange={(e) => set('language', e.target.value)}>
                <option>English</option><option>Twi</option><option>Ga</option><option>Ewe</option><option>Hausa</option>
              </select>
            </div>
          </>
        ) : (
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </div>
        )}

        {/* Password change toggle */}
        <button type="button" onClick={() => setPwOpen(!pwOpen)}
          className="text-sm flex items-center gap-2 text-ghana-gold font-bold">
          <Lock className="w-4 h-4" /> {pwOpen ? 'Cancel password change' : 'Change password'}
        </button>
        {pwOpen && (
          <div className="space-y-3 pt-1">
            <input className="input" type="password" placeholder="Current password"
              value={form.currentPassword} onChange={(e) => set('currentPassword', e.target.value)} />
            <input className="input" type="password" placeholder="New password (≥ 6 chars)"
              value={form.newPassword} onChange={(e) => set('newPassword', e.target.value)} />
            <input className="input" type="password" placeholder="Confirm new password"
              value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} />
          </div>
        )}

        <button type="submit" disabled={saving}
          className="btn-gold w-full flex items-center justify-center gap-2">
          {saving ? <LoadingSpinner size="sm" /> : <><Save className="w-4 h-4" /> Save changes</>}
        </button>
      </form>

      {/* Danger zone */}
      <DangerZone />
    </div>
  )
}

function DangerZone() {
  const nav = useNavigate()
  const { logout } = useAuth()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)

  const handleDelete = async () => {
    if (!pw) return toast.error('Enter your password to confirm')
    if (!confirm('Permanently deactivate your account? This cannot be undone from the app.')) return
    setBusy(true)
    try {
      await api.auth.deleteAccount(pw)
      toast.success('Account deactivated')
      logout()
      nav('/login', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Could not delete account')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card-elevated bg-ghana-red/5 border border-ghana-red/30 p-5 space-y-3">
      <div>
        <div className="font-bold text-ghana-red flex items-center gap-2">
          <Trash2 className="w-4 h-4" /> Danger zone
        </div>
        <p className="text-xs text-fg-secondary mt-1">
          Deleting your account deactivates login and removes your personal data.
          Patient records you created stay in the system (attribution is preserved
          for clinical continuity) but you will no longer be able to access them.
        </p>
      </div>
      {!open ? (
        <button onClick={() => setOpen(true)}
          className="btn-outline w-full text-ghana-red border-ghana-red/40 hover:bg-ghana-red/10 text-sm">
          Delete my account
        </button>
      ) : (
        <div className="space-y-2">
          <input className="input" type="password" placeholder="Confirm your password"
            value={pw} onChange={(e) => setPw(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={() => { setOpen(false); setPw('') }}
              className="flex-1 btn-outline text-sm">Cancel</button>
            <button onClick={handleDelete} disabled={busy}
              className="flex-1 py-2 px-4 rounded-full bg-ghana-red text-white text-sm font-bold disabled:opacity-50">
              {busy ? 'Deleting…' : 'Permanently delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
