import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import GhanaIllustration from '../components/ui/GhanaIllustration.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function SplashScreen() {
  const nav = useNavigate()
  const { isAuthenticated, isAdmin, needsOnboarding } = useAuth()

  useEffect(() => {
    const t = setTimeout(() => {
      if (isAuthenticated) {
        nav(isAdmin ? '/admin' : '/home', { replace: true })
      } else if (needsOnboarding?.()) {
        nav('/onboarding', { replace: true })
      } else {
        nav('/login', { replace: true })
      }
    }, 2400)
    return () => clearTimeout(t)
  }, [nav, isAuthenticated, isAdmin, needsOnboarding])

  return (
    <div className="min-h-screen bg-gradient-to-b from-bg via-bg-secondary to-bg flex flex-col items-center justify-center px-6 safe-top safe-bottom">
      <GhanaIllustration size={280} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="text-center mt-2"
      >
        <h1 className="font-display text-5xl font-extrabold tracking-tight bg-gradient-to-r from-ghana-gold via-amber-400 to-ghana-red bg-clip-text text-transparent">
          AnteScan
        </h1>
        <p className="mt-2 text-sm text-fg-secondary">Community Health Intelligence · Ghana</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="mt-12 flex items-center gap-2 text-xs text-fg-tertiary"
      >
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-ghana-red animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-ghana-gold animate-pulse" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-ghana-green animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
        <span>Loading…</span>
      </motion.div>
    </div>
  )
}
