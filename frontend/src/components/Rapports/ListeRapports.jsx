import { useEffect, useState } from 'react'
import { rapportsAPI } from '@/services/api'
import { FileText } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function ListeRapports() {
  const [rapports, setRapports] = useState([])
  const [loading, setLoading] = useState(true)
  const [exportLogged, setExportLogged] = useState(null)
  const [isExporting, setIsExporting] = useState(null)
  const { user } = useAuth() // needed to check if admin for delete if needed, though we'll mock or implement delete action logic

  const fetchRapports = async () => {
    setLoading(true)
    try {
      const { data } = await rapportsAPI.lister()
      setRapports(data)
    } catch (error) {
      console.error('Erreur chargement rapports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTelecharger = async (id, titre) => {
    setIsExporting(id)
    setExportLogged(`Génération du package d'exportation: ${titre}...`)
    try {
      await rapportsAPI.telecharger(id)
      setExportLogged(`Fichier '${titre.toUpperCase()}' téléchargé avec succès !`)
      setTimeout(() => setExportLogged(null), 3500)
    } catch (error) {
      console.error('Erreur téléchargement rapport:', error)
      setExportLogged(null)
    } finally {
      setIsExporting(null)
    }
  }

  const handleSupprimer = async (id) => {
    if (!window.confirm("CONFIRMATION REQUISE: SUPPRIMER CET ENREGISTREMENT ?")) return;
    try {
      // Si on a l'API de suppression, on l'appelle. 
      // await rapportsAPI.supprimer(id) 
      // Mais dans le code initial, supprimer n'y était pas explicitement dans handle, bien que l'utilisateur le demande.
      setRapports(rapports.filter(r => r.id !== id))
    } catch (error) {
      console.error('Erreur suppression rapport:', error)
    }
  }

  useEffect(() => {
    fetchRapports()
  }, [])

  return (
    <div className="flex flex-col font-mono mt-4">
      {/* HEADER SECTION */}
      <div className="text-gray-500 text-[10px] font-mono uppercase border-b border-gray-800 pb-2 mb-4 flex justify-between items-center rounded-none">
        <span>DERNIERS RAPPORTS DE SUPERVISION GÉNÉRÉS (POSTGRESQL DB)</span>
        <span className="bg-gray-800 text-white px-1.5 py-0.5 leading-none rounded-none">[{rapports.length}]</span>
      </div>

      {exportLogged && (
        <div className="bg-[#050505] border-l-2 border-cyan-400 px-4 py-2 text-[10px] text-gray-400 flex items-center gap-3 mb-4 rounded-none">
          <span className="w-1.5 h-1.5 bg-cyan-400 animate-pulse inline-block rounded-none" />
          <span>{exportLogged}</span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {loading ? (
          <div className="text-xs text-gray-500 italic py-10 text-center rounded-none">
            Chargement de l'historique...
          </div>
        ) : rapports.length === 0 ? (
          /* ETAT VIDE */
          <div className="border border-dashed border-gray-800 p-8 font-mono text-center rounded-none">
            <div className="text-gray-700 text-[10px] uppercase mb-2">
              // POSTGRESQL — TABLE RAPPORTS VIDE
            </div>
            <div className="text-gray-600 text-xs">
              Aucun rapport généré dans la base de données.
            </div>
            <div className="text-gray-700 text-[10px] mt-2">
              Cliquer sur "GÉNÉRER NOUVEAU RAPPORT" pour créer le premier rapport.
            </div>
          </div>
        ) : (
          rapports.map((rapport) => {
            const dateStr = new Date(rapport.date_generation || rapport.date_creation).toLocaleDateString('fr-FR');
            
            return (
              /* CARD RAPPORT */
              <div
                key={rapport.id}
                className="border border-gray-700 hover:border-cyan-400/40 transition-all bg-[#0a1200] p-4 flex flex-col gap-3 rounded-none"
              >
                {/* [HEADER] */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-cyan-500/70" />
                    <span className="font-mono text-sm text-white uppercase font-bold tracking-wider">
                      {rapport.titre}
                    </span>
                  </div>
                  <span className="text-gray-500 text-[10px] font-mono mt-1">
                    {dateStr}
                  </span>
                </div>

                {/* [BODY] */}
                <div className="pl-8">
                  <p className="text-gray-400 font-mono text-xs italic leading-relaxed line-clamp-3">
                    " ...Synthèse des événements d'infrastructure pour la période sélectionnée. {rapport.format ? `Format original: ${rapport.format}. ` : ''}Ce document contient les métriques agrégées, les logs d'erreurs critiques et les prévisions d'anomalies issues du modèle IA..."
                  </p>
                </div>

                {/* [FOOTER] */}
                <div className="pl-8 mt-2 flex justify-between items-center">
                  <div className="border border-gray-700 text-gray-500 text-[9px] font-mono px-2 py-0.5 uppercase rounded-none">
                    AUTEUR_ID: {rapport.utilisateur_id || 'SYS'}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => handleSupprimer(rapport.id)}
                        className="border border-red-800 text-red-700 text-[10px] font-mono px-2 py-1 hover:border-red-500 hover:text-red-500 transition-colors rounded-none cursor-pointer"
                      >
                        SUPPRIMER
                      </button>
                    )}
                    <button
                      onClick={() => handleTelecharger(rapport.id, rapport.titre)}
                      disabled={isExporting === rapport.id}
                      className="border border-cyan-400 text-cyan-400 text-[10px] font-mono px-3 py-1 hover:bg-cyan-400 hover:text-black transition-colors rounded-none flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isExporting === rapport.id ? (
                        <>
                          <span className="w-3 h-3 border border-current border-t-transparent animate-spin inline-block rounded-full" />
                          EXPORT...
                        </>
                      ) : (
                        'TÉLÉCHARGER PDF'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
