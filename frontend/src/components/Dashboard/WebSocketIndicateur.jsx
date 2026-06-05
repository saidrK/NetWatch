/**
 * WebSocketIndicateur — Pastille statut connexion
 * Thème projet : #00FFD1 / #FFD700 / #FF4E00
 */
import { useEffect, useState } from 'react'
import { Wifi, WifiOff, RefreshCw } from 'lucide-react'

export default function WebSocketIndicateur({ connected, error, lastUpdate }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const isOnline      = connected && !error
  const isReconnecting = !connected && !error

  const statusLabel = isOnline ? 'ONLINE' : isReconnecting ? 'RECONNEXION...' : 'OFFLINE'
  const accent = isOnline ? '#00FFD1' : isReconnecting ? '#FFD700' : '#FF4E00'
  const Icon   = isOnline ? Wifi : isReconnecting ? RefreshCw : WifiOff

  const formatLastUpdate = () => {
    if (!lastUpdate) return '--:--:--'
    try { return new Date(lastUpdate).toLocaleTimeString('fr-FR', { hour12: false }) }
    catch { return '--:--:--' }
  }

  return (
    <div className="flex items-center gap-4 font-mono text-xs bg-[#0D0D0D] border border-[#222] px-4 py-2 select-none">
      {/* Dot */}
      <div
        className={`w-3 h-3 ${isOnline ? 'animate-pulse' : isReconnecting ? 'animate-ping' : ''}`}
        style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
      />
      {/* Statut */}
      <div
        className="flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-bold tracking-widest uppercase"
        style={{ color: accent, borderColor: accent }}
      >
        <Icon className={`w-3 h-3 ${isReconnecting ? 'animate-spin' : ''}`} />
        {statusLabel}
      </div>
      {/* Timestamp */}
      <div className="text-gray-500 border-l border-[#222] pl-4 flex items-center gap-1 text-[11px]">
        <span className="text-[#555]">MAJ:</span>
        <span style={{ color: isOnline ? '#00FFD1' : '#444' }}>{formatLastUpdate()}</span>
      </div>
    </div>
  )
}
