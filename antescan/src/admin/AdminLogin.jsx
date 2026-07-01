import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck, Eye, EyeOff, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { LoadingSpinner } from '../components/ui/Primitives.jsx'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { loginAdmin } = useAuth()
  const toast = useToast()
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await loginAdmin(email, password)
      toast.success('Welcome to Admin Portal')
      nav('/admin', { replace: true })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white relative overflow-hidden flex items-center justify-center p-6">
      {/* Decorative bg */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-ghana-red/40 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-ghana-gold/30 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] border border-ghana-gold/10 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-ghana-gold/10 rounded-full" />
      </div>

      <div className="absolute top-6 left-6">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-ghana-gold">
          <ArrowLeft className="w-3.5 h-3.5" /> CHW Mobile App
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-xl bg-ghana-gold items-center justify-center mb-4 shadow-gold-glow">
            <ShieldCheck className="w-7 h-7 text-black" />
          </div>
          <h1 className="font-display text-3xl font-extrabold">Admin Portal</h1>
          <p className="text-sm text-white/60 mt-1">Ghana Health Service · AnteScan</p>
        </div>

        <form onSubmit={submit} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-white/80 mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ghs.gov.gh"
              className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-ghana-gold focus:ring-2 focus:ring-ghana-gold/20"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-white/80 mb-1.5 block">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/40 focus:outline-none focus:border-ghana-gold"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60">
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-ghana-gold text-black font-bold rounded-xl py-3 hover:brightness-105 transition flex items-center justify-center gap-2">
            {loading ? <LoadingSpinner size="sm" /> : 'Sign In →'}
          </button>

          <div className="bg-ghana-gold/10 border border-ghana-gold/20 rounded-lg p-3 text-xs">
            <div className="font-bold text-ghana-gold uppercase tracking-wider mb-1">Demo credentials</div>
            <div className="text-white/80 space-y-0.5 font-mono">
              <div>Email: <span className="text-white">super@ghs.gov.gh</span></div>
              <div>Password: <span className="text-white">changeme123</span></div>
            </div>
          </div>
        </form>

        <div className="text-center text-[10px] text-white/30 mt-6 tracking-widest uppercase">
          Secure Connection · TLS 1.3
        </div>
      </motion.div>
    </div>
  )
}
