import { useState } from 'react'
import { rapportsAPI } from '@/services/api'
import { PlusCircle, CheckCircle } from 'lucide-react'

export default function GenererRapport({ onRapportGenere }) {
  const [titre, setTitre] = useState('')
  const [periodeDebut, setPeriodeDebut] = useState('')
  const [periodeFin, setPeriodeFin] = useState('')
  const [format, setFormat] = useState('PDF')
  const [generating, setGenerating] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGenerating(true)
    try {
      const rapportData = {
        titre,
        periode_debut: new Date(periodeDebut).toISOString(),
        periode_fin: new Date(periodeFin).toISOString(),
        format,
      }
      await rapportsAPI.generer(rapportData)
      onRapportGenere()
      setTitre('')
      setPeriodeDebut('')
      setPeriodeFin('')
      setSuccessMsg('Nouveau rapport de supervision compilé avec succès !')
      setShowForm(false)
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (error) {
      console.error('Erreur génération rapport:', error)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 font-mono">
      {/* === 4. BOUTON GÉNÉRER NOUVEAU RAPPORT === */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border-2 border-cyan-400 text-cyan-400 font-mono text-sm uppercase font-bold py-3 px-4 hover:bg-cyan-400/10 hover:shadow-lg transition-all rounded-none flex items-center justify-center gap-3 cursor-pointer"
          style={{
            boxShadow: '0 0 15px rgba(0, 212, 255, 0.1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.1)'
          }}
        >
          <PlusCircle className="w-5 h-5" />
          <span>GÉNÉRER NOUVEAU RAPPORT</span>
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-[#0D0D0D] border border-cyan-400/30 p-6 flex flex-col gap-5 transition-all rounded-none"
        >
          <div className="flex justify-between items-center border-[#222]/60 border-b pb-4">
            <span className="text-sm font-black text-cyan-400 uppercase tracking-wider">
              FORMULAIRE: COMPILATION DE SYNTHÈSE
            </span>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 hover:text-white cursor-pointer uppercase rounded-none"
            >
              ANNULER
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500 uppercase font-black">Titre de la Synthèse</label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex: Analyse Réseau - 2026-06"
              required
              className="w-full bg-[#050505] border border-gray-700 text-white p-3 outline-none focus:border-cyan-400 text-sm font-mono rounded-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-500 uppercase font-black">T-START (Début)</label>
              <input
                type="datetime-local"
                value={periodeDebut}
                onChange={(e) => setPeriodeDebut(e.target.value)}
                required
                className="w-full bg-[#050505] border border-gray-700 text-white p-3 outline-none focus:border-cyan-400 text-sm font-mono rounded-none"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-gray-500 uppercase font-black">T-END (Fin)</label>
              <input
                type="datetime-local"
                value={periodeFin}
                onChange={(e) => setPeriodeFin(e.target.value)}
                required
                className="w-full bg-[#050505] border border-gray-700 text-white p-3 outline-none focus:border-cyan-400 text-sm font-mono rounded-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-gray-500 uppercase font-black">Format d'Export</label>
            <div className="flex gap-3">
              {['PDF', 'EXCEL', 'CSV'].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`flex-1 py-3 border text-sm font-bold uppercase tracking-widest transition-colors cursor-pointer rounded-none ${
                    format === f
                      ? 'border-cyan-400 bg-cyan-400/10 text-cyan-400'
                      : 'border-gray-700 text-gray-500 hover:border-gray-500'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={generating}
            className="w-full bg-cyan-400 text-black font-bold uppercase tracking-wider text-sm py-4 hover:bg-cyan-300 transition-colors cursor-pointer flex items-center justify-center gap-3 rounded-none mt-2"
          >
            {generating ? (
              <>
                <span className="w-4 h-4 border-2 border-black border-t-transparent animate-spin inline-block rounded-full" />
                GÉNÉRATION EN COURS...
              </>
            ) : (
              'VALIDER ET SAUVEGARDER EN BASE SQL'
            )}
          </button>
        </form>
      )}

      {successMsg && (
        <div className="bg-[#050505] border border-green-500/50 px-4 py-3 text-sm text-green-400 flex items-center gap-3 rounded-none">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span>{successMsg}</span>
        </div>
      )}
    </div>
  )
}
