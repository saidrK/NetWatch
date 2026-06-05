import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { equipementsAPI } from '@/services/api'
import { ArrowLeft, Server, Network, Clock, Shield } from 'lucide-react'

export default function DetailEquipement() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [equipement, setEquipement] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEquipement = async () => {
      try {
        const { data } = await equipementsAPI.get(id)
        setEquipement(data)
      } catch (error) {
        console.error('Erreur chargement équipement:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchEquipement()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 font-mono">
        <p className="text-gray-500 italic text-[10px]">Chargement des données du noeud...</p>
      </div>
    )
  }

  if (!equipement) {
    return (
      <div className="flex items-center justify-center h-64 font-mono text-[10px]">
        <p className="text-[#FF4E00]">ERR_NODE_NOT_FOUND: Noeud inexistant.</p>
      </div>
    )
  }

  const isUp = equipement.statut === 'EN_LIGNE'

  return (
    <div className="flex flex-col gap-6 crt-flicker font-mono pb-10 p-6">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-[#222] pb-4">
        <button 
          onClick={() => navigate('/inventaire')} 
          className="border border-[#222] hover:border-[#00FFD1] hover:text-[#00FFD1] p-2 bg-[#050505] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
            {equipement.hostname || 'UNNAMED_NODE'}
            {isUp ? (
              <span className="border border-[#00FFD1]/40 text-[#00FFD1] px-2 py-0.5 text-[9px] tracking-widest font-bold uppercase bg-[#00FFD1]/5 ml-2">UP</span>
            ) : (
              <span className="bg-[#FFD700] text-black px-2 py-0.5 text-[9px] tracking-widest font-bold uppercase animate-pulse ml-2">DOWN</span>
            )}
          </h2>
          <p className="text-[10px] text-[#888] mt-1 tracking-wider uppercase">
            {equipement.adresse_ip} • NODE ID: {equipement.id}
          </p>
        </div>
      </div>

      {/* Informations générales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-[#0D0D0D] border border-[#222] p-4 flex flex-col gap-2">
          <div className="text-[9px] font-bold text-[#555] uppercase tracking-widest flex items-center gap-1.5">
            <Server className="h-3 w-3" /> TYPE_MATÉRIEL
          </div>
          <div className="text-sm text-white uppercase font-bold mt-1">
            {equipement.type || 'INCONNU'}
          </div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#222] p-4 flex flex-col gap-2">
          <div className="text-[9px] font-bold text-[#555] uppercase tracking-widest flex items-center gap-1.5">
            <Network className="h-3 w-3" /> ADRESSE_MAC
          </div>
          <div className="text-sm text-white uppercase font-bold mt-1">
            {equipement.adresse_mac || 'NON_DÉTECTÉE'}
          </div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#222] p-4 flex flex-col gap-2">
          <div className="text-[9px] font-bold text-[#555] uppercase tracking-widest flex items-center gap-1.5">
            <Shield className="h-3 w-3" /> OS_EMBARQUÉ
          </div>
          <div className="text-sm text-white uppercase font-bold mt-1">
            {equipement.os_detecte || 'FINGERPRINT_FAILED'}
          </div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#222] p-4 flex flex-col gap-2">
          <div className="text-[9px] font-bold text-[#555] uppercase tracking-widest flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> DERNIER_PULL
          </div>
          <div className="text-sm text-gray-300 mt-1 uppercase text-xs">
            {equipement.dernier_vu
              ? new Date(equipement.dernier_vu).toLocaleString()
              : 'JAMAIS'}
          </div>
        </div>
      </div>

      {/* Ports et services */}
      <div className="bg-[#0D0D0D] border border-[#222] p-0 flex flex-col mt-4">
        <div className="border-b border-[#222] p-4 bg-[#111]">
          <h3 className="text-sm font-bold text-white tracking-widest uppercase">
            MATRICE_DES_PORTS ({equipement.ports?.length || 0})
          </h3>
          <p className="text-[10px] text-gray-500 mt-1">TCP/UDP services mapping for this specific node.</p>
        </div>

        <div className="p-4">
          {equipement.ports && equipement.ports.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-[1fr_1fr_1fr_2fr] text-[10px] text-[#444] uppercase font-black border-b border-[#222] pb-2 px-2">
                <span>PORT</span>
                <span>PROTOCOLE</span>
                <span>STATUT</span>
                <span>SERVICE SUPERVISÉ</span>
              </div>
              {equipement.ports.map((port) => (
                <div
                  key={port.id}
                  className="grid grid-cols-[1fr_1fr_1fr_2fr] text-xs text-gray-400 border-b border-[#222]/50 pb-2 pt-2 px-2 last:border-0 hover:bg-[#1A1A1A] transition-colors"
                >
                  <span className="font-bold text-white">
                    {port.numero}
                  </span>
                  <span className="uppercase text-[10.5px]">
                    {port.protocole}
                  </span>
                  <span className={port.statut === 'open' || port.ouvert ? 'text-[#00FFD1] font-semibold' : 'text-[#FF4E00]'}>
                    {(port.statut || (port.ouvert ? 'open' : 'closed')).toUpperCase()}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="uppercase text-[10.5px] tracking-wide text-gray-300 font-bold">
                      {port.service || 'UNASSIGNED'}
                    </span>
                    {port.service_version && (
                      <span className="text-[9px] text-[#888]">{port.service_version}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-gray-600 italic py-4 flex items-center justify-center border border-dashed border-[#222]">
              Aucun port ouvert détecté.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
