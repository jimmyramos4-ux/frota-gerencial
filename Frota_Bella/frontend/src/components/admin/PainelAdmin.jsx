import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Plus, Edit2, ShieldCheck, Building2, Users, Loader2, Check, X, Eye, EyeOff, ToggleLeft, ToggleRight } from 'lucide-react'
import { API } from '../../lib/config'
import { useAuth } from '../../lib/AuthContext'

const PERFIS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'gerencial', label: 'Gerencial' },
  { value: 'filial', label: 'Filial' },
]

// ── Modal Filial ──────────────────────────────────────────────────────────────

function ModalFilial({ filial, onClose, onSaved }) {
  const [nome, setNome] = useState(filial?.nome || '')
  const [cidade, setCidade] = useState(filial?.cidade || '')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const handleSave = async () => {
    if (!nome.trim()) return setErro('Nome é obrigatório')
    setLoading(true)
    setErro('')
    try {
      if (filial) {
        await axios.put(`${API}/auth/filiais/${filial.id}`, { nome: nome.trim(), cidade: cidade.trim() || null })
      } else {
        await axios.post(`${API}/auth/filiais`, { nome: nome.trim(), cidade: cidade.trim() || null })
      }
      onSaved()
    } catch (e) {
      setErro(e.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-80 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-3 flex items-center justify-between">
          <span className="text-white font-bold text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {filial ? 'Editar Filial' : 'Nova Filial'}
          </span>
          <button onClick={onClose} className="text-blue-200 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
            <input className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:bg-gray-700 dark:text-gray-100"
              value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Bello Alimentos" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Cidade</label>
            <input className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:bg-gray-700 dark:text-gray-100"
              value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Ex: Dourados" />
          </div>
          {erro && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-1">{erro}</p>}
        </div>
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-100 dark:border-gray-600 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-medium">Cancelar</button>
          <button onClick={handleSave} disabled={loading || !nome.trim()}
            className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold flex items-center gap-1.5">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal Usuário ─────────────────────────────────────────────────────────────

function ModalUsuario({ usuario, filiais, onClose, onSaved }) {
  const [nome, setNome] = useState(usuario?.nome || '')
  const [username, setUsername] = useState(usuario?.username || '')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [perfil, setPerfil] = useState(usuario?.perfil || 'filial')
  const [filialId, setFilialId] = useState(usuario?.filial_id || '')
  const [ativo, setAtivo] = useState(usuario?.ativo ?? true)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  const handleSave = async () => {
    if (!nome.trim()) return setErro('Nome é obrigatório')
    if (!username.trim()) return setErro('Username é obrigatório')
    if (!usuario && !password) return setErro('Senha é obrigatória para novo usuário')
    if (perfil === 'filial' && !filialId) return setErro('Selecione a filial')
    setLoading(true)
    setErro('')
    try {
      if (usuario) {
        const body = { nome: nome.trim(), perfil, ativo, filial_id: perfil === 'filial' ? Number(filialId) : null }
        if (password) body.password = password
        await axios.put(`${API}/auth/usuarios/${usuario.id}`, body)
      } else {
        await axios.post(`${API}/auth/usuarios`, {
          nome: nome.trim(), username: username.trim(), password,
          perfil, filial_id: perfil === 'filial' ? Number(filialId) : null,
        })
      }
      onSaved()
    } catch (e) {
      setErro(e.response?.data?.detail || 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-96 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-3 flex items-center justify-between">
          <span className="text-white font-bold text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            {usuario ? 'Editar Usuário' : 'Novo Usuário'}
          </span>
          <button onClick={onClose} className="text-blue-200 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nome completo *</label>
              <input className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:bg-gray-700 dark:text-gray-100"
                value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do usuário" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Username *</label>
              <input className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:bg-gray-700 dark:text-gray-100"
                value={username} onChange={e => setUsername(e.target.value)} placeholder="login" disabled={!!usuario} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Senha {usuario ? '(deixe em branco para manter)' : '*'}
              </label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 pr-8 text-sm focus:outline-none focus:border-blue-400 dark:bg-gray-700 dark:text-gray-100"
                  value={password} onChange={e => setPassword(e.target.value)} placeholder={usuario ? '••••••••' : 'Senha'} />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Perfil *</label>
              <select className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:bg-gray-700 dark:text-gray-100"
                value={perfil} onChange={e => setPerfil(e.target.value)}>
                {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Filial {perfil === 'filial' ? '*' : '(não necessária)'}
              </label>
              <select className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 dark:bg-gray-700 dark:text-gray-100 disabled:opacity-50"
                value={filialId} onChange={e => setFilialId(e.target.value)} disabled={perfil !== 'filial'}>
                <option value="">Selecione...</option>
                {filiais.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </div>
          </div>

          {usuario && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setAtivo(v => !v)} className="text-gray-500">
                {ativo ? <ToggleRight className="w-8 h-8 text-green-500" /> : <ToggleLeft className="w-8 h-8 text-gray-400" />}
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400">{ativo ? 'Usuário ativo' : 'Usuário inativo'}</span>
            </div>
          )}

          {erro && <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-2 py-1">{erro}</p>}
        </div>
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-100 dark:border-gray-600 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-medium">Cancelar</button>
          <button onClick={handleSave} disabled={loading}
            className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold flex items-center gap-1.5">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Painel principal ──────────────────────────────────────────────────────────

export default function PainelAdmin() {
  const { user } = useAuth()
  const [aba, setAba] = useState('filiais')
  const [filiais, setFiliais] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalFilial, setModalFilial] = useState(null) // null | 'nova' | filial obj
  const [modalUsuario, setModalUsuario] = useState(null)

  const isAdmin = user?.perfil === 'admin'

  const fetchFiliais = async () => {
    const r = await axios.get(`${API}/auth/filiais`)
    setFiliais(r.data)
  }

  const fetchUsuarios = async () => {
    const r = await axios.get(`${API}/auth/usuarios`)
    setUsuarios(r.data)
  }

  const fetchAll = async () => {
    setLoading(true)
    try { await Promise.all([fetchFiliais(), fetchUsuarios()]) } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchAll() }, [])

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-400">
        <ShieldCheck className="w-12 h-12" />
        <p className="text-sm font-medium">Acesso restrito a administradores</p>
      </div>
    )
  }

  const perfilBadge = (p) => {
    const map = { admin: 'bg-red-100 text-red-700', gerencial: 'bg-blue-100 text-blue-700', filial: 'bg-green-100 text-green-700' }
    const label = { admin: 'Admin', gerencial: 'Gerencial', filial: 'Filial' }
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[p] || 'bg-gray-100 text-gray-600'}`}>{label[p] || p}</span>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-blue-600" />
        <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">Administração</h1>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'filiais', label: 'Filiais', icon: Building2 },
          { id: 'usuarios', label: 'Usuários', icon: Users },
        ].map(tab => (
          <button key={tab.id} onClick={() => setAba(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              aba === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full px-1.5 py-0.5 font-normal">
              {tab.id === 'filiais' ? filiais.length : usuarios.length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : (
        <>
          {/* ── ABA FILIAIS ── */}
          {aba === 'filiais' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Filiais cadastradas</span>
                <button onClick={() => setModalFilial('nova')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg">
                  <Plus className="w-3.5 h-3.5" /> Nova Filial
                </button>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-400">#</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-400">Nome</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-400">Cidade</th>
                    <th className="px-4 py-2.5 text-center font-semibold text-gray-600 dark:text-gray-400">Usuários</th>
                    <th className="px-4 py-2.5 text-center font-semibold text-gray-600 dark:text-gray-400">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filiais.map((f, i) => (
                    <tr key={f.id} className={`border-t border-gray-100 dark:border-gray-700 ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-700/20'}`}>
                      <td className="px-4 py-2.5 text-gray-400">{f.id}</td>
                      <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-100">{f.nome}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{f.cidade || '—'}</td>
                      <td className="px-4 py-2.5 text-center text-gray-500 dark:text-gray-400">
                        {usuarios.filter(u => u.filial_id === f.id).length}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button onClick={() => setModalFilial(f)}
                          className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filiais.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhuma filial cadastrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ── ABA USUÁRIOS ── */}
          {aba === 'usuarios' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Usuários cadastrados</span>
                <button onClick={() => setModalUsuario('novo')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg">
                  <Plus className="w-3.5 h-3.5" /> Novo Usuário
                </button>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-400">Nome</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-400">Username</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-400">Perfil</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-600 dark:text-gray-400">Filial</th>
                    <th className="px-4 py-2.5 text-center font-semibold text-gray-600 dark:text-gray-400">Status</th>
                    <th className="px-4 py-2.5 text-center font-semibold text-gray-600 dark:text-gray-400">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u, i) => (
                    <tr key={u.id} className={`border-t border-gray-100 dark:border-gray-700 ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-700/20'} ${!u.ativo ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-gray-100">{u.nome}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 font-mono">{u.username}</td>
                      <td className="px-4 py-2.5">{perfilBadge(u.perfil)}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{u.filial_nome || '—'}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button onClick={() => setModalUsuario(u)}
                          className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-400 hover:text-blue-600">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {usuarios.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhum usuário cadastrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modais */}
      {modalFilial && (
        <ModalFilial
          filial={modalFilial === 'nova' ? null : modalFilial}
          onClose={() => setModalFilial(null)}
          onSaved={() => { setModalFilial(null); fetchFiliais() }}
        />
      )}
      {modalUsuario && (
        <ModalUsuario
          usuario={modalUsuario === 'novo' ? null : modalUsuario}
          filiais={filiais}
          onClose={() => setModalUsuario(null)}
          onSaved={() => { setModalUsuario(null); fetchUsuarios() }}
        />
      )}
    </div>
  )
}
