import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, getAuth, setAuth as setStoredAuth } from '../services/api.js'

const ONBOARD_KEY = 'antescan_onboarded'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getAuth()?.user || null)
  const [loading, setLoading] = useState(false)

  // Refresh /me on mount if token exists
  useEffect(() => {
    const auth = getAuth()
    if (auth?.accessToken && !user) {
      api.auth.me().then((d) => {
        if (d?.user) {
          setUser(d.user)
          setStoredAuth({ ...auth, user: d.user })
        }
      }).catch(() => {
        setStoredAuth(null)
        setUser(null)
      })
    }
    // eslint-disable-next-line
  }, [])

  const loginChw = useCallback(async (chwId, password) => {
    setLoading(true)
    try {
      const data = await api.auth.chwLogin(chwId, password)
      setStoredAuth({ ...data, user: data.user })
      setUser(data.user)
      return data.user
    } finally {
      setLoading(false)
    }
  }, [])

  const loginAdmin = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const data = await api.auth.adminLogin(email, password)
      setStoredAuth({ ...data, user: data.user })
      setUser(data.user)
      return data.user
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (payload) => {
    setLoading(true)
    try {
      const data = await api.auth.chwRegister(payload)
      setStoredAuth({ ...data, user: data.user })
      setUser(data.user)
      return data.user
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setStoredAuth(null)
    setUser(null)
  }, [])

  // Onboarding helpers (no backend; persisted locally)
  const needsOnboarding = useCallback(() => {
    try { return !localStorage.getItem(ONBOARD_KEY) } catch { return false }
  }, [])

  const completeOnboarding = useCallback(() => {
    try { localStorage.setItem(ONBOARD_KEY, '1') } catch {}
  }, [])

  const refresh = useCallback(async () => {
    const auth = getAuth()
    if (!auth?.accessToken) return null
    try {
      const d = await api.auth.me()
      if (d?.user) {
        setUser(d.user)
        setStoredAuth({ ...auth, user: d.user })
        return d.user
      }
    } catch { /* silent */ }
    return null
  }, [])

  const value = {
    user, loading,
    isAuthenticated: !!user,
    isAdmin: user?.kind === 'admin',
    isChw: user?.kind === 'chw',
    login: loginChw,
    loginChw, loginAdmin,
    register, registerChw: register,  // alias for back-compat
    logout,
    refresh,
    needsOnboarding, completeOnboarding,
    setUserOverride: (u) => {
      // Used by Profile/Avatar updates to refresh in-context user
      const stored = getAuth() || {}
      setStoredAuth({ ...stored, user: u })
      setUser(u)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
