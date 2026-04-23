import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

function Login() {
  const { login } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(username, password);
      // AuthContext met isAuthenticated à true → App.js redirige automatiquement
    } catch (err) {
      setError("Identifiants incorrects. Vérifiez votre nom d'utilisateur et mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        {/* Logo / Titre */}
        <div style={styles.header}>
          <div style={styles.icon}>🌐</div>
          <h1 style={styles.title}>Supervision Réseau</h1>
          <p style={styles.subtitle}>Connectez-vous pour accéder au dashboard</p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={styles.form}>

          <div style={styles.field}>
            <label style={styles.label}>Nom d'utilisateur</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              autoFocus
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>

          {/* Message d'erreur */}
          {error && (
            <div style={styles.error}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Connexion en cours..." : "Se connecter"}
          </button>

        </form>
      </div>
    </div>
  );
}

// ── Styles inline (pas besoin de Tailwind pour cette étape) ───────────────────
const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
    fontFamily: "system-ui, sans-serif",
  },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: "12px",
    padding: "40px",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
    border: "1px solid #334155",
  },
  header: {
    textAlign: "center",
    marginBottom: "32px",
  },
  icon: {
    fontSize: "48px",
    marginBottom: "12px",
  },
  title: {
    color: "#f1f5f9",
    fontSize: "22px",
    fontWeight: "700",
    margin: "0 0 6px 0",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: "14px",
    margin: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  label: {
    color: "#cbd5e1",
    fontSize: "14px",
    fontWeight: "500",
  },
  input: {
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "10px 14px",
    color: "#f1f5f9",
    fontSize: "15px",
    outline: "none",
  },
  error: {
    backgroundColor: "#450a0a",
    border: "1px solid #7f1d1d",
    color: "#fca5a5",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "14px",
  },
  button: {
    backgroundColor: "#3b82f6",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "12px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    marginTop: "4px",
  },
};

export default Login;
