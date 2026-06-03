import { useEffect, useState } from 'react'
import { utilisateursAPI } from '@/services/api'
import { useAuth } from '@/hooks/useAuth'
import { Users, UserPlus, Trash2, Edit2, X, User, Mail, ChevronDown, EyeOff, Eye } from 'lucide-react'

export default function GestionUtilisateurs() {
  const { user: currentUser } = useAuth()
  const [utilisateurs, setUtilisateurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState({ 
    prenom: '', 
    nom: '', 
    login: '', 
    email: '', 
    role: 'TECHNICIEN',
    mot_de_passe: '', 
    confirm_mot_de_passe: '' 
  })
  const [creating, setCreating] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // États pour édition
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [editing, setEditing] = useState(false)

  // Modal de suppression
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    open: false,
    userId: null,
    userName: null
  })
  const [deleting, setDeleting] = useState(false)

  const [errorToast, setErrorToast] = useState(null)

  const showError = (msg) => {
    setErrorToast(msg)
    setTimeout(() => setErrorToast(null), 4000)
  }

  const fetchUtilisateurs = async () => {
    setLoading(true)
    try {
      const { data } = await utilisateursAPI.lister()
      setUtilisateurs(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error)
      showError("Erreur lors du chargement des utilisateurs.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUtilisateurs() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    
    if (createForm.mot_de_passe !== createForm.confirm_mot_de_passe) {
      showError("Les mots de passe ne correspondent pas.")
      return
    }

    setCreating(true)
    try {
      const payload = {
        nom: `${createForm.prenom} ${createForm.nom}`.trim() || createForm.login,
        email: createForm.email,
        mot_de_passe: createForm.mot_de_passe,
        role: createForm.role
      }
      await utilisateursAPI.creer(payload)
      setShowCreateModal(false)
      setCreateForm({ prenom: '', nom: '', login: '', email: '', mot_de_passe: '', confirm_mot_de_passe: '', role: 'TECHNICIEN' })
      fetchUtilisateurs()
    } catch (error) {
      console.error('Erreur création utilisateur:', error)
      showError("Erreur lors de la création de l'utilisateur.")
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    const user = utilisateurs.find(u => u.id === id)
    setDeleteConfirmModal({
      open: true,
      userId: id,
      userName: user?.nom || user?.login || 'N/A'
    })
  }

  const confirmDelete = async () => {
    const { userId } = deleteConfirmModal
    setDeleting(true)
    try {
      await utilisateursAPI.supprimer(userId)
      setDeleteConfirmModal({ open: false, userId: null, userName: null })
      fetchUtilisateurs()
    } catch (error) {
      console.error('Erreur suppression:', error)
      showError("Erreur lors de la suppression de l'utilisateur.")
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = (user) => {
    setEditingId(user.id)
    setEditForm({
      id: user.id,
      nom: user.nom || '',
      email: user.email || '',
      role: user.role || 'TECHNICIEN'
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const saveEdit = async () => {
    if (!editForm) return
    setEditing(true)
    try {
      await utilisateursAPI.modifier(editForm.id, {
        nom: editForm.nom,
        email: editForm.email,
        role: editForm.role
      })
      setEditingId(null)
      setEditForm(null)
      fetchUtilisateurs()
    } catch (error) {
      console.error('Erreur modification:', error)
      showError("Erreur lors de la modification de l'utilisateur.")
    } finally {
      setEditing(false)
    }
  }

  const filteredUsers = utilisateurs.filter(u => {
    let roleMatch = roleFilter === 'ALL'
    if (roleFilter === 'ADMIN') roleMatch = (u.role === 'ADMIN' || u.role === 'ADMINISTRATEUR')
    if (roleFilter === 'TECHNICIEN') roleMatch = (u.role === 'TECHNICIEN')
    
    const search = `${u.nom || ''} ${u.email || ''}`.toLowerCase()
    return roleMatch && search.includes(searchTerm.toLowerCase())
  })

  const adminCount = utilisateurs.filter(u => u.role === 'ADMINISTRATEUR' || u.role === 'ADMIN').length
  const techCount = utilisateurs.filter(u => u.role === 'TECHNICIEN').length

  return (
    <div className="flex flex-col gap-6 font-mono p-6 crt-flicker relative">
      
      {/* === 6. TOASTS D'ERREUR === */}
      {errorToast && (
        <div className="fixed top-4 right-4 z-50 bg-[#1a0505] border border-red-500 text-red-400 font-mono text-xs px-4 py-3 flex items-center gap-2 rounded-none shadow-lg">
          <X className="w-4 h-4 cursor-pointer hover:text-red-300" onClick={() => setErrorToast(null)} />
          {errorToast}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-[#222] pb-6 flex justify-between items-end rounded-none">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-widest mb-2">GESTION_UTILISATEURS</h2>
          <p className="text-xs text-[#888] uppercase tracking-wider">
            Contrôle d'accès, permissions RBAC et profils de supervision
          </p>
        </div>
        {/* === 1. BOUTON NOUVEL UTILISATEUR === */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-transparent border border-cyan-400 text-cyan-400 font-mono text-xs uppercase px-4 py-2 hover:bg-cyan-400 hover:text-black transition-all flex items-center gap-2 rounded-none w-fit"
        >
          <UserPlus className="w-4 h-4" />
          NOUVEL UTILISATEUR
        </button>
      </div>

      {/* === 2. KPI CARDS === */}
      <section className="grid grid-cols-3 gap-6">
        <div className="bg-[#0D0D0D] border border-cyan-400/20 p-6 flex flex-col relative rounded-none">
          <span className="text-xs text-gray-500 uppercase tracking-wider mb-2">Total Utilisateurs</span>
          <span className="text-5xl font-mono font-bold text-white">{utilisateurs.length}</span>
          <div className="absolute top-4 right-4 border border-cyan-400 text-cyan-400 text-[10px] font-mono px-2 py-0.5 rounded-none">RBAC_OK</div>
        </div>
        <div className="bg-[#1a1200] border border-yellow-400/20 p-6 flex flex-col relative rounded-none">
          <span className="text-xs text-gray-500 uppercase tracking-wider mb-2">Comptes Admin</span>
          <span className="text-5xl font-mono font-bold text-yellow-400">{adminCount}</span>
          <div className="absolute top-4 right-4 border border-yellow-400 text-yellow-400 text-[10px] font-mono px-2 py-0.5 rounded-none">ROOT_PRIVS</div>
        </div>
        <div className="bg-[#05050f] border border-blue-400/20 p-6 flex flex-col relative rounded-none">
          <span className="text-xs text-gray-500 uppercase tracking-wider mb-2">Techniciens</span>
          <span className="text-5xl font-mono font-bold text-blue-400">{techCount}</span>
          <div className="absolute top-4 right-4 border border-blue-400 text-blue-400 text-[10px] font-mono px-2 py-0.5 rounded-none">MONITORING</div>
        </div>
      </section>

      {/* === 3. BARRE RECHERCHE + FILTRES === */}
      <div className="border border-gray-800 p-3 flex items-center justify-between rounded-none bg-[#0D0D0D]">
        <div className="flex items-center">
          <span className="text-cyan-400 font-mono text-sm mr-2">$</span>
          <input 
            type="text" 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-cyan-300 font-mono text-sm placeholder-gray-700 w-64"
            placeholder="Rechercher par nom, email..." 
          />
        </div>
        <div className="flex items-center">
          <span className="text-gray-600 text-[10px] font-mono uppercase mr-2">RÔLE:</span>
          <div className="flex gap-2">
            {['ALL', 'ADMIN', 'TECHNICIEN'].map(r => {
              const isActive = roleFilter === r;
              let activeClass = '';
              if (isActive) {
                if (r === 'ALL') activeClass = 'border border-cyan-400 bg-cyan-400 text-black';
                else if (r === 'ADMIN') activeClass = 'border border-yellow-400 bg-yellow-400 text-black';
                else activeClass = 'border border-blue-400 bg-blue-400 text-black';
              } else {
                activeClass = 'border border-gray-700 text-gray-500 bg-transparent';
              }
              return (
                <button 
                  key={r} 
                  onClick={() => setRoleFilter(r)}
                  className={`font-mono text-xs px-3 py-1 uppercase rounded-none transition-all ${activeClass}`}
                >
                  {r === 'ALL' ? 'TOUS' : r}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* === 4. TABLEAU UTILISATEURS === */}
      <div className="bg-[#0D0D0D] border-2 border-cyan-400 overflow-x-auto rounded-none flex flex-col">
        {/* Header Tableau */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_2fr_1fr_1.2fr] bg-[#0a0f0a] border-b-2 border-cyan-400 text-cyan-400 text-xs md:text-sm font-mono uppercase sticky top-0 font-bold tracking-wider">
          <div className="px-4 py-4 border-r border-cyan-400/50 text-center">UTILISATEUR / LOGIN</div>
          <div className="px-4 py-4 border-r border-cyan-400/50 text-center max-md:hidden">EMAIL</div>
          <div className="px-4 py-4 border-r border-cyan-400/50 text-center">RÔLE</div>
          <div className="px-4 py-4 text-center">ACTIONS</div>
        </div>

        {/* Tableau Body */}
        {loading ? (
          <div className="text-xs text-gray-500 italic py-12 text-center border-b border-cyan-400/20">Chargement des opérateurs...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-12 text-center font-mono border-b border-cyan-400/20">
            <div className="text-gray-700 text-[10px] uppercase mb-2">
              // RBAC — TABLE UTILISATEURS VIDE
            </div>
            <div className="text-gray-600 text-xs">
              Aucun utilisateur ne correspond aux critères de recherche.
            </div>
          </div>
        ) : (
          <div className="flex flex-col border-b-2 border-cyan-400">
            {filteredUsers.map(u => {
              const isSelf = currentUser?.id === u.id
              const isAdmin = u.role === 'ADMIN' || u.role === 'ADMINISTRATEUR'
              const isEditing = editingId === u.id
              
              return (
                <div key={u.id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_2fr_1fr_1.2fr] border-b border-cyan-400/20 hover:bg-[#0a1200] hover:border-b-cyan-400/50 transition-all items-center">
                  {/* Colonne 1 : Utilisateur */}
                  <div className="px-4 py-3 flex flex-col justify-center text-center md:text-left border-r border-cyan-400/10">
                    <div className="flex items-center justify-center md:justify-start">
                      <span className="text-white font-mono text-sm font-bold uppercase">{u.nom || u.login || 'N/A'}</span>
                      {isSelf && (
                        <span className="border border-cyan-400 text-cyan-400 text-[9px] font-mono px-1 ml-2 rounded-none leading-tight">[VOUS]</span>
                      )}
                    </div>
                    <span className="text-gray-600 text-[10px] font-mono mt-0.5">ID: {u.id}</span>
                  </div>
                  
                  {/* Colonne 2 : Email */}
                  <div className="px-4 py-3 text-gray-400 font-mono text-xs text-center md:text-center hidden md:flex items-center justify-center border-r border-cyan-400/10">
                    {u.email || 'N/A'}
                  </div>
                  
                  {/* Colonne 3 : Rôle */}
                  <div className="px-4 py-3 flex justify-center border-r border-cyan-400/10">
                    {isEditing ? (
                      <select
                        value={editForm.role}
                        onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                        className="bg-[#0a0a0a] border border-[#00e5ff] text-gray-300 font-mono text-[10px] px-2 py-1 appearance-none rounded-none focus:outline-none"
                      >
                        <option value="TECHNICIEN">TECHNICIEN</option>
                        <option value="ADMINISTRATEUR">ADMIN</option>
                      </select>
                    ) : (
                      <span className={`inline-block text-[10px] font-mono px-2 py-0.5 uppercase rounded-none border ${isAdmin ? 'bg-yellow-400/10 border-yellow-400 text-yellow-400' : 'bg-blue-400/10 border-blue-400 text-blue-400'}`}>
                        {isAdmin ? 'ADMIN' : 'TECH'}
                      </span>
                    )}
                  </div>
                  
                  {/* Colonne 4 : Actions */}
                  <div className="px-4 py-3 flex items-center gap-1 justify-center flex-wrap">
                    {isEditing ? (
                      <>
                        <button 
                          onClick={saveEdit}
                          disabled={editing}
                          className="border border-cyan-400 text-cyan-400 font-mono text-[10px] px-2 py-1 hover:bg-cyan-400 hover:text-black transition-colors flex items-center gap-1 rounded-none cursor-pointer disabled:opacity-50 text-xs"
                        >
                          ✓ SAVE
                        </button>
                        <button 
                          onClick={cancelEdit}
                          className="border border-gray-600 text-gray-400 font-mono text-[10px] px-2 py-1 hover:border-red-500 hover:text-red-500 transition-colors rounded-none cursor-pointer text-xs"
                        >
                          ✕ CANCEL
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleEdit(u)}
                          className="border border-gray-600 text-gray-400 font-mono text-[10px] px-2 py-1 hover:border-cyan-400 hover:text-cyan-400 transition-colors flex items-center gap-1 rounded-none cursor-pointer text-xs"
                        >
                          <Edit2 className="w-3 h-3" />
                          EDIT
                        </button>
                        {!isSelf ? (
                          <button 
                            onClick={() => handleDelete(u.id)}
                            className="border border-gray-800 text-gray-700 font-mono text-[10px] px-2 py-1 hover:border-red-500 hover:text-red-500 transition-colors flex items-center gap-1 rounded-none cursor-pointer text-xs"
                          >
                            <Trash2 className="w-3 h-3" />
                            DELETE
                          </button>
                        ) : (
                          <button disabled className="border border-gray-800 text-gray-700 font-mono text-[10px] px-2 py-1 flex items-center gap-1 rounded-none opacity-30 cursor-not-allowed text-xs">
                            <Trash2 className="w-3 h-3" />
                            DELETE
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* === 5. MODAL CRÉATION UTILISATEUR === */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#222] w-full max-w-[500px] p-6 flex flex-col rounded-none shadow-2xl">
            
            {/* Header modal */}
            <div className="flex justify-between items-center mb-6">
              <span className="font-mono font-bold text-[#00e5ff] uppercase text-sm flex items-center gap-2 tracking-wide">
                <User className="w-4 h-4" />
                CRÉER_NOUVEL_UTILISATEUR
              </span>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="border border-[#00e5ff]/30 p-1 hover:bg-[#00e5ff]/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {/* Champ Prénom */}
                <div className="flex flex-col gap-1">
                  <label className="text-gray-500 text-[10px] font-mono uppercase">Prénom</label>
                  <input
                    type="text"
                    value={createForm.prenom}
                    onChange={e => setCreateForm(p => ({...p, prenom: e.target.value}))}
                    placeholder="Ex: Taha"
                    className="bg-[#0a0a0a] border border-[#222] text-gray-300 font-mono text-sm px-3 py-2 w-full focus:border-[#00e5ff] focus:outline-none placeholder-[#333] rounded-none"
                  />
                </div>
                
                {/* Champ Nom */}
                <div className="flex flex-col gap-1">
                  <label className="text-gray-500 text-[10px] font-mono uppercase">Nom</label>
                  <input
                    type="text"
                    value={createForm.nom}
                    onChange={e => setCreateForm(p => ({...p, nom: e.target.value}))}
                    placeholder="Ex: Moukhalid"
                    className="bg-[#0a0a0a] border border-[#222] text-gray-300 font-mono text-sm px-3 py-2 w-full focus:border-[#00e5ff] focus:outline-none placeholder-[#333] rounded-none"
                  />
                </div>
              </div>

              {/* Champ Identifiant */}
              <div className="flex flex-col gap-1 mt-1">
                <label className="text-gray-500 text-[10px] font-mono uppercase">Identifiant (Login unique)</label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={createForm.login}
                    onChange={e => setCreateForm(p => ({...p, login: e.target.value}))}
                    required
                    placeholder="Ex: taha"
                    className="bg-[#0a0a0a] border border-[#222] text-gray-300 font-mono text-sm pl-10 pr-3 py-2 w-full focus:border-[#00e5ff] focus:outline-none placeholder-[#333] rounded-none"
                  />
                </div>
              </div>

              {/* Champ Email */}
              <div className="flex flex-col gap-1 mt-1">
                <label className="text-gray-500 text-[10px] font-mono uppercase">Adresse Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={e => setCreateForm(p => ({...p, email: e.target.value}))}
                    required
                    placeholder="Ex: taha@univh2c.ma"
                    className="bg-[#0a0a0a] border border-[#222] text-gray-300 font-mono text-sm pl-10 pr-3 py-2 w-full focus:border-[#00e5ff] focus:outline-none placeholder-[#333] rounded-none"
                  />
                </div>
              </div>

              {/* Champ Rôle */}
              <div className="flex flex-col gap-1 mt-1">
                <label className="text-gray-500 text-[10px] font-mono uppercase">Rôle de Sécurité</label>
                <div className="relative">
                  <select 
                    value={createForm.role}
                    onChange={e => setCreateForm(p => ({...p, role: e.target.value}))}
                    className="bg-[#0a0a0a] border border-[#222] text-gray-300 font-mono text-sm pl-3 pr-10 py-2 w-full focus:border-[#00e5ff] focus:outline-none appearance-none rounded-none"
                  >
                    <option value="TECHNICIEN">TECHNICIEN</option>
                    <option value="ADMINISTRATEUR">ADMINISTRATEUR</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Champ Mot de Passe */}
              <div className="flex flex-col gap-1 mt-1">
                <label className="text-gray-500 text-[10px] font-mono uppercase">Mot de passe (Requis)</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={createForm.mot_de_passe}
                    onChange={e => setCreateForm(p => ({...p, mot_de_passe: e.target.value}))}
                    required
                    placeholder="••••••••"
                    className="bg-[#0a0a0a] border border-[#222] text-gray-300 font-mono text-sm pl-3 pr-10 py-2 w-full focus:border-[#00e5ff] focus:outline-none placeholder-[#333] rounded-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-cyan-300 transition-colors"
                  >
                    {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Champ Confirmer Mot de Passe */}
              <div className="flex flex-col gap-1 mt-1">
                <label className="text-gray-500 text-[10px] font-mono uppercase">Confirmer le mot de passe</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={createForm.confirm_mot_de_passe}
                    onChange={e => setCreateForm(p => ({...p, confirm_mot_de_passe: e.target.value}))}
                    required
                    placeholder="••••••••"
                    className="bg-[#0a0a0a] border border-[#222] text-gray-300 font-mono text-sm pl-3 pr-10 py-2 w-full focus:border-[#00e5ff] focus:outline-none placeholder-[#333] rounded-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-cyan-300 transition-colors"
                  >
                    {showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-[#222] mt-4 pt-4 flex gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="bg-transparent border border-[#222] text-white font-mono text-xs px-6 py-2 hover:bg-[#222] transition-colors rounded-none cursor-pointer"
                >
                  ANNULER
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-[#00e5ff] text-black font-mono text-xs px-6 py-2 font-bold hover:bg-cyan-300 transition-all rounded-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px]"
                >
                  {creating ? (
                    <span className="w-4 h-4 border-2 border-black border-t-transparent animate-spin inline-block rounded-full" />
                  ) : (
                    'CRÉER'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === 6. MODAL CONFIRMATION SUPPRESSION === */}
      {deleteConfirmModal.open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border-2 border-red-500 w-full max-w-[400px] p-8 flex flex-col rounded-none shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="border border-red-500 text-red-500 p-2 rounded-none">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-mono font-bold text-red-500 uppercase text-lg tracking-wider">CONFIRMER SUPPRESSION</h3>
            </div>

            {/* Message */}
            <div className="mb-6">
              <p className="text-gray-300 font-mono text-sm mb-4">
                Êtes-vous certain de vouloir supprimer définitivement cet utilisateur ?
              </p>
              <div className="bg-[#1a0505] border border-red-500/30 p-4 rounded-none">
                <p className="text-red-400 font-mono text-sm font-bold">
                  {deleteConfirmModal.userName}
                </p>
                <p className="text-gray-500 font-mono text-xs mt-2">
                  Cette action est irréversible et supprimera toutes les données associées.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setDeleteConfirmModal({ open: false, userId: null, userName: null })}
                disabled={deleting}
                className="bg-transparent border border-gray-600 text-gray-400 font-mono text-sm px-6 py-2 hover:bg-gray-600 hover:text-white transition-colors rounded-none cursor-pointer disabled:opacity-50"
              >
                ANNULER
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="bg-red-500 text-black font-mono text-sm px-6 py-2 font-bold hover:bg-red-600 transition-all rounded-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
              >
                {deleting ? (
                  <span className="w-4 h-4 border-2 border-black border-t-transparent animate-spin inline-block rounded-full" />
                ) : (
                  'SUPPRIMER'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
