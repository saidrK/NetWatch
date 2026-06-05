/**
 * DashboardContext — Persiste l'historique du dashboard entre les navigations
 */
import { createContext, useContext, useState, useCallback, useRef } from 'react'

const HISTORY_MAX = 20

const DashboardContext = createContext(null)

export function DashboardProvider({ children }) {
  const [current,        setCurrent]        = useState(null)
  const [lastUpdate,     setLastUpdate]     = useState(null)
  const [alertesCount,   setAlertesCount]   = useState(null)
  const [wsLoading,      setWsLoading]      = useState(true)
  const [nodes,          setNodes]          = useState([])
  const [cpuHistory,     setCpuHistory]     = useState([])
  const [ramHistory,     setRamHistory]     = useState([])
  const [bpHistory,      setBpHistory]      = useState([])
  const [latenceHistory, setLatenceHistory] = useState([])
  const [anomalieHistory,setAnomalieHistory]= useState([])
  const wsRef = useRef(null)

  const pushHistory = useCallback((setter, point) => {
    setter(prev => [...prev.slice(-(HISTORY_MAX - 1)), point])
  }, [])

  return (
    <DashboardContext.Provider value={{
      current, setCurrent,
      lastUpdate, setLastUpdate,
      alertesCount, setAlertesCount,
      wsLoading, setWsLoading,
      nodes, setNodes,
      cpuHistory, setCpuHistory,
      ramHistory, setRamHistory,
      bpHistory, setBpHistory,
      latenceHistory, setLatenceHistory,
      anomalieHistory, setAnomalieHistory,
      pushHistory,
      wsRef,
    }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}
