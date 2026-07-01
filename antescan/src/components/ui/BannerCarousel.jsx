import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Heart, Activity, Baby, Droplets } from 'lucide-react'

/**
 * Ghana-themed health education banners — app content, not mock data.
 * Inline SVG illustrations, no external images.
 *
 * Stable crossfade implementation: every slide is rendered, opacity toggles.
 * This avoids the framer-motion AnimatePresence/removeChild race condition.
 */
const SLIDES = [
  {
    title: 'ANTENATAL CARE',
    subtitle: 'Pregnant women need at least 8 ANC visits',
    cta: 'Screen now',
    href: '/screen/antenatal',
    bg: 'from-ghana-red/30 via-ghana-red/20 to-ghana-gold/20',
    icon: Heart, illustration: 'mother',
  },
  {
    title: 'CHILD NUTRITION',
    subtitle: 'MUAC ≥ 12.5 cm means healthy. Below 11.5 cm is severe.',
    cta: 'Check growth',
    href: '/screen/nutricheck',
    bg: 'from-ghana-green/30 via-ghana-green/20 to-ghana-gold/20',
    icon: Baby, illustration: 'child',
  },
  {
    title: 'SICKLE CELL AWARENESS',
    subtitle: 'Early detection saves lives. Test every newborn.',
    cta: 'Learn more',
    href: '/screen/sickle',
    bg: 'from-purple-500/30 via-ghana-red/20 to-ghana-gold/20',
    icon: Droplets, illustration: 'lab',
  },
  {
    title: 'GRANDMOTHER NETWORK',
    subtitle: 'Family elders get SMS alerts for high-risk patients',
    cta: 'View patients',
    href: '/patients',
    bg: 'from-ghana-gold/30 via-amber-500/20 to-ghana-red/20',
    icon: Activity, illustration: 'sms',
  },
]

function Illustration({ kind }) {
  if (kind === 'mother') {
    return (
      <svg viewBox="0 0 100 100" className="absolute right-3 bottom-0 w-28 h-28 opacity-70 pointer-events-none">
        <ellipse cx="50" cy="40" rx="12" ry="14" fill="#A0522D" />
        <path d="M 38 30 Q 50 16 62 30 Q 60 22 50 18 Q 40 22 38 30Z" fill="#CE1126" />
        <path d="M 28 95 L 32 60 Q 50 55 68 60 L 72 95 Z" fill="#FCD116" />
        <rect x="28" y="68" width="44" height="3" fill="#000" opacity="0.2" />
        <rect x="28" y="78" width="44" height="3" fill="#000" opacity="0.2" />
      </svg>
    )
  }
  if (kind === 'child') {
    return (
      <svg viewBox="0 0 100 100" className="absolute right-3 bottom-0 w-24 h-24 opacity-70 pointer-events-none">
        <circle cx="50" cy="42" r="14" fill="#A0522D" />
        <circle cx="46" cy="42" r="1.5" fill="#1a1a1a" />
        <circle cx="54" cy="42" r="1.5" fill="#1a1a1a" />
        <path d="M 46 49 Q 50 52 54 49" stroke="#3d2818" fill="none" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 36 95 L 38 70 Q 50 65 62 70 L 64 95 Z" fill="#006B3F" />
      </svg>
    )
  }
  if (kind === 'lab') {
    return (
      <svg viewBox="0 0 100 100" className="absolute right-4 bottom-0 w-24 h-24 opacity-70 pointer-events-none">
        <path d="M 40 25 H 60 V 50 L 70 80 Q 50 90 30 80 L 40 50 Z" fill="rgba(255,255,255,0.15)" stroke="#FCD116" strokeWidth="2" />
        <circle cx="50" cy="72" r="2.5" fill="#CE1126" />
        <circle cx="45" cy="76" r="2" fill="#CE1126" />
        <circle cx="55" cy="76" r="2" fill="#CE1126" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 100 100" className="absolute right-3 bottom-0 w-24 h-24 opacity-70 pointer-events-none">
      <rect x="30" y="35" width="40" height="28" rx="4" fill="rgba(255,255,255,0.15)" stroke="#FCD116" strokeWidth="2" />
      <path d="M 30 35 L 50 50 L 70 35" stroke="#FCD116" fill="none" strokeWidth="2" />
      <circle cx="75" cy="30" r="6" fill="#CE1126" />
      <text x="75" y="34" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold">!</text>
    </svg>
  )
}

export default function BannerCarousel() {
  const [idx, setIdx] = useState(0)
  const nav = useNavigate()

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SLIDES.length), 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <div>
      <div className="relative h-44 lg:h-48 rounded-2xl overflow-hidden">
        {SLIDES.map((s, i) => {
          const Icon = s.icon
          const active = i === idx
          return (
            <div
              key={i}
              className={`absolute inset-0 bg-gradient-to-br ${s.bg} border border-border transition-opacity duration-700 ease-in-out ${
                active ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
              aria-hidden={!active}
            >
              <Illustration kind={s.illustration} />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/10 to-transparent" />
              <div className="relative p-5 h-full flex flex-col justify-between text-white">
                <div className="flex items-start gap-2">
                  <div className="w-9 h-9 rounded-full bg-ghana-gold/90 flex items-center justify-center text-black shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="max-w-[70%]">
                    <div className="text-[10px] font-bold opacity-90 uppercase tracking-wider">{s.title}</div>
                    <div className="font-display text-base lg:text-lg font-bold mt-0.5 leading-tight">
                      {s.subtitle}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => nav(s.href)}
                  disabled={!active}
                  className="self-start bg-ghana-gold text-black font-bold rounded-full px-4 py-1.5 text-xs flex items-center gap-1 active:scale-95"
                >
                  {s.cta} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex justify-center gap-1.5 mt-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-ghana-gold' : 'w-1.5 bg-fg-tertiary/40'}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
