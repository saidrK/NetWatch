/**
 * ZabbixPanel.jsx — Intégration Zabbix dans NetWatch Dashboard
 * Thème : #050505 bg | #0D0D0D/#111 cards | #222 borders
 *         #00FFD1 cyan | #FFD700 warning | #FF4E00 critical
 */
import { useEffect, useState } from 'react'
import { zabbixAPI } from '@/services/api'
import { Activity, AlertTriangle, Server, CheckCircle2, XCircle } from 'lucide-react'

const CYAN   = '#00FFD1'
const RED    = '#FF4E00'
const YELLOW = '#FFD700'

const severityColor = (s) => ({
  CRITIQUE:    RED,
  HIGH:        RED,
  AVERAGE:     YELLOW,
  WARNING:     YELLOW,
  INFORMATION: CYAN,
}[s] || '#555')

export default function ZabbixPanel() {
  const [resume,   setResume]   = useState(null)
  const [hosts,    setHosts]    = useState([])
  const [problems, setProblems] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const fetchZabbix = async () => {
    try {
      const [r, h, p] = await Promise.all([
        zabbixAPI.resume(),
        zabbixAPI.hosts(),
        zabbixAPI.problems(),
      ])
      setResume(r.data)
      setHosts(h.data)
      setProblems(p.data)
      setError(null)
    } catch {
      setError('Zabbix indisponible')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchZabbix()
    const id = setInterval(fetchZabbix, 30000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="bg-[#0D0D0D] border border-[#222] p-6 flex flex-col gap-4 hover:border-[#00FFD1] transition-colors duration-150">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={16} style={{ color: CYAN }} />
          <span className="font-mono uppercase tracking-widest text-gray-500" style={{ fontSize: 11 }}>
            Zabbix
          </span>
        </div>
        <span
          className="font-mono text-xs px-2 py-0.5 border"
          style={{ color: CYAN, borderColor: CYAN, fontSize: 10 }}
        >
          SOURCE EXTERNE
        </span>
      </div>

      {/* Loading / Error */}
      {loading && (
        <p className="font-mono text-gray-600 text-sm animate-pulse">Connexion à Zabbix...</p>
      )}
      {error && (
        <p className="font-mono text-sm" style={{ color: RED }}>{error}</p>
      )}

      {/* Résumé KPI */}
      {resume && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'HOSTS',      val: resume.total_hosts,    color: CYAN   },
            { label: 'EN LIGNE',   val: resume.hosts_ok,       color: CYAN   },
            { label: 'HORS LIGNE', val: resume.hosts_ko,       color: resume.hosts_ko    > 0 ? RED    : '#444' },
            { label: 'PROBLÈMES',  val: resume.total_problems, color: resume.total_problems > 0 ? YELLOW : '#444' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-[#111] border border-[#222] p-3 flex flex-col items-center gap-1">
              <span className="font-bold font-mono leading-none" style={{ color, fontSize: 32 }}>{val}</span>
              <span className="font-mono uppercase tracking-widest text-gray-600" style={{ fontSize: 9 }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Hosts */}
      {hosts.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="font-mono uppercase tracking-widest text-gray-600 mb-1" style={{ fontSize: 9 }}>
            Hosts supervisés
          </span>
          {hosts.map(h => (
            <div key={h.id} className="flex items-center gap-3 border-b border-[#111] py-1.5">
              {h.statut === 'EN_LIGNE'
                ? <CheckCircle2 size={13} style={{ color: CYAN, flexShrink: 0 }} />
                : <XCircle     size={13} style={{ color: RED,  flexShrink: 0 }} />
              }
              <span className="font-mono text-gray-300 flex-1" style={{ fontSize: 12 }}>{h.hostname}</span>
              <span className="font-mono text-gray-600" style={{ fontSize: 11 }}>{h.ip}</span>
              {h.nb_problems > 0 && (
                <span
                  className="font-mono px-1.5 py-0.5"
                  style={{ background: RED, color: '#fff', fontSize: 9, borderRadius: 3 }}
                >
                  {h.nb_problems} pb
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Problèmes actifs */}
      {problems.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="font-mono uppercase tracking-widest text-gray-600 mb-1" style={{ fontSize: 9 }}>
            Problèmes actifs
          </span>
          {problems.map(p => (
            <div key={p.id} className="flex items-start gap-3 border-b border-[#111] py-1.5">
              <AlertTriangle size={13} style={{ color: severityColor(p.severity), flexShrink: 0, marginTop: 2 }} />
              <div className="flex flex-col flex-1 gap-0.5">
                <span className="font-mono" style={{ color: severityColor(p.severity), fontSize: 9 }}>
                  {p.severity}
                </span>
                <span className="font-mono text-gray-400" style={{ fontSize: 11 }}>{p.message}</span>
                <span className="font-mono text-gray-600" style={{ fontSize: 10 }}>{p.hostname}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
