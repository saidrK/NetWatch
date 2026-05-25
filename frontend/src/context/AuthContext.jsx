/**
 * État global authentification JWT (BF01)
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { authAPI, STORAGE_KEYS } from '../services/api'

const AuthContext = createContext(null)

function readStoredUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user)
    return raw ? JSON.parse(raw) : null
  } catch {
    localStorage.removeItem(STORAGE_KEYS.user)
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)
  const [token, setToken] = useState(
    () => localStorage.getItem(STORAGE_KEYS.token) ?? null,
  )
  const [loading, setLoading] = useState(false)

  const login = useCallback(async (email, mot_de_passe) => {
    setLoading(true)
    try {
      const { data } = await authAPI.login(email, mot_de_passe)

      const profile = {
        id: data.user_id,
        nom: data.nom,
        role: data.role,
      }

      localStorage.setItem(STORAGE_KEYS.token, data.access_token)
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(profile))
      setToken(data.access_token)
      setUser(profile)
      return data
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authAPI.logout()
    } catch {
      // JWT stateless — déconnexion côté client suffit
    }
    localStorage.removeItem(STORAGE_KEYS.token)
    localStorage.removeItem(STORAGE_KEYS.user)
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(token && user),
      isAdmin: user?.role === 'ADMINISTRATEUR',
      isTechnicien: user?.role === 'TECHNICIEN',
      login,
      logout,
    }),
    [user, token, loading, login, logout],
  )

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuthContext doit être utilisé dans <AuthProvider>')
  }
  return ctx
}
