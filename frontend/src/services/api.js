const API_URL = "http://127.0.0.1:8000";

// ── Helpers ───────────────────────────────────────────────────────────────────

const getToken = () => localStorage.getItem("token");

/**
 * Construit les headers communs à toutes les requêtes authentifiées.
 * Ajoute automatiquement le token JWT Bearer si présent.
 */
const authHeaders = (extra = {}) => ({
  "Content-Type": "application/json",
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...extra,
});

/**
 * Wrapper fetch générique :
 * - injecte les headers auth
 * - lève une erreur si le serveur répond 401 (token expiré / invalide)
 * - retourne le JSON parsé
 */
const request = async (path, options = {}) => {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: authHeaders(options.headers),
  });

  if (res.status === 401) {
    // Token expiré → on vide le storage et on recharge pour forcer le login
    localStorage.removeItem("token");
    window.location.href = "/";
    return;
  }

  return res.json();
};

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * Connexion : retourne { access_token, token_type } ou lève une erreur.
 * Utilise application/x-www-form-urlencoded (requis par OAuth2PasswordRequestForm).
 */
export const login = async (username, password) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }),
  });

  if (!res.ok) {
    throw new Error("Identifiants incorrects");
  }

  return res.json(); // { access_token, token_type }
};

// ── Devices ───────────────────────────────────────────────────────────────────

export const getDevices = () => request("/devices/");

export const getDevice = (id) => request(`/devices/${id}`);

export const addDevice = (device) =>
  request("/devices/", {
    method: "POST",
    body: JSON.stringify(device),
  });

export const updateDevice = (id, data) =>
  request(`/devices/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const deleteDevice = (id) =>
  request(`/devices/${id}`, { method: "DELETE" });

// ── Metrics ───────────────────────────────────────────────────────────────────

export const getMetrics = () => request("/metrics/");

// ── Alerts ────────────────────────────────────────────────────────────────────

export const getAlerts = () => request("/alerts/");

export const createAlert = (alert) =>
  request("/alerts/", {
    method: "POST",
    body: JSON.stringify(alert),
  });

export const deleteAlert = (id) =>
  request(`/alerts/${id}`, { method: "DELETE" });

// ── Users ─────────────────────────────────────────────────────────────────────

export const getUsers = () => request("/users/");

export const createUser = (user) =>
  request("/users/", {
    method: "POST",
    body: JSON.stringify(user),
  });

export const deleteUser = (id) =>
  request(`/users/${id}`, { method: "DELETE" });