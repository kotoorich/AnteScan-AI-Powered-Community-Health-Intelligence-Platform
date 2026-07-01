/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ghana: {
          red: '#CE1126',
          gold: '#FCD116',
          green: '#006B3F',
          black: '#000000',
        },
        bg: {
          DEFAULT: 'rgb(var(--bg) / <alpha-value>)',
          secondary: 'rgb(var(--bg-secondary) / <alpha-value>)',
          card: 'rgb(var(--bg-card) / <alpha-value>)',
          elevated: 'rgb(var(--bg-elevated) / <alpha-value>)',
        },
        fg: {
          DEFAULT: 'rgb(var(--fg) / <alpha-value>)',
          secondary: 'rgb(var(--fg-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--fg-tertiary) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
        },
        success: '#00A651',
        warning: '#FCD116',
        danger: '#CE1126',
        emergency: '#FF3B3B',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'gold-glow': '0 8px 32px -8px rgba(252, 209, 22, 0.5)',
        'card': '0 2px 12px -2px rgba(0, 0, 0, 0.08)',
        'card-dark': '0 4px 16px -4px rgba(0, 0, 0, 0.6)',
        'raised': '0 8px 24px -6px rgba(252, 209, 22, 0.45), 0 4px 8px rgba(0,0,0,0.25)',
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wave-1': 'wave 0.9s ease-in-out infinite',
        'wave-2': 'wave 0.9s ease-in-out 0.15s infinite',
        'wave-3': 'wave 0.9s ease-in-out 0.3s infinite',
        'wave-4': 'wave 0.9s ease-in-out 0.45s infinite',
        'wave-5': 'wave 0.9s ease-in-out 0.6s infinite',
        'shimmer': 'shimmer 1.5s linear infinite',
        'emergency-pulse': 'emergency-pulse 1s ease-in-out infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', opacity: '0.8' },
          '70%': { transform: 'scale(1.3)', opacity: '0' },
          '100%': { transform: 'scale(1.3)', opacity: '0' },
        },
        'wave': {
          '0%, 100%': { transform: 'scaleY(0.4)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'emergency-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 59, 59, 0.7)' },
          '70%': { boxShadow: '0 0 0 14px rgba(255, 59, 59, 0)' },
        },
      },
    },
  },
  plugins: [],
}
