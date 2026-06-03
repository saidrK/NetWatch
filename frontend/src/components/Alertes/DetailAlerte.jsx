import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { alertesAPI } from '@/services/api'
import { ArrowLeft, AlertTriangle, Cpu, HardDrive, Network, Clock, CheckCircle2, ShieldAlert, BadgeInfo } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function DetailAlerte() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [alerte, setAlerte] = useState(null)
  const [loading, setLoading] = useState(true)
  const [acquitting, setAcquitting] = useState(false)

  useEffect(() => {
    const fetchAlerte = async () => {
      try {
        const { data } = await alertesAPI.get(id)
        setAlerte(data)
      } catch (error) {
        console.error('Erreur chargement alerte:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAlerte()
  }, [id])

  const handleAcquitter = async () => {
    setAcquitting(true)
    try {
      await alertesAPI.acquitter(id)
      setAlerte({ ...alerte, acquittee: true, acquittee_par: user?.login || 'Admin', date_acquittement: new Date().toISOString() })
    } catch (error) {
      console.error('Erreur acquittement:', error)
    } finally {
      setAcquitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 font-mono">
        <p className="text-gray-500 italic text-[10px]">Chargement des données de l'incident...</p>
      </div>
    )
  }

  if (!alerte) {
    return (
      <div className="flex items-center justify-center h-64 font-mono text-[10px]">
        <p className="text-[#FF4E00]">ERR_ALRT_NOT_FOUND: Incident inexistant.</p>
      </div>
    )
  }

  const isCritical = alerte.niveau === 'CRITIQUE'
  const isWarning = alerte.niveau === 'WARNING'
  const isAcquitted = alerte.acquittee

  return (
    <div className="flex flex-col gap-6 crt-flicker font-mono pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-[#222] pb-4">
        <button 
          onClick={() => navigate('/alertes')} 
          className="border border-[#222] hover:border-[#00FFD1] hover:text-[#00FFD1] p-2 bg-[#050505] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-widest flex items-center gap-2">
              INCIDENT_DÉTECTÉ #{alerte.id}
              {isCritical && (
                <span className="bg-[#FF4E00] text-black px-2 py-0.5 text-[9px] font-bold flex items-center gap-1 hover:brightness-110 ml-2">
                  <ShieldAlert className="w-3.5 h-3.5" /> CRITICAL
                </span>
              )}
              {isWarning && (
                <span className="bg-[#FFD700] text-black px-2 py-0.5 text-[9px] font-bold flex items-center gap-1 hover:brightness-110 ml-2">
                  <AlertTriangle className="w-3.5 h-3.5" /> WARNING
                </span>
              )}
              {alerte.niveau === 'INFO' && (
                <span className="bg-[#00FFD1] text-black px-2 py-0.5 text-[9px] font-bold flex items-center gap-1 hover:brightness-110 ml-2">
                  <BadgeInfo className="w-3.5 h-3.5" /> INFO
                </span>
              )}
            </h2>
            <p className="text-[10px] text-[#888] mt-1 tracking-wider uppercase flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#00FFD1]" />
              T-{new Date(alerte.timestamp).toLocaleString()}
            </p>
          </div>

          {!isAcquitted ? (
            <button
              onClick={handleAcquitter}
              disabled={acquitting}
              className={`border px-4 py-2 text-[10px] uppercase font-bold tracking-wider hover:cursor-pointer transition-colors flex items-center gap-1.5 select-none ${
                isCritical
                  ? 'border-[#FF4E00]/50 hover:bg-[#FF4E00] hover:text-black bg-[#FF4E00]/5 text-[#FF4E00]'
                  : isWarning
                    ? 'border-[#FFD700]/50 hover:bg-[#FFD700] hover:text-black bg-[#FFD700]/5 text-[#FFD700]'
                    : 'border-[#00FFD1]/50 hover:bg-[#00FFD1] hover:text-black bg-[#00FFD1]/5 text-[#00FFD1]'
              }`}
            >
              {acquitting ? (
                <>
                  <span className="w-3 h-3 border-2 border-current border-t-transparent animate-spin inline-block" />
                  TRAITEMENT
                </>
              ) : (
                'ACQUITTER INCIDENT'
              )}
            </button>
          ) : (
            <div className="text-[10px] text-gray-500 border border-[#222] bg-[#111] px-3 py-1.5 uppercase font-bold tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-gray-500" />
              RÉSOLU
            </div>
          )}
        </div>
      </div>

      {/* Informations générales */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-[#0D0D0D] border border-[#222] p-4 flex flex-col gap-2">
          <div className="text-[9px] font-bold text-[#555] uppercase tracking-widest flex items-center gap-1.5">
            CODE_ALERTE
          </div>
          <div className={`text-sm uppercase font-bold mt-1 tracking-widest ${
            isCritical ? 'text-[#FF4E00]' : isWarning ? 'text-[#FFD700]' : 'text-[#00FFD1]'
          }`}>
            {alerte.code_erreur || `ALRT-${alerte.id}`}
          </div>
        </div>

        <div className="bg-[#0D0D0D] border border-[#222] p-4 flex flex-col gap-2">
          <div className="text-[9px] font-bold text-[#555] uppercase tracking-widest flex items-center gap-1.5">
            ÉTAT
          </div>
          <div className="text-sm text-white uppercase font-bold mt-1 tracking-widest">
            {alerte.acquittee ? 'ACQUITTÉE' : 'EN ATTENTE'}
          </div>
        </div>

        <div 
          className="bg-[#0D0D0D] border border-[#222] p-4 flex flex-col gap-2 cursor-pointer hover:border-[#00FFD1] transition-colors"
          onClick={() => alerte.equipement_id && navigate(`/inventaire/${alerte.equipement_id}`)}
        >
          <div className="text-[9px] font-bold text-[#555] uppercase tracking-widest flex items-center gap-1.5">
            NOEUD_CIBLE (SRC_IP)
          </div>
          <div className={`text-sm font-bold mt-1 tracking-widest ${alerte.equipement_id ? 'text-[#00FFD1] underline decoration-[#00FFD1]/30' : 'text-gray-500 italic'}`}>
            {alerte.equipement_id ? `NOEUD #${alerte.equipement_id}` : 'NON_DÉFINI'}
          </div>
        </div>
      </div>

      {/* Message de l'alerte */}
      <div className="bg-[#0D0D0D] border border-[#222] flex flex-col relative overflow-hidden">
        {/* Color stripe */}
        <div className={`absolute top-0 left-0 bottom-0 w-1 ${
          isCritical ? 'bg-[#FF4E00]' : isWarning ? 'bg-[#FFD700]' : 'bg-[#00FFD1]'
        }`} />
        
        <div className="border-b border-[#222] p-3 bg-[#111] pl-4">
          <h3 className="text-sm font-bold text-white tracking-widest uppercase">
            PAYLOAD_MESSAGE
          </h3>
        </div>
        <div className="p-4 pl-5">
          <p className="text-sm text-gray-300 leading-relaxed font-mono">
            {alerte.message}
          </p>
        </div>
      </div>

      {/* Métriques au moment de l'alerte */}
      {(alerte.valeur_cpu !== undefined || alerte.valeur_ram !== undefined || alerte.valeur_bp_entrant !== undefined) && (
        <div className="bg-[#0D0D0D] border border-[#222] flex flex-col mt-2">
          <div className="border-b border-[#222] p-3 bg-[#111]">
            <h3 className="text-sm font-bold text-white tracking-widest uppercase">
              SNAPSHOT_TÉLÉMÉTRIE (T-0)
            </h3>
            <p className="text-[10px] text-gray-500 mt-0.5">Valeurs enregistrées au déclenchement.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-[#222]">
            {alerte.valeur_cpu !== undefined && (
              <div className="p-4 flex items-center gap-4 hover:bg-[#111] transition-colors">
                <Cpu className="h-6 w-6 text-[#00FFD1]" />
                <div>
                  <p className="text-[9px] text-[#555] uppercase tracking-widest font-bold">CHARGE_CPU</p>
                  <p className="font-bold text-white text-lg">{alerte.valeur_cpu.toFixed(1)}%</p>
                </div>
              </div>
            )}
            {alerte.valeur_ram !== undefined && (
              <div className="p-4 flex items-center gap-4 hover:bg-[#111] transition-colors">
                <HardDrive className="h-6 w-6 text-[#00FFD1]" />
                <div>
                  <p className="text-[9px] text-[#555] uppercase tracking-widest font-bold">UTILISATION_RAM</p>
                  <p className="font-bold text-white text-lg">{alerte.valeur_ram.toFixed(1)}%</p>
                </div>
              </div>
            )}
            {alerte.valeur_bp_entrant !== undefined && (
              <div className="p-4 flex items-center gap-4 hover:bg-[#111] transition-colors">
                <Network className="h-6 w-6 text-[#FFD700]" />
                <div>
                  <p className="text-[9px] text-[#555] uppercase tracking-widest font-bold">TRAFIC_ENTRANT</p>
                  <p className="font-bold text-white text-lg">{alerte.valeur_bp_entrant.toFixed(2)} <span className="text-xs text-gray-400">Mbps</span></p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Score IA */}
      {alerte.score_ia !== undefined && (
        <div className="bg-[#050505] border border-l-2 border-l-[#FF4E00] border-[#222] p-4 flex items-center justify-between mt-2">
          <div>
            <h3 className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">
              MOTEUR_IA (ISOLATION_FOREST)
            </h3>
            <p className="text-[9px] text-gray-600 mt-1 uppercase">Indice de confiance d'anomalie.</p>
          </div>
          <div className="text-2xl font-bold text-[#FF4E00] font-mono">
            {alerte.score_ia.toFixed(3)}
          </div>
        </div>
      )}

      {/* Historique d'acquittement */}
      {alerte.acquittee && (
        <div className="bg-[#0D0D0D] border border-[#222] p-4 flex items-start gap-4 opacity-75 mt-2">
          <CheckCircle2 className="h-5 w-5 text-gray-500 mt-0.5" />
          <div>
            <h3 className="text-xs font-bold text-white tracking-widest uppercase mb-1">
              LOG_RÉSOLUTION
            </h3>
            <p className="text-[11px] text-gray-400">
              Acquittée par l'opérateur : <strong className="text-gray-200">{alerte.acquittee_par || 'USER_UNKNOWN'}</strong>
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Horodatage : {alerte.date_acquittement ? new Date(alerte.date_acquittement).toLocaleString() : 'TIMESTAMP_MISSING'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
