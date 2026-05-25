/**
 * Instance Axios — proxy Vite /api -> backend:8000
 * Préfixe routes : /api/v1/...
 */
import axios from 'axios'

/** Évite /api/v1/v1 si .env contient déjà /api/v1 */
function getApiBaseUrl() {
  const raw = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')
  return raw.endsWith('/v1') ? raw : `${raw}/v1`
}

export const STORAGE_KEYS = {
  token: 'token',
  user: 'user',
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// Injecte le JWT sur chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.token)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 401 -> déconnexion -> sauf page login et requête login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const url = error.config?.url ?? ''
    const onLoginPage = window.location.pathname === '/login'
    const isLoginRequest = url.includes('/auth/login')

    if (status === 401 && !isLoginRequest && !onLoginPage) {
      localStorage.removeItem(STORAGE_KEYS.token)
      localStorage.removeItem(STORAGE_KEYS.user)
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

// — Auth
export const authAPI = {
  login: (email, mot_de_passe) =>
    api.post('/auth/login', { email, mot_de_passe }),
  logout: () => api.post('/auth/logout'),
}

// — Utilisateurs
export const utilisateursAPI = {
  lister: () => api.get('/utilisateurs/'),
  creer: (data) => api.post('/utilisateurs/', data),
  get: (id) => api.get(`/utilisateurs/${id}`),
  modifier: (id, data) => api.put(`/utilisateurs/${id}`, data),
  supprimer: (id) => api.delete(`/utilisateurs/${id}`),
}

// — Équipements
export const equipementsAPI = {
  lister: (params) => api.get('/equipements/', { params }),
  get: (id) => api.get(`/equipements/${id}`),
  scanner: (plage) => api.post('/equipements/scan', { plage }),
}

// — Métriques
export const metriquesAPI = {
  derniere: (equipementId) => api.get(`/metriques/${equipementId}`),
  historique: (equipementId, heures = 24) =>
    api.get(`/metriques/${equipementId}/historique`, { params: { heures } }),
  collecter: () => api.post('/metriques/collecter'),
}

// — Alertes
export const alertesAPI = {
  lister: (params) => api.get('/alertes/', { params }),
  get: (id) => api.get(`/alertes/${id}`),
  acquitter: (id) => api.put(`/alertes/${id}/acquitter`),
}

// — Anomalies IA
export const anomaliesAPI = {
  lister: (params) =>
    alertesAPI.lister({ limite: 100, ...params }),
}

// — Rapports
export const rapportsAPI = {
  lister: () => api.get('/rapports/'),
  generer: (data) => api.post('/rapports/generer', data),
  get: (id) => api.get(`/rapports/${id}`),
  supprimer: (id) => api.delete(`/rapports/${id}`),
}

export default api
