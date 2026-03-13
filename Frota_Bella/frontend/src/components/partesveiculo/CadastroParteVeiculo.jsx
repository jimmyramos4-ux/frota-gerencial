import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Pencil, RefreshCw, AlertCircle, CheckCircle, Settings } from 'lucide-react'

const API = 'http://localhost:8000/api'
const EMPTY = { nome: '', email_notificacao: '', ativo: true }

const inp = "border border-gray-300 rounded px-2 py-0.5 text-xs w-full focus:outline-none focus:border-blue-400"
const sel = "border border-gray-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-400 bg-white"

function WarnIcon() {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 bg-yellow-500 rounded-sm" title="Informativo">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1">
        <path d="M12 2L1 21h22L12 2z" fill="none" stroke="white" strokeWidth="2"/>
        <text x="11" y="18" fontSize="10" fill="white" fontWeight="bold">!</text>
      </svg>
    </span>
  )
}

function LupaIcon() {
  return (
    <span className="ml-1 inline-flex items-center justify-center w-5 h-5 bg-yellow-400 rounded-sm cursor-pointer" title="Ajuda">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
        <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    </span>
  )
}

// ─── FORMULÁRIO ──────────────────────────────────────────────────────────────
function FormView({ editItem, onSaved, onCancelEdit }) {
  const [form, setForm] = useState(EMPTY)
  const [acao, setAcao] = useState('alterar') // 'alterar' | 'excluir'
  const [status, setStatus] = useState({ msg: '', type: '' })
  const [loading, setLoading] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    if (editItem) {
      setForm({
        nome: editItem.nome || '',
        email_notificacao: editItem.email_notificacao || '',
        ativo: editItem.ativo ?? true,
      })
      setAcao('alterar')
    } else {
      setForm(EMPTY)
      setAcao('alterar')
    }
  }, [editItem])

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }))
  }

  const showStatus = (msg, type = 'success') => {
    setStatus({ msg, type })
    setTimeout(() => setStatus({ msg: '', type: '' }), 3000)
  }

  const handleSubmit = async () => {
    if (!form.nome.trim()) { showStatus('Informe a Parte do Veículo.', 'error'); return }
    setLoading(true)
    try {
      if (acao === 'excluir' && editItem) {
        await axios.delete(`${API}/partes-veiculo/${editItem.id}`)
        showStatus('Excluído com sucesso!')
        setTimeout(() => onCancelEdit(), 1500)
      } else if (editItem) {
        await axios.put(`${API}/partes-veiculo/${editItem.id}`, {
          nome: form.nome.trim(),
          email_notificacao: form.email_notificacao || null,
          ativo: form.ativo,
        })
        showStatus('Atualizado com sucesso!')
        onSaved()
      } else {
        await axios.post(`${API}/partes-veiculo`, {
          nome: form.nome.trim(),
          email_notificacao: form.email_notificacao || null,
          ativo: form.ativo,
        })
        showStatus('Cadastrado com sucesso!')
        setForm(EMPTY)
        onSaved()
      }
    } catch (err) {
      showStatus(err.response?.data?.detail || 'Erro ao salvar.', 'error')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      <h1 className="text-center text-base font-bold text-blue-700">
        Manutenção de Parte do Veículo
      </h1>

      <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <tbody>
            {/* Parte Veículo */}
            <tr>
              <td className="px-3 py-2 text-right text-xs font-bold text-blue-900 bg-blue-100 border border-blue-200 whitespace-nowrap w-56">
                Parte Veículo
              </td>
              <td className="px-2 py-1.5 border border-gray-200 bg-white">
                <input
                  className={`${inp} border-orange-400 focus:border-orange-500`}
                  value={form.nome}
                  onChange={set('nome')}
                  placeholder="Obrigatório"
                />
              </td>
            </tr>

            {/* E-mail Notificação */}
            <tr>
              <td className="px-3 py-2 text-right text-xs font-semibold text-blue-900 bg-gray-100 border border-blue-200 whitespace-nowrap">
                <span className="flex items-center justify-end gap-1">
                  E-mail Vcto. de Notificação de Serviço
                  <span
                    className="relative cursor-pointer"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                  >
                    <WarnIcon />
                    {showTooltip && (
                      <div className="absolute right-0 top-6 z-50 w-64 bg-blue-50 border border-blue-300 rounded shadow-lg p-2 text-xs text-left">
                        <p className="font-bold text-blue-800 mb-1">Informativo</p>
                        <p>E-mail para o qual será enviado uma notificação, quando os <strong>Serviços preventivos</strong> estiverem nos prazos de vencimento de Data e/ou Quilometragem.</p>
                      </div>
                    )}
                  </span>
                </span>
              </td>
              <td className="px-2 py-1.5 border border-gray-200 bg-white">
                <span className="flex items-center gap-1">
                  <input
                    type="email"
                    className={inp}
                    value={form.email_notificacao}
                    onChange={set('email_notificacao')}
                    placeholder="email@exemplo.com"
                  />
                  <LupaIcon />
                </span>
              </td>
            </tr>

            {/* Ativo */}
            <tr>
              <td className="px-3 py-2 text-right text-xs font-bold text-blue-900 bg-blue-100 border border-blue-200">
                Ativo
              </td>
              <td className="px-2 py-1.5 border border-gray-200 bg-white">
                <select className={sel}
                  value={form.ativo ? 'Sim' : 'Não'}
                  onChange={(e) => setForm(f => ({ ...f, ativo: e.target.value === 'Sim' }))}>
                  <option>Sim</option>
                  <option>Não</option>
                </select>
              </td>
            </tr>

            {/* Ação */}
            <tr>
              <td className="px-3 py-2 text-right text-xs font-semibold text-gray-700 bg-gray-50 border border-blue-200">
                Ação:
              </td>
              <td className="px-2 py-1.5 border border-gray-200 bg-gray-50">
                <span className="flex items-center gap-4 text-xs">
                  {editItem ? (
                    <>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="acao" checked={acao === 'alterar'} onChange={() => setAcao('alterar')} />
                        Alterar
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="acao" checked={acao === 'excluir'} onChange={() => setAcao('excluir')} />
                        Excluir
                      </label>
                    </>
                  ) : (
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" checked readOnly /> Inserir
                    </label>
                  )}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Confirmar */}
        <div className="bg-gray-100 border-t border-gray-300 flex items-center justify-center gap-3 py-2">
          <button onClick={handleSubmit} disabled={loading}
            className={`px-6 py-1 text-xs border rounded shadow-sm bg-white hover:bg-gray-50 ${acao === 'excluir' ? 'border-red-400 text-red-600' : 'border-gray-400'}`}>
            {loading ? 'Aguarde...' : 'Confirmar'}
          </button>
          {editItem && (
            <button onClick={onCancelEdit}
              className="px-4 py-1 text-xs bg-white border border-gray-400 rounded hover:bg-gray-50 shadow-sm">
              Cancelar
            </button>
          )}
        </div>

        {/* Status */}
        <div className={`px-3 py-1.5 text-xs flex items-center gap-2 border-t border-gray-300 ${
          status.type === 'error' ? 'bg-red-100 text-red-700' :
          status.msg ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-400'}`}>
          <span className="font-semibold">Status:</span>
          {status.type === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
          {status.type === 'success' && <CheckCircle className="w-3.5 h-3.5" />}
          {status.msg}
        </div>
      </div>

      <div className="text-center">
        <button onClick={onCancelEdit} className="text-xs text-blue-600 hover:underline font-medium">
          ← Listagem de Partes do Veículo
        </button>
      </div>
    </div>
  )
}

// ─── LISTAGEM ─────────────────────────────────────────────────────────────────
export default function CadastroParteVeiculo() {
  const [view, setView] = useState('list')
  const [editItem, setEditItem] = useState(null)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [fNome, setFNome] = useState('')
  const [fAtivo, setFAtivo] = useState('')
  const [appliedFilters, setAppliedFilters] = useState({})

  const loadList = useCallback(async (filters = appliedFilters, pg = page, pp = perPage) => {
    setLoading(true)
    try {
      const r = await axios.get(`${API}/partes-veiculo`, { params: { page: pg, per_page: pp, ...filters } })
      setItems(r.data.items)
      setTotal(r.data.total)
      setTotalPages(r.data.total_pages)
    } catch {}
    finally { setLoading(false) }
  }, [appliedFilters, page, perPage])

  useEffect(() => { loadList() }, [])
  useEffect(() => { loadList(appliedFilters, page, perPage) }, [page, perPage])

  const handleFiltrar = () => {
    const f = {}
    if (fNome) f.search = fNome
    if (fAtivo) f.ativo = fAtivo
    setAppliedFilters(f)
    setPage(1)
    loadList(f, 1, perPage)
  }

  const handleLimpar = () => {
    setFNome(''); setFAtivo('')
    setAppliedFilters({})
    setPage(1)
    loadList({}, 1, perPage)
  }

  const handleEdit = (item) => {
    setEditItem(item)
    setView('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSaved = () => {
    loadList()
    if (editItem) {
      setView('list')
      setEditItem(null)
      setStatusMsg('Atualizado com sucesso!')
      setTimeout(() => setStatusMsg(''), 3000)
    } else {
      setStatusMsg('Cadastrado com sucesso!')
      setTimeout(() => setStatusMsg(''), 3000)
    }
  }

  const handleCancelEdit = () => { setView('list'); setEditItem(null); loadList() }

  const pageNums = () => {
    const max = 7
    let start = Math.max(1, page - Math.floor(max / 2))
    let end = Math.min(totalPages, start + max - 1)
    if (end - start < max - 1) start = Math.max(1, end - max + 1)
    const pages = []
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  if (view === 'form') {
    return <FormView editItem={editItem} onSaved={handleSaved} onCancelEdit={handleCancelEdit} />
  }

  return (
    <div className="space-y-3 max-w-4xl mx-auto">
      <h1 className="text-center text-base font-bold text-blue-700">
        Listagem de Partes do Veículo
      </h1>

      <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
        {/* Paginação */}
        <div className="bg-gray-100 border-b border-gray-300 px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-1.5 py-0.5 text-xs border rounded disabled:opacity-40 bg-white hover:bg-gray-50">«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-1.5 py-0.5 text-xs border rounded disabled:opacity-40 bg-white hover:bg-gray-50">‹</button>
            {pageNums().map(n => (
              <button key={n} onClick={() => setPage(n)}
                className={`px-2 py-0.5 text-xs border rounded ${n === page ? 'bg-blue-700 text-white border-blue-700' : 'bg-white hover:bg-gray-50'}`}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-1.5 py-0.5 text-xs border rounded disabled:opacity-40 bg-white hover:bg-gray-50">›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="px-1.5 py-0.5 text-xs border rounded disabled:opacity-40 bg-white hover:bg-gray-50">»</button>
          </div>
          <div className="flex items-center gap-2">
            <select className="border border-gray-300 rounded text-xs px-1 py-0.5 bg-blue-700 text-white"
              value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}>
              {[10, 20, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <button onClick={() => loadList()} className="text-gray-500 hover:text-blue-600">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-blue-600 py-1 border-b border-gray-200">
          {total === 0 ? 'Nenhum registro' : `${(page - 1) * perPage + 1} à ${Math.min(page * perPage, total)} de ${total}`}
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-100 border-b border-blue-200">
                <th className="px-3 py-1.5 text-left text-blue-800 font-semibold">Parte do Veículo</th>
                <th className="px-3 py-1.5 text-left text-blue-800 font-semibold">E-mail Notificação</th>
                <th className="px-3 py-1.5 text-center text-blue-800 font-semibold">Ativo</th>
                <th className="px-3 py-1.5 text-center text-blue-800 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">
                  <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Carregando...
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">Nenhum registro encontrado.</td></tr>
              ) : items.map((item, idx) => (
                <tr key={item.id} className={`border-b border-gray-100 hover:bg-blue-50 ${idx % 2 === 0 ? '' : 'bg-gray-50'}`}>
                  <td className="px-3 py-1.5 font-medium">{item.nome}</td>
                  <td className="px-3 py-1.5 text-gray-500">{item.email_notificacao || ''}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${item.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {item.ativo ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <button onClick={() => handleEdit(item)} className="text-gray-400 hover:text-blue-600" title="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Filtros */}
        <div className="border-t border-gray-200 bg-blue-50 px-3 py-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900 w-28 text-right shrink-0">Parte do Veículo</span>
              <input className="border border-gray-300 rounded px-2 py-0.5 flex-1 text-xs focus:outline-none"
                value={fNome} onChange={e => setFNome(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFiltrar()} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900 w-12 text-right shrink-0">Ativo</span>
              <select className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white focus:outline-none"
                value={fAtivo} onChange={e => setFAtivo(e.target.value)}>
                <option value=""></option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-center">
            <button onClick={handleFiltrar}
              className="px-5 py-1 text-xs bg-white border border-gray-400 rounded hover:bg-gray-50 shadow-sm">Filtrar</button>
            <button onClick={handleLimpar}
              className="px-5 py-1 text-xs bg-white border border-gray-400 rounded hover:bg-gray-50 shadow-sm">Limpar</button>
          </div>
        </div>

        {/* Status */}
        <div className={`px-3 py-1.5 text-xs flex items-center gap-2 border-t border-gray-300 ${statusMsg ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-400'}`}>
          <span className="font-semibold">Status:</span>
          {statusMsg && <CheckCircle className="w-3.5 h-3.5" />}
          {statusMsg}
        </div>
      </div>

      <div className="text-center">
        <button onClick={() => { setEditItem(null); setView('form') }}
          className="text-xs text-blue-600 hover:underline font-medium">
          Adicionar Parte do Veículo
        </button>
      </div>
    </div>
  )
}
