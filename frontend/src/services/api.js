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
  timeout: 30000,
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
    const isValidationRequest = url.includes('/auth/me')

    // Log les erreurs en console pour debug
    console.error(`[API ERROR] ${status} → ${url}`)

    if (status === 401 && !isLoginRequest && !isValidationRequest && !onLoginPage) {
      localStorage.removeItem(STORAGE_KEYS.token)
      localStorage.removeItem(STORAGE_KEYS.user)
      sessionStorage.setItem('auth_message', 'Session expirée ou mot de passe modifié.')
      window.location.href = '/login'
    } else if (status >= 500) {
      // NE PAS afficher de toast pour les erreurs 500 — laisser le composant gérer
      console.warn(`[NETWATCH] Service ${status} indisponible: ${url}`)
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'warning', message: 'Délai d\'attente dépassé. Le serveur est lent.', duration: 5000 } }));
    } else if (!error.response && !isValidationRequest) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { type: 'error', message: 'Liaison perdue. Vérifiez votre connexion réseau.', duration: 5000 } }));
    }
    return Promise.reject(error)
  },
)

// — Auth
export const authAPI = {
  login: (email, mot_de_passe) =>
    api.post('/auth/login', { email, mot_de_passe }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
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
  scanner: (plage, signal) => api.post('/equipements/scan', { plage }, { timeout: 120000, signal }),
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
  /**
   * Télécharge un rapport et déclenche le téléchargement navigateur.
   * Utilise responseType: 'blob' pour recevoir le binaire (PDF/Excel/CSV).
   */
  telecharger: async (id, titre = 'rapport', format = 'pdf') => {
    const response = await api.get(`/rapports/${id}/telecharger`, {
      responseType: 'blob',
    })
    // Extraire le nom de fichier depuis Content-Disposition si disponible
    const contentDisposition = response.headers['content-disposition'] || ''
    const match = contentDisposition.match(/filename[^;=\n]*=([^;\n]*)/)
    const filename = match
      ? match[1].replace(/["']/g, '').trim()
      : `${titre}_${new Date().toISOString().slice(0, 10)}.${format.toLowerCase()}`

    // Créer un lien temporaire et déclencher le téléchargement
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    return response
  },
}

export default api
