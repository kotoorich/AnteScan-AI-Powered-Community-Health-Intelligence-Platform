import { useState, useEffect, useCallback } from 'react'
import { UserCog, Plus, Trash2, Shield, Loader2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../context/ToastContext.jsx'
import { api } from '../services/api.js'

const ROLE_COLORS = {
  'Super Admin': 'bg-ghana-red/15 text-ghana-red',
  'Regional Admin': 'bg-ghana-gold/15 text-yellow-700 dark:text-ghana-gold',
  'District Admin': 'bg-blue-500/15 text-blue-500',
  'Data Scientist': 'bg-purple-500/15 text-purple-500',
}
const ROLES = ['Super Admin', 'Regional Admin', 'District Admin', 'Data Scientist']

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.adminUsers.list()
      setUsers(r.items || [])
    } catch (err) {
      toast.error(err.message || 'Could not load admin users')
    } finally { setLoading(false) }
  }, [toast])

  useEffect(() => { load() }, [load])

  const deleteUser = async (id, name) => {
    if (!confirm(`Delete admin "${name}"? This cannot be undone.`)) return
    try {
      await api.adminUsers.delete(id)
      setUsers((p) => p.filter((u) => u.id !== id))
      toast.success('Admin deleted')
    } catch (e) { toast.error(e.message) }
  }

  const activeCount = users.filter((u) => u.status === 'Active' || !u.status).length

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-ghana-gold mb-1 flex items-center gap-1">
            <Shield className="w-3 h-3" /> Super Admin Only
          </div>
          <h1 className="font-display text-3xl font-extrabold flex items-center gap-2">
            <UserCog className="w-7 h-7 text-ghana-gold" /> Admin Users
          </h1>
          <p className="text-sm text-fg-secondary">
            {loading ? 'Loading…' : `${users.length} admin accounts · ${activeCount} active`}
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="btn-gold flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Admin
        </button>
      </div>

      {loading ? (
        <div className="card-elevated bg-bg-card p-12 flex justify-center text-fg-secondary">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="card-elevated bg-bg-card p-12 text-center text-fg-secondary">
          No admin users yet.
        </div>
      ) : (
        <div className="card-elevated bg-bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-secondary border-b border-border">
                <tr className="text-left">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Region</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-bg-secondary/50">
                    <td className="px-4 py-3 font-semibold">{u.name}</td>
                    <td className="px-4 py-3 text-fg-secondary">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${ROLE_COLORS[u.role] || 'bg-bg-secondary'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-fg-secondary">{u.region || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${u.status === 'Inactive' ? 'text-fg-tertiary' : 'text-success'}`}>
                        {u.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => deleteUser(u.id, u.name)}
                        className="p-1.5 rounded-md text-fg-tertiary hover:text-ghana-red hover:bg-ghana-red/10">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {open && <NewAdminModal onClose={() => setOpen(false)} onCreated={load} />}
      </AnimatePresence>
    </div>
  )
}

function NewAdminModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'District Admin', region: '', password: '' })
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) {
      return toast.error('Name, email, and password are required')
    }
    setSaving(true)
    try {
      await api.adminUsers.create(form)
      toast.success('Admin created')
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Could not create admin')
    } finally { setSaving(false) }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <motion.form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-bg-card rounded-2xl max-w-md w-full p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">New admin user</h2>
          <button type="button" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <input className="input" placeholder="Full name"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="input" placeholder="Email" type="email"
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <select className="input" value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {ROLES.map((r) => <option key={r}>{r}</option>)}
        </select>
        <input className="input" placeholder="Region (optional)"
          value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
        <input className="input" placeholder="Initial password" type="password"
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button type="submit" disabled={saving} className="btn-gold w-full">
          {saving ? 'Creating…' : 'Create admin'}
        </button>
      </motion.form>
    </motion.div>
  )
}
