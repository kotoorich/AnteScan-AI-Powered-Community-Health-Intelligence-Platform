import { useState, useEffect } from 'react'

/**
 * Avatar that gracefully falls back to initials if the image fails to load.
 *
 * Stores failed URLs in a module-level Set so we don't retry the same broken
 * URL every render. Handles stale-cached-user-from-localStorage cleanly.
 */
const FAILED_URLS = new Set()

export default function Avatar({ url, name, size = 36, className = '', ringClass = '' }) {
  const initialBroken = url ? FAILED_URLS.has(url) : false
  const [broken, setBroken] = useState(initialBroken)

  useEffect(() => {
    setBroken(url ? FAILED_URLS.has(url) : false)
  }, [url])

  const initials = (name || '?')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleError = () => {
    if (url) FAILED_URLS.add(url)
    setBroken(true)
  }

  const dim = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) }

  if (!url || broken) {
    return (
      <div
        style={dim}
        className={`rounded-full bg-gradient-to-br from-ghana-gold to-amber-500 flex items-center justify-center font-bold text-black flex-shrink-0 ${ringClass} ${className}`}
      >
        {initials || '?'}
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={name || 'avatar'}
      style={dim}
      onError={handleError}
      className={`rounded-full object-cover flex-shrink-0 ${ringClass} ${className}`}
    />
  )
}
