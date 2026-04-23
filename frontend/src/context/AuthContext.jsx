import { createContext, useState, useEffect } from "react";
import { login as apiLogin } from "../services/api";

// ── Contexte ──────────────────────────────────────────────────────────────────
// AuthContext est consommé par useAuth.js et par tous les composants qui
// ont besoin de savoir si l'utilisateur est connecté.
export const AuthContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);       // { username, role }
  const [token, setToken] = useState(null);     // JWT brut
  const [loading, setLoading] = useState(true); // vrai pendant la restauration

  // Au démarrage : on recharge le token depuis localStorage s'il existe
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser  = localStorage.getItem("user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  /**
   * Connexion : appelle l'API, stocke le token et les infos utilisateur.
   * Lève une erreur si les identifiants sont incorrects.
   */
  const login = async (username, password) => {
    const data = await apiLogin(username, password);

    // Décode le payload JWT pour extraire le rôle (sans librairie externe)
    const payload = JSON.parse(atob(data.access_token.split(".")[1]));
    const userInfo = { username: payload.sub, role: payload.role };

    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(userInfo));

    setToken(data.access_token);
    setUser(userInfo);
  };

  /**
   * Déconnexion : vide le state et le localStorage.
   */
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token;
  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
