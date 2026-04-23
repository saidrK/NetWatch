import { useState, useEffect, useRef, useCallback } from "react";

const WS_URL = "ws://127.0.0.1:8000/ws/metrics";

/**
 * Hook useWebSocket — connexion temps réel au backend.
 *
 * Utilisation :
 *   const { data, status, disconnect, reconnect } = useWebSocket();
 *
 * Valeurs exposées :
 *   - data       → dernier message reçu { source, summary, devices } ou null
 *   - status     → "connecting" | "connected" | "disconnected" | "error"
 *   - disconnect → ferme la connexion manuellement
 *   - reconnect  → rouvre la connexion manuellement
 */
export function useWebSocket() {
  const [data, setData]     = useState(null);
  const [status, setStatus] = useState("connecting");

  const wsRef        = useRef(null);  // référence à l'objet WebSocket
  const reconnectRef = useRef(null);  // référence au timer de reconnexion

  const connect = useCallback(() => {
    // Nettoyage d'une éventuelle connexion précédente
    if (wsRef.current) {
      wsRef.current.close();
    }

    setStatus("connecting");
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      // Annule un éventuel timer de reconnexion en cours
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setData(parsed);
      } catch {
        console.error("WebSocket : message non-JSON reçu", event.data);
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onclose = () => {
      setStatus("disconnected");
      // Reconnexion automatique après 5 secondes
      reconnectRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };
  }, []);

  // Connexion initiale au montage du composant
  useEffect(() => {
    connect();

    // Nettoyage à la destruction du composant
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    if (wsRef.current) wsRef.current.close();
    setStatus("disconnected");
  }, []);

  const reconnect = useCallback(() => {
    connect();
  }, [connect]);

  return { data, status, disconnect, reconnect };
}
