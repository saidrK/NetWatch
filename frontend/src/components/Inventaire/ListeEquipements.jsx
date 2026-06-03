import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { equipementsAPI } from '@/services/api'
import { Terminal, Radar, Server, ChevronRight, ChevronDown } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function ListeEquipements() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [equipements, setEquipements] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanController, setScanController] = useState(null)
  
  // Custom states from v6
  const [subnet, setSubnet] = useState('192.168.1.0/24')
  const [expandedNodes, setExpandedNodes] = useState({})
  const [scanMessage, setScanMessage] = useState(null)

  const fetchEquipements = async () => {
    setLoading(true)
    try {
      const { data } = await equipementsAPI.lister()
      setEquipements(data)
      
      // Auto-expand first node like v6
      if (data && data.length > 0) {
        setExpandedNodes({ [data[0].id]: true })
      }
    } catch (error) {
      console.error('Erreur chargement équipements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScanClick = async () => {
    if (!isAdmin) return;
    const controller = new AbortController();
    setScanController(controller);
    setScanning(true)
    setScanMessage("Requête de scan asynchrone transmise au serveur...")
    try {
      await equipementsAPI.scanner(subnet, controller.signal)
      setTimeout(() => {
        setScanMessage("Scan asynchrone Nmap complété et base de données relationnelle mise à jour !")
        fetchEquipements()
      }, 3500)
    } catch (error) {
      if (error.name === 'CanceledError' || error.code === 'ECONNABORTED') {
        setScanMessage("Scan annulé par l'utilisateur")
      } else {
        setScanMessage(`Erreur: ${error.message || "Échec du scan"}`)
      }
    } finally {
      setScanning(false)
      setScanController(null)
    }
  }

  const annulerScan = () => {
    scanController?.abort()
    setScanning(false)
    setScanController(null)
    setScanMessage("Scan annulé")
  }

  useEffect(() => {
    fetchEquipements()
  }, [])

  const togglePorts = (nodeId) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }))
  }

  return (
    <div className="flex flex-col gap-8 crt-flicker font-mono p-6">
      {/* Page header */}
      <div className="border-b border-[#222] pb-6">
        <h2 className="text-2xl font-bold text-white uppercase tracking-widest mb-2">
          INVENTAIRE_RESEAU
        </h2>
        <p className="text-xs text-[#888] uppercase tracking-wider">
          Cartographie active Nmap & Modèles Relationnels • {isAdmin ? 'Admin' : 'Lecture seule'} (Infrastructure)
        </p>
      </div>

      {/* Mock terminal trigger option */}
      {isAdmin && (
        <div className="bg-[#0D0D0D] border border-[#222] p-6 flex flex-col gap-5">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-500">
              <Terminal className="w-5 h-5 text-gray-600" />
              <span className="text-sm text-gray-500 select-none ml-2">$</span>
            </div>
            <input
              type="text"
              value={subnet}
              onChange={(e) => setSubnet(e.target.value)}
              className="block w-full pl-14 pr-4 py-4 border-0 border-b border-[#222] bg-[#050505] text-white font-mono text-base focus:ring-0 focus:outline-none focus:border-[#00FFD1] placeholder:text-gray-800 transition-colors"
              placeholder="nmap -sn 192.168.1.0/24"
            />
          </div>

          {/* Scan Actions */}
          <div className="flex flex-col gap-4">
            {scanning ? (
              <button
                onClick={annulerScan}
                className="bg-transparent border border-red-500 text-red-500 text-black font-bold uppercase tracking-wider text-xs py-2 px-4 flex items-center gap-3 transition-all duration-100 rounded-none hover:bg-red-500/10"
              >
                <span className="text-base">⊗</span>
                <span className="tracking-[0.15em]">ANNULER LE SCAN</span>
              </button>
            ) : (
              <button
                onClick={handleScanClick}
                className="bg-transparent border border-cyan-400 text-cyan-400 text-black font-bold uppercase tracking-wider text-xs py-2 px-4 flex items-center gap-3 transition-all duration-100 rounded-none hover:bg-cyan-400 hover:text-black"
              >
                <Radar className="w-4 h-4" />
                <span className="tracking-[0.15em]">DÉCLENCHER SCAN ASYNC</span>
              </button>
            )}

            {scanMessage && (
              <div className="bg-[#050505] border border-[#222] px-4 py-3 text-xs text-gray-500 flex items-center gap-3">
                <span className="w-2.5 h-2.5 bg-[#FFD700] animate-pulse" />
                <span>{scanMessage}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section List Headers */}
      <div className="flex justify-between items-end border-b border-[#222] pb-4 mt-2">
        <h3 className="text-base font-bold text-white tracking-widest uppercase flex items-center gap-3">
          <Server className="w-5 h-5 text-[#00FFD1]" />
          NOEUDS DETECTÉS
        </h3>
        <span className="text-xs text-[#555] uppercase tracking-wider">{equipements.length} NŒUDS • RÉSEAU 192.168.1.0/24</span>
      </div>

      {/* Devices Layout */}
      <div className="flex flex-col gap-5">
        {loading ? (
          <div className="text-xs text-gray-500 italic py-6">Chargement des noeuds...</div>
        ) : equipements.length === 0 ? (
          <div className="text-xs text-gray-500 italic py-6">Aucun équipement trouvé.</div>
        ) : (
          equipements.map((eq) => {
            const isUp = eq.statut === 'EN_LIGNE';
            const isExpanded = !!expandedNodes[eq.id];
            const nodePorts = eq.ports || [];
            
            // Equipment name display rule
            const displayName = (eq.hostname && eq.hostname.trim() !== '') 
              ? eq.hostname.toUpperCase() 
              : (eq.adresse_ip || eq.ip || 'UNKNOWN').toUpperCase();
            
            // Type badge color
            const getTypeBadgeColor = () => {
              const type = (eq.type || '').toUpperCase();
              if (type === 'SERVEUR') return 'border-blue-400 text-blue-400';
              if (type === 'ROUTEUR') return 'border-yellow-400 text-yellow-400';
              if (type === 'SWITCH') return 'border-purple-400 text-purple-400';
              if (type === 'CLIENT') return 'border-gray-400 text-gray-400';
              return 'border-gray-600 text-gray-600';
            };

            return (
              <div
                key={eq.id}
                className={`bg-[#0D0D0D] border p-6 flex flex-col gap-3 relative transition-all duration-100 ${
                  isUp ? 'border-l-2 border-cyan-400 border-[#222] hover:border-[#00FFD1]' : 'border-l-2 border-red-500 border-[#222]'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 
                        onClick={() => navigate(`/inventaire/${eq.id}`)}
                        className="font-mono font-bold text-sm text-white uppercase tracking-wider cursor-pointer hover:text-[#00FFD1] hover:underline"
                      >
                        {displayName}
                      </h4>
                      <span className={`bg-transparent border text-[9px] font-mono uppercase px-1.5 py-0.5 ${getTypeBadgeColor()}`}>
                        {(eq.type || 'INCONNU').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 font-mono">
                      {eq.adresse_ip || eq.ip || 'N/A'} • Type: {eq.type || 'Inconnu'}
                    </p>
                  </div>

                  {/* Status Badging */}
                  <span className={`border text-[10px] font-mono px-2 py-0.5 ${
                    isUp 
                      ? 'border-cyan-400 text-cyan-400' 
                      : 'border-red-500 text-red-500'
                  }`}>
                    {isUp ? 'UP' : 'DOWN'}
                  </span>
                </div>

                {/* Collapsible Ports Control Toggle */}
                <button
                  onClick={() => togglePorts(eq.id)}
                  className="text-left mt-2 flex items-center gap-2 text-cyan-500 text-[10px] font-mono uppercase cursor-pointer hover:text-cyan-300 bg-transparent border-none transition-colors select-none"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                  <span>{isExpanded ? '▼ MASQUER LES PORTS' : '▶ AFFICHER LES PORTS DÉTECTÉS'}</span>
                </button>

                {/* Details collapsible content */}
                {isExpanded && (
                  <div className="mt-3 bg-[#050505] border border-[#222] p-4 flex flex-col gap-3">
                    
                    {nodePorts.length > 0 ? (
                      <>
                        <div className="grid grid-cols-3 text-[10px] text-gray-500 font-mono uppercase border-b border-gray-700 pb-2 bg-[#0a1a0a]">
                          <span>PORT / PROTOCOLE</span>
                          <span>STATUT</span>
                          <span>SERVICE SUPERVISÉ</span>
                        </div>
                        
                        {nodePorts.map((port) => (
                          <div
                            key={port.id}
                            className="grid grid-cols-3 text-xs border-b border-[#222]/50 pb-2 pt-2 last:border-0"
                          >
                            <span className="font-mono text-cyan-300">
                              {port.numero}/{port.protocole}
                            </span>
                            <span className={`font-mono ${
                              port.statut === 'open' ? 'text-cyan-400' : 
                              port.statut === 'filtered' ? 'text-yellow-400' : 
                              'text-red-400'
                            }`}>
                              {port.statut?.toUpperCase()}
                            </span>
                            <span className="font-mono text-gray-300 uppercase text-xs">
                              {port.service}
                            </span>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="text-gray-600 text-[10px] font-mono italic py-3 px-4">
                        -- AUCUN PORT DÉTECTÉ -- RELANCER UN SCAN NMAP
                      </div>
                    )}
                    
                    <div className="mt-3 text-xs text-gray-600 font-mono">
                      Vu: {eq.dernier_vu ? new Date(eq.dernier_vu).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  )
}
