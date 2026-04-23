import { useState } from "react";
import { addDevice } from "../services/api";
import { useAuth } from "../hooks/useAuth";

function AddDevice() {
  const { isAdmin } = useAuth();
  const [name, setName]       = useState("");
  const [ip, setIp]           = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError]     = useState("");

  // Seuls les admins peuvent ajouter un équipement
  if (!isAdmin) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess("");
    setError("");
    setLoading(true);

    try {
      await addDevice({ name, ip_address: ip });
      setSuccess(`Équipement "${name}" ajouté avec succès.`);
      setName("");
      setIp("");
    } catch {
      setError("Erreur lors de l'ajout de l'équipement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={styles.title}>➕ Ajouter un équipement</h2>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          placeholder="Nom (ex: Routeur principal)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={styles.input}
        />
        <input
          type="text"
          placeholder="Adresse IP (ex: 192.168.1.1)"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? "Ajout..." : "Ajouter"}
        </button>
      </form>

      {success && <p style={styles.success}>✅ {success}</p>}
      {error   && <p style={styles.error}>⚠️ {error}</p>}
    </div>
  );
}

const styles = {
  title:   { color: "#f1f5f9", fontSize: "16px", fontWeight: "700", marginTop: 0, marginBottom: "14px" },
  form:    { display: "flex", flexDirection: "column", gap: "10px" },
  input:   { backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "8px", padding: "10px 14px", color: "#f1f5f9", fontSize: "14px", outline: "none" },
  button:  { backgroundColor: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", padding: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer" },
  success: { color: "#86efac", fontSize: "13px", marginTop: "8px" },
  error:   { color: "#fca5a5", fontSize: "13px", marginTop: "8px" },
};

export default AddDevice;
