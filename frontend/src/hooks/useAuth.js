import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

/**
 * Hook personnalisé pour accéder au contexte d'authentification.
 *
 * Utilisation dans n'importe quel composant :
 *
 *   const { user, isAuthenticated, isAdmin, login, logout } = useAuth();
 *
 * Valeurs exposées :
 *   - user            → { username, role } ou null
 *   - token           → JWT brut ou null
 *   - loading         → true pendant la restauration initiale depuis localStorage
 *   - isAuthenticated → boolean, true si un token valide est présent
 *   - isAdmin         → boolean, true si role === "admin"
 *   - login(u, p)     → async, connecte l'utilisateur
 *   - logout()        → déconnecte et vide le storage
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un <AuthProvider>");
  }

  return context;
}
