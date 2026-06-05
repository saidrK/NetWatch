/**
 * Hook WebSocket — connexion auto-reconnect au dashboard
 * WS /ws/dashboard -> push métriques toutes les 30s
 */
import { useEffect, useRef, useState, useCallback } from 'react'

// URL WebSocket backend — port 8000 — chemin /ws/dashboard pour métriques
const WS_URL = '/ws/dashboard'

function buildWebSocketUrl(customUrl) {
  const raw = (customUrl || import.meta.env.VITE_WS_URL || WS_URL).replace(/\/$/, '')

  // URL complète déjà prête
  if (raw.startsWith('ws://') || raw.startsWith('wss://')) {
    // Si l'URL contient déjà /api/v1/ws ou /ws, retourner telle quelle
    if (raw.includes('/api/v1/ws') || raw.endsWith('/ws')) {
      return raw
    }
    return raw.endsWith('/ws/dashboard') ? raw : `${raw}/ws/dashboard`
  }

  // URL HTTP/HTTPS -> conversion en WS/WSS
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    const parsed = new URL(raw)
    parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:'
    parsed.pathname = parsed.pathname.replace(/\/$/, '')
    if (!parsed.pathname.endsWith('/ws/dashboard')) {
      parsed.pathname = `${parsed.pathname}/ws/dashboard`.replace(/\/{2,}/g, '/')
    }
    return parsed.toString()
  }

  // Chemin relatif
  if (raw.startsWith('/')) {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${protocol}://${window.location.host}${raw}`
  }

  // Host seul (ex: localhost:8000)
  return `ws://${raw}/ws/dashboard`
}

export function useWebSocket(url) {
  const [data, setData] = useState(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttempts = useRef(0)
  const manualCloseRef = useRef(false)
  const lastUpdateTime = useRef(0)
  const throttleTimeoutRef = useRef(null)
  const MAX_RECONNECT_ATTEMPTS = 5

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      const wsUrl = buildWebSocketUrl(url)
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        setConnected(true)
        setError(null)
        reconnectAttempts.current = 0
        console.log('✅ WebSocket connecté')
      }

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          
          if (message.type === 'error' && message.code === 'metrics_unavailable') {
            window.dispatchEvent(new CustomEvent('app-toast', { 
              detail: { type: 'error', message: 'Attention : Source de métriques temporairement inaccessible', duration: 7000 } 
            }))
            return // Maintient la dernière valeur connue (ne pas set data)
          }

          const now = Date.now()
          
          // Throttling: Update state at most once per second
          if (now - lastUpdateTime.current >= 1000) {
            setData(message)
            lastUpdateTime.current = now
          } else {
            if (throttleTimeoutRef.current) clearTimeout(throttleTimeoutRef.current)
            throttleTimeoutRef.current = setTimeout(() => {
              setData(message)
              lastUpdateTime.current = Date.now()
            }, 1000 - (now - lastUpdateTime.current))
          }
        } catch (err) {
          console.error('❌ Erreur parsing WebSocket message:', err)
        }
      }

      wsRef.current.onerror = (err) => {
        console.error('❌ WebSocket error:', err)
      }

      wsRef.current.onclose = () => {
        setConnected(false)
        console.log('🔌 WebSocket déconnecté')

        if (manualCloseRef.current) return

        // Auto-reconnect avec backoff exponentiel
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          reconnectAttempts.current++
          console.log(`🔄 Reconnexion dans ${delay}ms (tentative ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
          return
        }

        setError(new Error('Impossible de se connecter au WebSocket après plusieurs tentatives.'))
      }
    } catch (err) {
      console.error('❌ Erreur connexion WebSocket:', err)
      setError(err)
    }
  }, [url])

  const disconnect = useCallback(() => {
    manualCloseRef.current = true
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setConnected(false)
  }, [])

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    }
  }, [])

  useEffect(() => {
    manualCloseRef.current = false
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    data,
    connected,
    error,
    sendMessage,
  }
}
