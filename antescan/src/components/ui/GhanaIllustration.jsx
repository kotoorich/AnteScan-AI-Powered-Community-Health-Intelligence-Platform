import { motion } from 'framer-motion'

/**
 * Animated illustration of a Ghanaian mother carrying her child on her back,
 * a common scene in rural Ghana. Pure inline SVG (no external assets).
 * Used on Splash + Login + Onboarding screens.
 */
export default function GhanaIllustration({ size = 280 }) {
  return (
    <motion.svg
      viewBox="0 0 400 360"
      width={size} height={size}
      xmlns="http://www.w3.org/2000/svg"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      aria-label="Ghanaian mother carrying her baby"
    >
      <defs>
        {/* Kente gradient — Ghana flag inspired */}
        <linearGradient id="kente1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FCD116" />
          <stop offset="50%" stopColor="#CE1126" />
          <stop offset="100%" stopColor="#006B3F" />
        </linearGradient>
        <linearGradient id="kente2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"  stopColor="#006B3F" />
          <stop offset="40%" stopColor="#FCD116" />
          <stop offset="100%" stopColor="#CE1126" />
        </linearGradient>
        <radialGradient id="bgGlow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FCD116" stopOpacity="0.15"/>
          <stop offset="100%" stopColor="#FCD116" stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* warm radial glow */}
      <rect width="400" height="360" fill="url(#bgGlow)" />

      {/* Floating heart particles around the figure — symbolises love & care */}
      {[0,1,2,3,4].map((i) => (
        <motion.g key={i}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: [-6, -28, -6], opacity: [0, 0.7, 0] }}
          transition={{ duration: 3 + i*0.4, repeat: Infinity, delay: i * 0.6, ease: 'easeInOut' }}
        >
          <path
            d={`M ${60 + i*65},${280 - i*4}
                m -6,0
                a 6,6 0 0,1 12,0
                a 6,6 0 0,1 -6,8
                a 6,6 0 0,1 -6,-8 z`}
            fill="#CE1126" opacity="0.4"
          />
        </motion.g>
      ))}

      {/* Mother's body — wrapped in kente cloth */}
      <motion.g
        initial={{ y: 4 }}
        animate={{ y: [4, 0, 4] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Skirt / wrap-around cloth */}
        <path
          d="M 130 340
             L 145 220
             Q 200 205 255 220
             L 270 340 Z"
          fill="url(#kente1)"
        />
        {/* Kente horizontal stripes for pattern */}
        <rect x="140" y="240" width="120" height="6" fill="#000" opacity="0.18" />
        <rect x="140" y="265" width="120" height="6" fill="#000" opacity="0.18" />
        <rect x="140" y="295" width="120" height="6" fill="#000" opacity="0.18" />

        {/* Torso */}
        <path
          d="M 160 220
             Q 165 175 200 170
             Q 235 175 240 220 Z"
          fill="#8B4513"
        />

        {/* Neck */}
        <rect x="190" y="148" width="20" height="22" rx="6" fill="#A0522D"/>

        {/* Head */}
        <ellipse cx="200" cy="125" rx="32" ry="36" fill="#A0522D"/>

        {/* Head-wrap / gele in kente */}
        <path
          d="M 168 110
             Q 200 78 232 110
             Q 230 92 200 84
             Q 170 92 168 110 Z"
          fill="url(#kente2)"
        />
        {/* Wrap stripe */}
        <path d="M 168 110 Q 200 95 232 110" stroke="#000" strokeWidth="1.5" opacity="0.3" fill="none"/>

        {/* Eyes */}
        <circle cx="190" cy="125" r="2.2" fill="#1a1a1a"/>
        <circle cx="210" cy="125" r="2.2" fill="#1a1a1a"/>
        {/* Smile */}
        <path d="M 192 138 Q 200 144 208 138" stroke="#3d2818" strokeWidth="2" fill="none" strokeLinecap="round"/>

        {/* Mother's arm wrapped around baby on her back */}
        <path
          d="M 240 215
             Q 285 215 285 240
             Q 285 270 255 268"
          fill="none" stroke="#A0522D" strokeWidth="14" strokeLinecap="round"
        />
      </motion.g>

      {/* BABY — on mother's back, wrapped in cloth */}
      <motion.g
        initial={{ rotate: -1 }}
        animate={{ rotate: [-1, 1, -1] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '270px 220px' }}
      >
        {/* Carrying cloth — diagonal across mother's back */}
        <path
          d="M 230 195
             Q 290 195 295 245
             Q 295 280 255 282
             Q 230 282 225 250 Z"
          fill="#CE1126"
        />
        {/* cloth pattern */}
        <path d="M 245 210 L 295 245" stroke="#FCD116" strokeWidth="3" opacity="0.6"/>
        <path d="M 235 235 L 285 270" stroke="#FCD116" strokeWidth="3" opacity="0.6"/>

        {/* Baby's head peeking out */}
        <circle cx="275" cy="210" r="18" fill="#A0522D"/>
        {/* baby eyes */}
        <circle cx="271" cy="210" r="1.5" fill="#1a1a1a"/>
        <circle cx="281" cy="210" r="1.5" fill="#1a1a1a"/>
        {/* baby mouth */}
        <path d="M 272 217 Q 275 220 278 217" stroke="#3d2818" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        {/* baby tuft of hair */}
        <path d="M 268 196 Q 275 192 282 196" stroke="#2b1810" strokeWidth="3" fill="none" strokeLinecap="round"/>
      </motion.g>

      {/* Floor / ground line */}
      <ellipse cx="200" cy="345" rx="100" ry="6" fill="#000" opacity="0.1"/>
    </motion.svg>
  )
}
