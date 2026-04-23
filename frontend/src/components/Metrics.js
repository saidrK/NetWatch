import { useWebSocket } from "../hooks/useWebSocket";

// Badge de statut de la connexion WebSocket
function StatusBadge({ status }) {
  const config = {
    connected:    { color: "#22c55e", label: "● Temps réel" },
    connecting:   { color: "#f59e0b", label: "○ Connexion..." },
    disconnected: { color: "#64748b", label: "○ Déconnecté" },
    error:        { color: "#ef4444", label: "● Erreur" },
  }[status] || { color: "#64748b", label: status };

  return (
    <span style={{ color: config.color, fontSize: "13px", fontWeight: "600" }}>
      {config.label}
    </span>
  );
}

// Carte d'une métrique (CPU / RAM / Bande passante)
function MetricBar({ label, value, unit, color }) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ color: "#cbd5e1", fontSize: "14px" }}>{label}</span>
        <span style={{ color: "#f1f5f9", fontWeight: "700", fontSize: "14px" }}>
          {value !== undefined ? `${value} ${unit}` : "—"}
        </span>
      </div>
      <div style={{ backgroundColor: "#0f172a", borderRadius: "4px", height: "8px" }}>
        <div style={{
          width: `${pct}%`,
          backgroundColor: color,
          borderRadius: "4px",
          height: "8px",
          transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

function Metrics() {
  const { data, status, reconnect } = useWebSocket();

  const summary = data?.summary;
  const devices = data?.devices || [];

  return (
    <div>
      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ color: "#f1f5f9", margin: 0, fontSize: "16px", fontWeight: "700" }}>
          📊 Métriques Temps Réel
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <StatusBadge status={status} />
          {status !== "connected" && (
            <button onClick={reconnect} style={styles.reconnectBtn}>
              Reconnecter
            </button>
          )}
        </div>
      </div>

      {/* Résumé global */}
      {summary ? (
        <div style={styles.summaryBox}>
          <p style={styles.summaryLabel}>Moyenne globale ({devices.length} équipement{devices.length > 1 ? "s" : ""})</p>
          <MetricBar label="CPU"            value={summary.cpu}       unit="%" color="#3b82f6" />
          <MetricBar label="RAM"            value={summary.ram}       unit="%" color="#8b5cf6" />
          <MetricBar label="Bande passante" value={summary.bandwidth} unit="Mbps" color="#10b981" />
        </div>
      ) : (
        <div style={styles.waiting}>
          {status === "connected" ? "En attente de données..." : "WebSocket non connecté"}
        </div>
      )}

      {/* Détail par équipement */}
      {devices.length > 0 && (
        <div style={{ marginTop: "16px" }}>
          <p style={styles.summaryLabel}>Détail par équipement</p>
          {devices.map((device) => (
            <div key={device.device_id} style={styles.deviceCard}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ color: "#f1f5f9", fontWeight: "600", fontSize: "14px" }}>
                  {device.device_name}
                </span>
                <span style={{ color: "#64748b", fontSize: "12px" }}>{device.ip}</span>
              </div>
              <MetricBar label="CPU" value={device.cpu} unit="%" color="#3b82f6" />
              <MetricBar label="RAM" value={device.ram} unit="%" color="#8b5cf6" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  summaryBox: {
    backgroundColor: "#0f172a",
    borderRadius: "8px",
    padding: "16px",
    border: "1px solid #1e3a5f",
  },
  summaryLabel: {
    color: "#64748b",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "12px",
    marginTop: 0,
  },
  waiting: {
    color: "#64748b",
    fontSize: "14px",
    textAlign: "center",
    padding: "24px",
  },
  deviceCard: {
    backgroundColor: "#0f172a",
    borderRadius: "8px",
    padding: "14px",
    marginBottom: "10px",
    border: "1px solid #1e293b",
  },
  reconnectBtn: {
    backgroundColor: "transparent",
    border: "1px solid #475569",
    color: "#94a3b8",
    borderRadius: "6px",
    padding: "4px 10px",
    fontSize: "12px",
    cursor: "pointer",
  },
};

export default Metrics;
