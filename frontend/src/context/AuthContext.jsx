/**
 * État global authentification JWT (BF01)
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
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
  // Synchronous initialization prevents the UI from showing the splash screen
  // on every refresh if the user is already logged in locally.
  const [user, setUser] = useState(() => readStoredUser())
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEYS.token) ?? null)
  const [loading, setLoading] = useState(false)
  
  // Only show splash screen if we don't have token/user locally (meaning we are strictly checking)
  // Since we load synchronously, we can start with isLoading = false to prevent the flash.
  // The API validation will happen in the background and log the user out if invalid.
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const bootstrap = async () => {
      const storedToken = localStorage.getItem(STORAGE_KEYS.token) ?? null
      if (!storedToken) {
        return
      }

      try {
        const { data } = await authAPI.me()
        const profile = {
          id: data.user_id,
          nom: data.nom,
          role: data.role,
          email: data.email,
        }

        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(profile))
        setUser(profile)
        setToken(storedToken)
      } catch (error) {
        // If validation fails (e.g., token expired), wipe local storage and state
        localStorage.removeItem(STORAGE_KEYS.token)
        localStorage.removeItem(STORAGE_KEYS.user)
        setUser(null)
        setToken(null)
      }
    }

    bootstrap()
  }, [])

  const login = useCallback(async (email, mot_de_passe) => {
    setLoading(true)
    try {
      const { data } = await authAPI.login(email, mot_de_passe)

      const profile = {
        id: data.user_id,
        nom: data.nom,
        role: data.role,
        email: data.email,
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
      isLoading,
      isAuthenticated: Boolean(token && user),
      isAdmin: user?.role === 'ADMINISTRATEUR' || user?.role === 'ADMIN',
      isTechnicien: user?.role === 'TECHNICIEN',
      login,
      logout,
    }),
    [user, token, loading, isLoading, login, logout],
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

