import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Terminal, Shield, LogIn, Award, Users, Loader2, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function Login() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  // Intercepter le message de déconnexion (401/Invalidation)
  // ✅ import statique + useEffect dans le corps du composant (Rules of Hooks)
  useEffect(() => {
    const msg = sessionStorage.getItem('auth_message')
    if (msg) {
      setErreur(msg)
      sessionStorage.removeItem('auth_message')
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      setErreur("Veuillez saisir votre email / identifiant")
      return
    }
    setErreur(null)
    
    try {
      await login(email.trim(), motDePasse)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      if (!error.response) {
        setErreur('Serveur injoignable. Vérifiez que le backend tourne (port 8000).')
      } else {
        const detail = error.response?.data?.detail
        setErreur(typeof detail === 'string' ? detail : 'Identifiants incorrects')
      }
    }
  }

  const selectPreset = (emailValue, passValue) => {
    setEmail(emailValue)
    setMotDePasse(passValue)
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 crt-flicker bg-[#050505]">
      <div className="w-full max-w-md bg-[#0D0D0D] border border-[#222] p-6 shadow-[0_0_30px_rgba(0,255,209,0.05)] flex flex-col gap-6 relative">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-[#00FFD1] shadow-[0_0_10px_#00FFD1]" />
        
        {/* PFE Academic Header block */}
        <div className="text-center border-b border-[#222] pb-4 flex flex-col gap-1.5">
          <div className="flex justify-center items-center gap-1.5 text-[#00FFD1]">
            <Award className="w-5 h-5 animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.25em] font-bold font-mono">FSBM CASABLANCA</span>
          </div>
          <h1 className="text-sm font-bold tracking-widest uppercase text-white font-mono mt-1">
            Plateforme de Supervision Réseau
          </h1>
          <p className="text-[10px] text-[#888] uppercase font-mono tracking-wider">
            PROJET DE FIN D'ÉTUDES — ANNÉE 2025/2026
          </p>
        </div>

        {/* Academic Details Section */}
        <div className="bg-[#050505] border border-[#222] p-3 flex flex-col gap-1.5 text-xs text-[#888] font-mono leading-relaxed">
          <div className="flex items-center gap-2 text-white font-bold text-[10px] uppercase border-b border-[#222]/50 pb-1 mb-1">
            <Users className="w-3.5 h-3.5 text-[#00FFD1]" />
            Équipe de Recherche
          </div>
          <p><strong className="text-white">Étudiants :</strong> Said Roukissy & Taha Moukhalid</p>
          <p><strong className="text-white">Encadrante :</strong> Pr. Ichrak Benamri</p>
          <p><strong className="text-white">Branche :</strong> main (merges via Github PR)</p>
        </div>

        {/* Action Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-mono">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#555] uppercase font-bold tracking-widest flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-[#00FFD1]" />
              Identifiant (Email)
            </label>
            <input
              type="text"
              id="login-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@supervision.local"
              disabled={loading}
              className="cyber-input"
              aria-label="Adresse email ou identifiant"
              aria-required="true"
              autoComplete="username"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-[#555] uppercase font-bold tracking-widest flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-[#00FFD1]" />
              Clé d'accès securisée (Password)
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="login-password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="cyber-input w-full pr-10"
                aria-label="Mot de passe"
                aria-required="true"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#00FFD1] transition-colors focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {erreur && (
            <div className="bg-[#FF4E00]/10 border border-[#FF4E00] text-[#FF4E00] p-2 text-xs font-mono uppercase text-center mt-1">
              ERR_CODE: {erreur}
            </div>
          )}

          <button
            type="submit"
            id="login-submit"
            disabled={loading}
            aria-busy={loading}
            aria-label="Se connecter à la plateforme"
            className="w-full bg-[#00FFD1] text-black font-bold uppercase tracking-[0.2em] text-xs py-3 mt-2 hover:bg-[#33ffd8] transition-colors duration-100 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {loading ? 'CONNEXION EN COURS...' : 'INITIALISER LA SESSION'}
          </button>
        </form>

        {/* Roles Presets */}
        <div className="border-t border-[#222] pt-4 flex flex-col gap-2 font-mono">
          <span className="text-[9px] text-[#444] uppercase tracking-widest text-center">
            PROTOTYPE: COMPTES DE TEST DISPONIBLES
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => selectPreset('admin@supervision.local', 'Admin2026!')}
              type="button"
              className="border border-[#00FFD1] hover:bg-[#00FFD1]/10 p-2 text-left hover:text-[#00FFD1] transition-colors flex flex-col gap-0.5"
            >
              <span className="font-bold uppercase text-white col-span-2">ADMIN</span>
              <span className="text-[9px] text-[#888]">Supervision & Infra</span>
            </button>
            <button
              onClick={() => selectPreset('technicien@supervision.local', 'Tech@1234')}
              type="button"
              className="border border-[#FFD700] hover:bg-[#FFD700]/10 p-2 text-left hover:text-[#FFD700] transition-colors flex flex-col gap-0.5"
            >
              <span className="font-bold uppercase text-white">TECHNICIEN</span>
              <span className="text-[9px] text-[#888]">Lecture seule / Scan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
