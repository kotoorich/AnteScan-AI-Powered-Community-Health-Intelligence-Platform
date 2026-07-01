import { useEffect, useState } from 'react'
import { WifiOff, X } from 'lucide-react'
import { api } from '../../services/api.js'

/**
 * Polls /api/health every 15s. Shows a non-intrusive banner if the backend
 * is unreachable so the user knows to start it.
 */
export default function BackendStatus() {
  const [up, setUp] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        await api.health()
        if (!cancelled) setUp(true)
      } catch {
        if (!cancelled) setUp(false)
      }
    }
    check()
    const iv = setInterval(check, 15000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [])

  if (up || dismissed) return null

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92vw]">
      <div className="rounded-xl bg-ghana-red text-white px-4 py-2.5 shadow-2xl flex items-start gap-2.5 text-sm">
        <WifiOff className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="font-bold">Backend not reachable</div>
          <div className="text-xs opacity-90 mt-0.5">
            Start the API from <code className="bg-black/30 px-1 rounded">backend/</code>:
            {' '}<code className="bg-black/30 px-1 rounded">python run.py</code>
          </div>
        </div>
        <button onClick={() => setDismissed(true)} aria-label="Dismiss">
          <X className="w-4 h-4 opacity-75 hover:opacity-100" />
        </button>
      </div>
    </div>
  )
}
