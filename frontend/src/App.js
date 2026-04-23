import { useAuth } from "./hooks/useAuth";
import Login from "./components/Auth/Login";
import DeviceList from "./components/DeviceList";
import AddDevice from "./components/AddDevice";
import Metrics from "./components/Metrics";
import Alerts from "./components/Alerts";

// ── Barre de navigation ───────────────────────────────────────────────────────
function Navbar({ user, onLogout }) {
  return (
    <nav style={styles.nav}>
      <span style={styles.navBrand}>🌐 Supervision Réseau</span>
      <div style={styles.navRight}>
        <span style={styles.navUser}>
          👤 {user.username}
          <span style={styles.navRole}>{user.role}</span>
        </span>
        <button onClick={onLogout} style={styles.logoutBtn}>
          Déconnexion
        </button>
      </div>
    </nav>
  );
}

// ── App principale ────────────────────────────────────────────────────────────
function App() {
  const { user, isAuthenticated, loading, logout } = useAuth();

  // Pendant la restauration du token depuis localStorage → écran vide
  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <p style={styles.loadingText}>Chargement...</p>
      </div>
    );
  }

  // Non authentifié → page de login
  if (!isAuthenticated) {
    return <Login />;
  }

  // Authentifié → dashboard complet
  return (
    <div style={styles.page}>
      <Navbar user={user} onLogout={logout} />

      <main style={styles.main}>
        <h1 style={styles.pageTitle}>Dashboard</h1>

        <div style={styles.grid}>
          <section style={styles.section}>
            <AddDevice />
          </section>

          <section style={styles.section}>
            <DeviceList />
          </section>

          <section style={styles.section}>
            <Metrics />
          </section>

          <section style={styles.section}>
            <Alerts />
          </section>
        </div>
      </main>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
  },
  loadingText: {
    color: "#94a3b8",
    fontSize: "16px",
  },
  page: {
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    fontFamily: "system-ui, sans-serif",
  },
  nav: {
    backgroundColor: "#1e293b",
    borderBottom: "1px solid #334155",
    padding: "0 24px",
    height: "56px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBrand: {
    color: "#f1f5f9",
    fontWeight: "700",
    fontSize: "16px",
  },
  navRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  navUser: {
    color: "#94a3b8",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  navRole: {
    backgroundColor: "#1d4ed8",
    color: "#bfdbfe",
    fontSize: "11px",
    padding: "2px 8px",
    borderRadius: "999px",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  logoutBtn: {
    backgroundColor: "transparent",
    border: "1px solid #475569",
    color: "#94a3b8",
    borderRadius: "6px",
    padding: "6px 12px",
    fontSize: "13px",
    cursor: "pointer",
  },
  main: {
    padding: "24px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  pageTitle: {
    color: "#f1f5f9",
    fontSize: "24px",
    fontWeight: "700",
    marginBottom: "24px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
    gap: "20px",
  },
  section: {
    backgroundColor: "#1e293b",
    borderRadius: "10px",
    padding: "20px",
    border: "1px solid #334155",
  },
};

export default App;
