import { useEffect, useState } from "react";
import { getAlerts, deleteAlert } from "../services/api";
import { useAuth } from "../hooks/useAuth";

const LEVEL_STYLES = {
  critical: { bg: "#450a0a", border: "#7f1d1d", text: "#fca5a5", badge: "#dc2626", label: "Critique" },
  warning:  { bg: "#431407", border: "#7c2d12", text: "#fdba74", badge: "#ea580c", label: "Warning"  },
  normal:   { bg: "#052e16", border: "#14532d", text: "#86efac", badge: "#16a34a", label: "Normal"   },
};

function AlertBadge({ level }) {
  const s = LEVEL_STYLES[level] || LEVEL_STYLES.normal;
  return (
    <span style={{ backgroundColor: s.badge, color: "#fff", fontSize: "11px", padding: "2px 8px", borderRadius: "999px", fontWeight: "600", textTransform: "uppercase" }}>
      {s.label}
    </span>
  );
}

function Alerts() {
  const { isAdmin } = useAuth();
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    getAlerts()
      .then((data) => setAlerts(Array.isArray(data) ? data : []))
      .catch(() => setError("Impossible de charger les alertes."))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    await deleteAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const fmt = (ts) => new Date(ts).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>🚨 Alertes</h2>
        <span style={styles.count}>{alerts.length} alerte{alerts.length !== 1 ? "s" : ""}</span>
      </div>

      {loading && <p style={styles.muted}>Chargement...</p>}
      {error   && <p style={styles.errorText}>{error}</p>}

      {!loading && alerts.length === 0 && (
        <p style={styles.muted}>Aucune alerte enregistrée.</p>
      )}

      <div style={styles.list}>
        {alerts.map((a) => {
          const s = LEVEL_STYLES[a.level] || LEVEL_STYLES.normal;
          return (
            <div key={a.id} style={{ ...styles.card, backgroundColor: s.bg, borderColor: s.border }}>
              <div style={styles.cardTop}>
                <AlertBadge level={a.level} />
                <span style={styles.timestamp}>{fmt(a.timestamp)}</span>
              </div>
              <div style={styles.cardBottom}>
                <p style={{ ...styles.message, color: s.text }}>{a.message}</p>
                {isAdmin && (
                  <button onClick={() => handleDelete(a.id)} style={styles.deleteBtn}>✕</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  header:    { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" },
  title:     { color: "#f1f5f9", fontSize: "16px", fontWeight: "700", margin: 0 },
  count:     { color: "#64748b", fontSize: "13px" },
  muted:     { color: "#64748b", fontSize: "14px" },
  errorText: { color: "#fca5a5", fontSize: "14px" },
  list:      { display: "flex", flexDirection: "column", gap: "10px" },
  card:      { borderRadius: "8px", padding: "12px 14px", border: "1px solid" },
  cardTop:   { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
  timestamp: { color: "#64748b", fontSize: "12px" },
  cardBottom:{ display: "flex", justifyContent: "space-between", alignItems: "center" },
  message:   { fontSize: "14px", margin: 0 },
  deleteBtn: { backgroundColor: "transparent", border: "none", color: "#64748b", fontSize: "16px", cursor: "pointer", padding: "0 4px" },
};

export default Alerts;
