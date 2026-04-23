import { useEffect, useState } from "react";
import { getDevices, deleteDevice } from "../services/api";
import { useAuth } from "../hooks/useAuth";

function DeviceList() {
  const { isAdmin } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const fetchDevices = async () => {
    try {
      const data = await getDevices();
      setDevices(Array.isArray(data) ? data : []);
    } catch {
      setError("Impossible de charger les équipements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDevices(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet équipement ?")) return;
    await deleteDevice(id);
    setDevices((prev) => prev.filter((d) => d.id !== id));
  };

  const statusColor = (s) => s === "online" ? "#22c55e" : "#ef4444";

  return (
    <div>
      <div style={styles.header}>
        <h2 style={styles.title}>🖥️ Équipements</h2>
        <span style={styles.count}>{devices.length} appareil{devices.length !== 1 ? "s" : ""}</span>
      </div>

      {loading && <p style={styles.muted}>Chargement...</p>}
      {error   && <p style={styles.error}>{error}</p>}

      {!loading && devices.length === 0 && (
        <p style={styles.muted}>Aucun équipement enregistré.</p>
      )}

      <div style={styles.list}>
        {devices.map((d) => (
          <div key={d.id} style={styles.card}>
            <div style={styles.cardLeft}>
              <span style={{ ...styles.statusDot, backgroundColor: statusColor(d.status) }} />
              <div>
                <p style={styles.deviceName}>{d.name}</p>
                <p style={styles.deviceIp}>{d.ip_address}</p>
              </div>
            </div>
            {isAdmin && (
              <button onClick={() => handleDelete(d.id)} style={styles.deleteBtn}>
                Supprimer
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  header:     { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" },
  title:      { color: "#f1f5f9", fontSize: "16px", fontWeight: "700", margin: 0 },
  count:      { color: "#64748b", fontSize: "13px" },
  muted:      { color: "#64748b", fontSize: "14px" },
  error:      { color: "#fca5a5", fontSize: "14px" },
  list:       { display: "flex", flexDirection: "column", gap: "10px" },
  card:       { backgroundColor: "#0f172a", borderRadius: "8px", padding: "12px 16px", border: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardLeft:   { display: "flex", alignItems: "center", gap: "12px" },
  statusDot:  { width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0 },
  deviceName: { color: "#f1f5f9", fontWeight: "600", fontSize: "14px", margin: 0 },
  deviceIp:   { color: "#64748b", fontSize: "12px", margin: "2px 0 0 0" },
  deleteBtn:  { backgroundColor: "transparent", border: "1px solid #7f1d1d", color: "#fca5a5", borderRadius: "6px", padding: "4px 10px", fontSize: "12px", cursor: "pointer" },
};

export default DeviceList;
