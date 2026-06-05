import { useState } from 'react'
import { utilisateursAPI } from '@/services/api'
import { Lock, Eye, EyeOff, Check, X } from 'lucide-react'

export default function ChangePassword({ userId, onSuccess }) {
  const [showForm, setShowForm] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState('success')

  const showToast = (msg, type = 'success') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(null), 4000)
  }

  // Calcul de la force du mot de passe
  const criteriaCount = [
    passwordData.new_password.length >= 8,
    /[A-Z]/.test(passwordData.new_password),
    /[0-9]/.test(passwordData.new_password),
    /[^A-Za-z0-9]/.test(passwordData.new_password)
  ].filter(Boolean).length

  let passwordStrengthColor = 'bg-gray-800'
  let passwordStrengthLabel = ''
  if (passwordData.new_password.length > 0) {
    if (criteriaCount <= 1) {
      passwordStrengthColor = 'bg-red-500'
      passwordStrengthLabel = 'FAIBLE'
    } else if (criteriaCount === 2) {
      passwordStrengthColor = 'bg-yellow-500'
      passwordStrengthLabel = 'MOYEN'
    } else if (criteriaCount === 3) {
      passwordStrengthColor = 'bg-cyan-400'
      passwordStrengthLabel = 'BON'
    } else {
      passwordStrengthColor = 'bg-green-500'
      passwordStrengthLabel = 'FORT'
    }
  }

  const passwordsMatch = passwordData.new_password.length > 0 && 
                         passwordData.confirm_password.length > 0 && 
                         passwordData.new_password === passwordData.confirm_password
  const passwordsMismatch = passwordData.new_password.length > 0 && 
                            passwordData.confirm_password.length > 0 && 
                            passwordData.new_password !== passwordData.confirm_password

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!passwordData.current_password) {
      showToast('Veuillez entrer votre mot de passe actuel', 'error')
      return
    }
    
    if (passwordData.new_password.length < 8) {
      showToast('Le nouveau mot de passe doit contenir au moins 8 caractères', 'error')
      return
    }
    
    if (passwordData.new_password !== passwordData.confirm_password) {
      showToast('Les mots de passe ne correspondent pas', 'error')
      return
    }

    setLoading(true)
    try {
      await utilisateursAPI.modifier(userId, { 
        mot_de_passe: passwordData.new_password 
      })
      showToast('Mot de passe modifié avec succès ✓', 'success')
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
      setShowForm(false)
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error('Erreur modification mot de passe:', error)
      showToast('Erreur lors de la modification du mot de passe', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setPasswordData({ current_password: '', new_password: '', confirm_password: '' })
    setShowForm(false)
  }

  return (
    <div className="w-full">
      {/* Toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 border font-mono text-xs px-4 py-3 flex items-center gap-2 rounded-none shadow-lg ${messageType === 'success' ? 'bg-[#051a05] border-green-500 text-green-400' : 'bg-[#1a0505] border-red-500 text-red-400'}`}>
          {messageType === 'success' ? <Check className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          {message}
        </div>
      )}

      {/* Bouton pour afficher/masquer le formulaire */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="border-2 border-cyan-400 bg-transparent text-cyan-400 font-mono text-sm uppercase px-6 py-3 hover:bg-cyan-400 hover:text-black transition-all flex items-center gap-2 rounded-none cursor-pointer font-bold tracking-wide"
        >
          <Lock className="w-4 h-4" />
          MODIFIER MON MOT DE PASSE
        </button>
      ) : (
        /* Formulaire de modification */
        <div className="border-2 border-cyan-400 bg-[#0a0f0a] p-8 rounded-none">
          {/* En-tête */}
          <div className="flex items-center justify-between mb-8 pb-6 border-b-2 border-cyan-400">
            <div className="flex items-center gap-3">
              <div className="border-2 border-cyan-400 p-2 rounded-none">
                <Lock className="w-5 h-5 text-cyan-400" />
              </div>
              <h3 className="font-mono font-bold text-cyan-400 uppercase text-lg tracking-wider">
                CHANGEMENT DE MOT DE PASSE
              </h3>
            </div>
            <button
              onClick={handleCancel}
              className="border border-gray-600 text-gray-400 hover:text-red-400 hover:border-red-400 p-1 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {/* CHAMP 1 — Mot de passe actuel */}
            <div className="flex flex-col gap-2">
              <label className="text-gray-400 text-xs font-mono uppercase font-bold tracking-wider">
                💠 Mot de passe actuel
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordData.current_password}
                  onChange={e => setPasswordData({...passwordData, current_password: e.target.value})}
                  required
                  placeholder="Entrez votre mot de passe actuel"
                  className="bg-[#0a0a0a] border border-gray-700 text-cyan-300 font-mono text-sm px-4 py-3 w-full focus:border-cyan-400 focus:outline-none placeholder-gray-600 pr-12 rounded-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-cyan-400 transition-colors"
                >
                  {showCurrentPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Séparateur */}
            <div className="border-t border-gray-800"></div>

            {/* CHAMP 2 — Nouveau mot de passe */}
            <div className="flex flex-col gap-2">
              <label className="text-gray-400 text-xs font-mono uppercase font-bold tracking-wider">
                🔐 Nouveau mot de passe (min 8 caractères)
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordData.new_password}
                  onChange={e => setPasswordData({...passwordData, new_password: e.target.value})}
                  required
                  placeholder="Créez un nouveau mot de passe sécurisé"
                  className="bg-[#0a0a0a] border border-gray-700 text-cyan-300 font-mono text-sm px-4 py-3 w-full focus:border-cyan-400 focus:outline-none placeholder-gray-600 pr-12 rounded-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-cyan-400 transition-colors"
                >
                  {showNewPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>

              {/* Barre de force */}
              {passwordData.new_password && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600 text-[10px] font-mono uppercase">Force du mot de passe</span>
                    <span className={`text-[10px] font-mono font-bold ${passwordStrengthColor === 'bg-red-500' ? 'text-red-500' : passwordStrengthColor === 'bg-yellow-500' ? 'text-yellow-500' : passwordStrengthColor === 'bg-cyan-400' ? 'text-cyan-400' : 'text-green-500'}`}>
                      {passwordStrengthLabel}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-gray-900 rounded-none overflow-hidden border border-gray-800">
                    <div 
                      className={`h-full transition-all duration-300 ${passwordStrengthColor}`} 
                      style={{ width: `${Math.min((criteriaCount / 4) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-mono">
                    <div className={`flex items-center gap-1 ${passwordData.new_password.length >= 8 ? 'text-green-400' : 'text-gray-600'}`}>
                      <span>{passwordData.new_password.length >= 8 ? '✓' : '○'}</span> Min 8 caractères
                    </div>
                    <div className={`flex items-center gap-1 ${/[A-Z]/.test(passwordData.new_password) ? 'text-green-400' : 'text-gray-600'}`}>
                      <span>{/[A-Z]/.test(passwordData.new_password) ? '✓' : '○'}</span> Lettre majuscule
                    </div>
                    <div className={`flex items-center gap-1 ${/[0-9]/.test(passwordData.new_password) ? 'text-green-400' : 'text-gray-600'}`}>
                      <span>{/[0-9]/.test(passwordData.new_password) ? '✓' : '○'}</span> Chiffre
                    </div>
                    <div className={`flex items-center gap-1 ${/[^A-Za-z0-9]/.test(passwordData.new_password) ? 'text-green-400' : 'text-gray-600'}`}>
                      <span>{/[^A-Za-z0-9]/.test(passwordData.new_password) ? '✓' : '○'}</span> Caractère spécial
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CHAMP 3 — Confirmer le mot de passe */}
            <div className="flex flex-col gap-2">
              <label className="text-gray-400 text-xs font-mono uppercase font-bold tracking-wider">
                ✓ Confirmer le mot de passe
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordData.confirm_password}
                  onChange={e => setPasswordData({...passwordData, confirm_password: e.target.value})}
                  required
                  placeholder="Répétez votre nouveau mot de passe"
                  className={`bg-[#0a0a0a] border text-cyan-300 font-mono text-sm px-4 py-3 w-full focus:outline-none placeholder-gray-600 pr-12 rounded-none transition-colors ${
                    passwordsMismatch ? 'border-red-500 focus:border-red-500' : 
                    passwordsMatch ? 'border-green-500 focus:border-green-500' : 
                    'border-gray-700 focus:border-cyan-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-cyan-400 transition-colors"
                >
                  {showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
              {passwordsMismatch && (
                <span className="text-red-500 text-xs font-mono mt-1 flex items-center gap-1">
                  <X className="w-3 h-3" /> Les mots de passe ne correspondent pas
                </span>
              )}
              {passwordsMatch && (
                <span className="text-green-400 text-xs font-mono mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Correspondance confirmée
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-end mt-8 pt-6 border-t border-gray-800">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="border border-gray-600 text-gray-400 font-mono text-sm uppercase px-6 py-2 hover:bg-gray-900 hover:border-gray-500 transition-colors rounded-none cursor-pointer disabled:opacity-50"
              >
                ANNULER
              </button>
              <button
                type="submit"
                disabled={loading || !passwordsMatch}
                className="bg-cyan-400 text-black font-mono text-sm uppercase px-8 py-2 font-bold hover:bg-cyan-300 transition-all rounded-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[150px]"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-black border-t-transparent animate-spin inline-block rounded-full" />
                ) : (
                  '✓ CONFIRMER & APPLIQUER'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
