import { motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Activity, Baby, Droplets, FileText, ChevronRight } from 'lucide-react'
import { timeAgo } from '../../data/dateUtils'

// === Risk Badge ===
const RISK_STYLES = {
  low: 'bg-success/15 text-success border-success/30',
  moderate: 'bg-ghana-gold/20 text-yellow-700 dark:text-ghana-gold border-ghana-gold/40',
  high: 'bg-ghana-red/15 text-ghana-red border-ghana-red/30',
  emergency: 'bg-emergency/20 text-emergency border-emergency/40 animate-emergency-pulse',
}
const RISK_LABEL = {
  low: '🟢 Low',
  moderate: '🟡 Moderate',
  high: '🔴 High',
  emergency: '🚨 Emergency',
}
export function RiskBadge({ risk, level, size = 'sm', score }) {
  const r = risk || level || 'low'
  const cls = RISK_STYLES[r] || RISK_STYLES.low
  return (
    <span className={`pill border ${cls} ${size === 'lg' ? 'text-sm px-4 py-1.5' : ''}`}>
      {RISK_LABEL[r] || RISK_LABEL.low}{score != null && ` · ${score}`}
    </span>
  )
}

// === Risk Score (large hero) ===
export function RiskScoreHero({ score = 0, risk = 'low', children }) {
  const styles = {
    low: 'from-success/20 to-success/5 text-success border-success/30',
    moderate: 'from-ghana-gold/20 to-ghana-gold/5 text-yellow-700 dark:text-ghana-gold border-ghana-gold/30',
    high: 'from-ghana-red/20 to-ghana-red/5 text-ghana-red border-ghana-red/30',
    emergency: 'from-emergency/30 to-emergency/10 text-emergency border-emergency/40 animate-emergency-pulse',
  }[risk]
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      className={`p-6 rounded-3xl border-2 bg-gradient-to-br ${styles} text-center`}
    >
      <div className="uppercase tracking-widest text-xs font-bold opacity-80">Risk Level</div>
      <div className="font-display text-3xl font-extrabold mt-1">{RISK_LABEL[risk]}</div>
      <div className="mt-3 text-5xl font-mono font-bold">{score}<span className="text-2xl opacity-60">/100</span></div>
      {children}
    </motion.div>
  )
}

// === Module Icon ===
export function ModuleIcon({ module, className = 'w-5 h-5' }) {
  const map = {
    ANC: <Activity className={className} />,
    NutriCheck: <Baby className={className} />,
    'Sickle Cell': <Droplets className={className} />,
    Referral: <FileText className={className} />,
  }
  return map[module] || <Activity className={className} />
}

// === Stat Card (MTN Airtime style) ===
export function StatCard({ title, value, accent = 'Open', icon: Icon, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="text-left p-4 rounded-2xl bg-bg-card border border-border hover:border-ghana-gold/40 transition-all w-full"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-fg-secondary">{title}</span>
        <ChevronRight className="w-4 h-4 text-fg-tertiary" />
      </div>
      <div className="flex items-center justify-between">
        <div className="font-display text-3xl font-bold text-fg">{value}</div>
        {Icon && <Icon className="w-8 h-8 text-fg-tertiary opacity-50" />}
      </div>
      <div className="mt-3 inline-flex items-center gap-1 bg-ghana-gold text-black text-xs font-bold px-3 py-1 rounded-full">
        {accent} →
      </div>
    </motion.button>
  )
}

// === Patient Card ===
const RISK_RING = {
  low: 'bg-success/20 text-success',
  moderate: 'bg-ghana-gold/20 text-yellow-700 dark:text-ghana-gold',
  high: 'bg-ghana-red/20 text-ghana-red',
  emergency: 'bg-emergency/20 text-emergency',
  none: 'bg-bg-secondary text-fg-tertiary',
}
export function PatientCard({ patient, onClick, compact = false }) {
  const risk = patient?.risk || 'none'
  const name = patient?.name || patient?.fullName || 'Unknown'
  const initials = name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`text-left w-full ${compact ? 'p-3' : 'p-4'} rounded-2xl bg-bg-card border border-border flex items-center gap-3 hover:border-ghana-gold/40 transition-all`}
    >
      <div className={`w-12 h-12 rounded-full ${RISK_RING[risk]} flex items-center justify-center font-bold`}>
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-fg truncate">{name}</div>
        <div className="text-xs text-fg-secondary truncate">
          {patient?.module || '—'} · {timeAgo(patient?.lastVisit)}
        </div>
      </div>
      <RiskBadge risk={risk === 'none' ? 'low' : risk} />
    </motion.button>
  )
}

// === Loading Spinner ===
export function LoadingSpinner({ size = 'md' }) {
  const sz = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'
  return (
    <svg className={`animate-spin ${sz} text-ghana-gold`} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M12 2 a 10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

// === Empty State ===
export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="text-center py-12 px-6">
      {Icon && (
        <div className="w-20 h-20 mx-auto rounded-full bg-bg-secondary flex items-center justify-center mb-4">
          <Icon className="w-10 h-10 text-fg-tertiary" />
        </div>
      )}
      <h3 className="font-display font-bold text-lg mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-fg-secondary mb-4">{subtitle}</p>}
      {action}
    </div>
  )
}

// === OTP Input (4 boxes) ===
export function OTPInput({ length = 4, onComplete }) {
  const [digits, setDigits] = useState(Array(length).fill(''))
  const refs = useRef([])

  const setDigit = (i, v) => {
    const clean = v.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = clean
    setDigits(next)
    if (clean && i < length - 1) refs.current[i + 1]?.focus()
    if (next.every((d) => d) && onComplete) onComplete(next.join(''))
  }
  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
  }

  return (
    <div className="flex justify-center gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={d}
          inputMode="numeric"
          maxLength={1}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          className="w-14 h-16 text-center text-2xl font-display font-bold bg-bg-secondary border border-border rounded-xl focus:outline-none focus:border-ghana-gold focus:ring-2 focus:ring-ghana-gold/20"
        />
      ))}
    </div>
  )
}
