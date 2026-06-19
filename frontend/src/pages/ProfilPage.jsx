import { useAuth } from '@/hooks/useAuth'
import ChangePassword from '@/components/Profil/ChangePassword'
import { Shield, Mail, Terminal, Check, AlertCircle, Globe } from 'lucide-react'

export default function ProfilPage() {
  const { user } = useAuth()

  // Calcul des initiales
  const nom = user?.nom || 'UTILISATEUR'
  const login = user?.login || ''
  const role = user?.role || 'T'
  
  let initiales = 'XX'
  if (nom.toUpperCase() === 'ADMINISTRATEUR') {
    initiales = 'AD'
  } else if (nom.length > 0) {
    const secondChar = login.length > 0 ? login[0] : role[0]
    initiales = `${nom[0].toUpperCase()}${secondChar.toUpperCase()}`
  }

  const isAdmin = user?.role === 'ADMINISTRATEUR' || user?.role === 'ADMIN'

  return (
    <div className="flex flex-col gap-8 font-mono p-6 crt-flicker relative min-h-full">
      
      {/* === HEADER === */}
      <div>
        <h2 className="text-3xl font-bold text-white uppercase tracking-widest mb-2">
          PROFIL_UTILISATEUR
        </h2>
        <p className="text-cyan-400 text-xs font-mono uppercase tracking-wide">
          Gestion d'identité, informations de sécurité & configuration de session
        </p>
      </div>

      {/* === LAYOUT 3 COLONNES === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === COLONNE 1 : INFORMATION UTILISATEUR === */}
        <div className="lg:col-span-1">
          
          {/* CARTE IDENTITÉ */}
          <div className="border-2 border-cyan-400 bg-[#0a1200] p-6 rounded-none relative">
            
            {/* Badge Status */}
            <div className="absolute top-4 right-4 bg-green-900/30 border border-green-500 text-green-400 text-[10px] font-mono px-3 py-1 uppercase font-bold">
              ● ACTIF
            </div>
            
            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 border-2 border-cyan-400 flex items-center justify-center bg-[#051a2f] rounded-none">
                <span className="text-3xl font-mono font-bold text-cyan-400">{initiales}</span>
              </div>
            </div>
            
            {/* Nom & Login */}
            <h3 className="text-lg font-mono font-bold text-white uppercase text-center">{nom}</h3>
            <p className="text-cyan-300 text-xs font-mono text-center mb-6">LOGIN: {(login || nom).toUpperCase()}</p>
            
            <div className="border-t border-cyan-400/20"></div>
          </div>

          {/* INFORMATIONS DÉTAILLÉES */}
          <div className="border border-cyan-400/30 bg-[#0a0a0a] p-6 rounded-none mt-4">
            
            {/* Rôle */}
            <div className="mb-6 pb-6 border-b border-cyan-400/20">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-mono uppercase mb-2">
                <Shield className="w-4 h-4 text-cyan-400" />
                Rôle Système
              </div>
              <div className={`inline-block border text-xs font-mono px-3 py-1 font-bold uppercase ${isAdmin ? 'border-yellow-400 text-yellow-400 bg-yellow-400/5' : 'border-blue-400 text-blue-400 bg-blue-400/5'}`}>
                {isAdmin ? 'ADMINISTRATEUR' : 'TECHNICIEN'}
              </div>
              {isAdmin && user?.login && (
                <div className="text-gray-600 text-[10px] font-mono mt-2">
                  Identifiant: <span className="text-yellow-400">({user.login})</span>
                </div>
              )}
            </div>

            {/* Email */}
            <div className="mb-6 pb-6 border-b border-cyan-400/20">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-mono uppercase mb-2">
                <Mail className="w-4 h-4 text-cyan-400" />
                Adresse Email
              </div>
              {user?.email ? (
                <div className="text-cyan-300 text-sm font-mono break-all">{user.email}</div>
              ) : (
                <div className="text-gray-600 text-xs italic">Non renseigné</div>
              )}
            </div>

            {/* User ID */}
            <div>
              <div className="flex items-center gap-2 text-gray-500 text-xs font-mono uppercase mb-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                Identifiant Système
              </div>
              <div className="text-white font-mono text-sm font-bold bg-[#0a0f0a] px-3 py-2 border border-cyan-400/20 w-fit">
                ID_{user?.id || 'N/A'}
              </div>
            </div>
          </div>

          {/* INFO BOX */}
          <div className="border border-cyan-400/20 bg-[#051a1f] p-4 rounded-none mt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-cyan-400 text-xs font-mono font-bold uppercase mb-1">Sécurité Session</p>
                <p className="text-gray-500 text-[10px] font-mono leading-relaxed">
                  Changez régulièrement votre mot de passe pour maintenir la sécurité de votre session et de vos données de supervision.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* === COLONNE 2 & 3 : SÉCURITÉ & ACTIONS === */}
        <div className="lg:col-span-2">
          
          {/* SECTION MODIFICATION MOT DE PASSE */}
          <div className="mb-8">
            <ChangePassword userId={user?.id} />
          </div>

          {/* SECTION INFORMATIONS SESSION */}
          <div className="border-2 border-cyan-400/40 bg-[#0a0f0a] p-8 rounded-none">
            <h3 className="text-white font-mono text-sm uppercase font-bold mb-6 flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              Informations de Session
            </h3>

            <div className="grid grid-cols-2 gap-6">
              {/* Environnement */}
              <div>
                <div className="text-gray-600 text-xs font-mono uppercase mb-2">Environnement</div>
                <div className="text-cyan-300 text-sm">Production</div>
              </div>

              {/* État */}
              <div>
                <div className="text-gray-600 text-xs font-mono uppercase mb-2">État de la Session</div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-green-400 text-sm font-mono">CONNECTÉ</span>
                </div>
              </div>

              {/* Niveau d'Accès */}
              <div>
                <div className="text-gray-600 text-xs font-mono uppercase mb-2">Niveau d'Accès</div>
                <div className={`text-sm font-mono font-bold ${isAdmin ? 'text-yellow-400' : 'text-blue-400'}`}>
                  {isAdmin ? 'ROOT / ADMINISTRATEUR' : 'UTILISATEUR / STANDARD'}
                </div>
              </div>

              {/* Intégrité Système */}
              <div>
                <div className="text-gray-600 text-xs font-mono uppercase mb-2">Intégrité Système</div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span className="text-green-400 text-sm font-mono">VÉRIFIÉE</span>
                </div>
              </div>
            </div>

            {/* Ligne de séparation */}
            <div className="border-t border-cyan-400/20 my-8"></div>

            {/* Footer Note */}
            <div className="bg-[#051a05] border border-green-500/20 p-4 rounded-none">
              <p className="text-gray-500 text-xs font-mono leading-relaxed">
                <span className="text-green-400 font-bold">✓ SUPERVISION ACTIVE</span> — Votre compte est opérationnel et autorisé pour accéder à tous les modules de supervision réseau, analyse d'anomalies IA et gestion des alertes.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
