import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import { Pencil, RefreshCw, AlertCircle, CheckCircle, X } from 'lucide-react'

const API = 'http://localhost:8000/api'
const EMPTY = {
  nome: '', cnpj_cpf: '', telefone: '', email: '',
  endereco: '', cidade: '', especialidade: '', observacao: '', ativo: true,
}

const inp = "border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 text-xs w-full focus:outline-none focus:border-blue-400 dark:bg-gray-700 dark:text-gray-100"
const sel = "border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-700 dark:text-gray-100"

const ESPECIALIDADES = [
  '', 'Mecânica Geral', 'Elétrica Automotiva', 'Funilaria e Pintura',
  'Borracharia', 'Freios e Suspensão', 'Ar-condicionado', 'Injeção Eletrônica',
  'Carroceria e Baú', 'Lavagem e Higienização', 'Guincho e Reboque', 'Outro',
]

// ─── FORMULÁRIO ──────────────────────────────────────────────────────────────
export function FormView({ editItem, onSaved, onCancelEdit }) {
  const [form, setForm] = useState(EMPTY)
  const [acao, setAcao] = useState('alterar')
  const [status, setStatus] = useState({ msg: '', type: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editItem) {
      setForm({
        nome: editItem.nome || '',
        cnpj_cpf: editItem.cnpj_cpf || '',
        telefone: editItem.telefone || '',
        email: editItem.email || '',
        endereco: editItem.endereco || '',
        cidade: editItem.cidade || '',
        especialidade: editItem.especialidade || '',
        observacao: editItem.observacao || '',
        ativo: editItem.ativo ?? true,
      })
      setAcao('alterar')
    } else {
      setForm(EMPTY)
      setAcao('alterar')
    }
  }, [editItem])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const showStatus = (msg, type = 'success') => {
    setStatus({ msg, type })
    setTimeout(() => setStatus({ msg: '', type: '' }), 3000)
  }

  const handleSubmit = async () => {
    if (!form.nome.trim()) { showStatus('Informe o Nome da Oficina/Prestador.', 'error'); return }
    setLoading(true)
    try {
      if (acao === 'excluir' && editItem) {
        await axios.delete(`${API}/oficinas-prestadores/${editItem.id}`)
        showStatus('Excluído com sucesso!')
        setTimeout(() => onCancelEdit(), 1500)
      } else if (editItem) {
        await axios.put(`${API}/oficinas-prestadores/${editItem.id}`, {
          nome: form.nome.trim(),
          cnpj_cpf: form.cnpj_cpf || null,
          telefone: form.telefone || null,
          email: form.email || null,
          endereco: form.endereco || null,
          cidade: form.cidade || null,
          especialidade: form.especialidade || null,
          observacao: form.observacao || null,
          ativo: form.ativo,
        })
        showStatus('Atualizado com sucesso!')
        onSaved()
      } else {
        const res = await axios.post(`${API}/oficinas-prestadores`, {
          nome: form.nome.trim(),
          cnpj_cpf: form.cnpj_cpf || null,
          telefone: form.telefone || null,
          email: form.email || null,
          endereco: form.endereco || null,
          cidade: form.cidade || null,
          especialidade: form.especialidade || null,
          observacao: form.observacao || null,
          ativo: form.ativo,
        })
        showStatus('Cadastrado com sucesso!')
        setForm(EMPTY)
        onSaved(res.data.nome)
      }
    } catch (err) {
      showStatus(err.response?.data?.detail || 'Erro ao salvar.', 'error')
    } finally { setLoading(false) }
  }

  const rowLbl = "px-3 py-2 text-right text-xs font-bold text-blue-900 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 whitespace-nowrap w-52"
  const rowLblOpt = "px-3 py-2 text-right text-xs font-semibold text-blue-900 dark:text-blue-300 bg-gray-100 dark:bg-gray-700 border border-blue-200 dark:border-blue-800/40 whitespace-nowrap"
  const rowCell = "px-2 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      <h1 className="text-center text-base font-bold text-blue-700">
        Cadastro de Oficina / Prestador
      </h1>

      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <td className={rowLbl}>Nome <span className="text-red-500">*</span></td>
              <td className={rowCell}>
                <input className={`${inp} border-orange-400 focus:border-orange-500`}
                  value={form.nome} onChange={set('nome')} placeholder="Obrigatório" />
              </td>
            </tr>
            <tr>
              <td className={rowLblOpt}>CNPJ / CPF</td>
              <td className={rowCell}>
                <input className={inp} value={form.cnpj_cpf} onChange={set('cnpj_cpf')} placeholder="00.000.000/0001-00" />
              </td>
            </tr>
            <tr>
              <td className={rowLbl}>Telefone</td>
              <td className={rowCell}>
                <input className={inp} value={form.telefone} onChange={set('telefone')} placeholder="(00) 00000-0000" />
              </td>
            </tr>
            <tr>
              <td className={rowLblOpt}>E-mail</td>
              <td className={rowCell}>
                <input type="email" className={inp} value={form.email} onChange={set('email')} placeholder="contato@oficina.com.br" />
              </td>
            </tr>
            <tr>
              <td className={rowLbl}>Especialidade</td>
              <td className={rowCell}>
                <select className={sel} value={form.especialidade} onChange={set('especialidade')}>
                  {ESPECIALIDADES.map(e => <option key={e} value={e}>{e || '— Selecione —'}</option>)}
                </select>
              </td>
            </tr>
            <tr>
              <td className={rowLblOpt}>Endereço</td>
              <td className={rowCell}>
                <input className={inp} value={form.endereco} onChange={set('endereco')} placeholder="Rua, número, bairro" />
              </td>
            </tr>
            <tr>
              <td className={rowLbl}>Cidade</td>
              <td className={rowCell}>
                <input className={inp} value={form.cidade} onChange={set('cidade')} placeholder="Cidade / UF" />
              </td>
            </tr>
            <tr>
              <td className={rowLblOpt}>Observação</td>
              <td className={rowCell}>
                <textarea className={`${inp} resize-none`} rows={2} value={form.observacao} onChange={set('observacao')} placeholder="Informações adicionais..." />
              </td>
            </tr>
            <tr>
              <td className={rowLbl}>Ativo</td>
              <td className={rowCell}>
                <select className={sel} value={form.ativo ? 'Sim' : 'Não'}
                  onChange={(e) => setForm(f => ({ ...f, ativo: e.target.value === 'Sim' }))}>
                  <option>Sim</option>
                  <option>Não</option>
                </select>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 border border-blue-200 dark:border-blue-800/40">
                Ação:
              </td>
              <td className="px-2 py-1.5 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <span className="flex items-center gap-4 text-xs">
                  {editItem ? (
                    <>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="acao" checked={acao === 'alterar'} onChange={() => setAcao('alterar')} /> Alterar
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="acao" checked={acao === 'excluir'} onChange={() => setAcao('excluir')} /> Excluir
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

        <div className="bg-gray-100 dark:bg-gray-700 border-t border-gray-300 dark:border-gray-600 flex items-center justify-center gap-3 py-2">
          <button onClick={handleSubmit} disabled={loading}
            className={`px-6 py-1 text-xs border rounded shadow-sm bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 dark:text-gray-200 ${acao === 'excluir' ? 'border-red-400 text-red-600' : 'border-gray-400 dark:border-gray-500'}`}>
            {loading ? 'Aguarde...' : 'Confirmar'}
          </button>
          {editItem && (
            <button onClick={onCancelEdit}
              className="px-4 py-1 text-xs bg-white dark:bg-gray-600 border border-gray-400 dark:border-gray-500 rounded hover:bg-gray-50 dark:hover:bg-gray-500 dark:text-gray-200 shadow-sm">
              Cancelar
            </button>
          )}
        </div>

        <div className={`px-3 py-1.5 text-xs flex items-center gap-2 border-t border-gray-300 dark:border-gray-600 ${
          status.type === 'error' ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
          status.msg ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-400'}`}>
          <span className="font-semibold">Status:</span>
          {status.type === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
          {status.type === 'success' && <CheckCircle className="w-3.5 h-3.5" />}
          {status.msg}
        </div>
      </div>

      <div className="text-center">
        <button onClick={onCancelEdit} className="text-xs text-blue-600 hover:underline font-medium">
          ← Listagem de Oficinas / Prestadores
        </button>
      </div>
    </div>
  )
}

// ─── MODAL (usado pelo LookupField) ──────────────────────────────────────────
export function OficinaPrestadorModal({ onClose, onSelected }) {
  const handleSaved = (nome) => {
    if (nome) { onSelected(nome); onClose() }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center overflow-auto py-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-xl mx-4" onMouseDown={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-3 flex items-center justify-between rounded-t-xl">
          <span className="text-white font-bold text-sm">Cadastro de Oficina / Prestador</span>
          <button type="button" onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          <FormView editItem={null} onSaved={handleSaved} onCancelEdit={onClose} />
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── LISTAGEM ─────────────────────────────────────────────────────────────────
export default function CadastroOficinaPrestador() {
  const [view, setView] = useState('list')
  const [editItem, setEditItem] = useState(null)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [fSearch, setFSearch] = useState('')
  const [fCidade, setFCidade] = useState('')
  const [fEspecialidade, setFEspecialidade] = useState('')
  const [fAtivo, setFAtivo] = useState('')
  const [appliedFilters, setAppliedFilters] = useState({})

  const loadList = useCallback(async (filters = appliedFilters, pg = page, pp = perPage) => {
    setLoading(true)
    try {
      const r = await axios.get(`${API}/oficinas-prestadores`, { params: { page: pg, per_page: pp, ...filters } })
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
    if (fSearch) f.search = fSearch
    if (fCidade) f.cidade = fCidade
    if (fEspecialidade) f.especialidade = fEspecialidade
    if (fAtivo) f.ativo = fAtivo
    setAppliedFilters(f)
    setPage(1)
    loadList(f, 1, perPage)
  }

  const handleLimpar = () => {
    setFSearch(''); setFCidade(''); setFEspecialidade(''); setFAtivo('')
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
    setView('list')
    setEditItem(null)
    setStatusMsg('Salvo com sucesso!')
    setTimeout(() => setStatusMsg(''), 3000)
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
    <div className="space-y-3 max-w-5xl mx-auto">
      <h1 className="text-center text-base font-bold text-blue-700">
        Listagem de Oficinas / Prestadores
      </h1>

      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm overflow-hidden">
        {/* Paginação */}
        <div className="bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-1.5 py-0.5 text-xs border rounded disabled:opacity-40 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 dark:text-gray-200 dark:border-gray-500">«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-1.5 py-0.5 text-xs border rounded disabled:opacity-40 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 dark:text-gray-200 dark:border-gray-500">‹</button>
            {pageNums().map(n => (
              <button key={n} onClick={() => setPage(n)}
                className={`px-2 py-0.5 text-xs border rounded ${n === page ? 'bg-blue-700 text-white border-blue-700' : 'bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 dark:text-gray-200 dark:border-gray-500'}`}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-1.5 py-0.5 text-xs border rounded disabled:opacity-40 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 dark:text-gray-200 dark:border-gray-500">›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="px-1.5 py-0.5 text-xs border rounded disabled:opacity-40 bg-white dark:bg-gray-600 hover:bg-gray-50 dark:hover:bg-gray-500 dark:text-gray-200 dark:border-gray-500">»</button>
          </div>
          <div className="flex items-center gap-2">
            <select className="border border-gray-300 rounded text-xs px-1 py-0.5 bg-blue-700 text-white"
              value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}>
              {[10, 20, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="text-center text-xs text-blue-600 py-1 border-b border-gray-200 dark:border-gray-700">
          {total === 0 ? 'Nenhum registro' : `${(page - 1) * perPage + 1} à ${Math.min(page * perPage, total)} de ${total}`}
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-100 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800/40">
                <th className="px-3 py-1.5 text-left text-blue-800 dark:text-blue-300 font-semibold">Nome</th>
                <th className="px-3 py-1.5 text-left text-blue-800 dark:text-blue-300 font-semibold">CNPJ/CPF</th>
                <th className="px-3 py-1.5 text-left text-blue-800 dark:text-blue-300 font-semibold">Telefone</th>
                <th className="px-3 py-1.5 text-left text-blue-800 dark:text-blue-300 font-semibold">Especialidade</th>
                <th className="px-3 py-1.5 text-left text-blue-800 dark:text-blue-300 font-semibold">Cidade</th>
                <th className="px-3 py-1.5 text-center text-blue-800 dark:text-blue-300 font-semibold">Ativo</th>
                <th className="px-3 py-1.5 text-center text-blue-800 dark:text-blue-300 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">
                  <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Carregando...
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum registro encontrado.</td></tr>
              ) : items.map((item, idx) => (
                <tr key={item.id} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 ${idx % 2 === 0 ? 'dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                  <td className="px-3 py-1.5 font-medium dark:text-gray-200">{item.nome}</td>
                  <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{item.cnpj_cpf || '-'}</td>
                  <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{item.telefone || '-'}</td>
                  <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{item.especialidade || '-'}</td>
                  <td className="px-3 py-1.5 text-gray-500 dark:text-gray-400">{item.cidade || '-'}</td>
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
        <div className="border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 px-3 py-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900 dark:text-blue-300 w-28 text-right shrink-0">Nome / Telefone</span>
              <input className="border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 flex-1 text-xs focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100"
                value={fSearch} onChange={e => setFSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFiltrar()} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900 dark:text-blue-300 w-20 text-right shrink-0">Cidade</span>
              <input className="border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 flex-1 text-xs focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100"
                value={fCidade} onChange={e => setFCidade(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFiltrar()} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900 dark:text-blue-300 w-28 text-right shrink-0">Especialidade</span>
              <select className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none flex-1"
                value={fEspecialidade} onChange={e => setFEspecialidade(e.target.value)}>
                <option value=""></option>
                {ESPECIALIDADES.filter(Boolean).map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900 dark:text-blue-300 w-20 text-right shrink-0">Ativo</span>
              <select className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none"
                value={fAtivo} onChange={e => setFAtivo(e.target.value)}>
                <option value=""></option>
                <option value="true">Sim</option>
                <option value="false">Não</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-center">
            <button onClick={handleFiltrar}
              className="px-5 py-1 text-xs bg-white dark:bg-gray-700 dark:text-gray-200 border border-gray-400 dark:border-gray-500 rounded hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm">Filtrar</button>
            <button onClick={handleLimpar}
              className="px-5 py-1 text-xs bg-white dark:bg-gray-700 dark:text-gray-200 border border-gray-400 dark:border-gray-500 rounded hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm">Limpar</button>
          </div>
        </div>

        {/* Status */}
        <div className={`px-3 py-1.5 text-xs flex items-center gap-2 border-t border-gray-300 dark:border-gray-600 ${statusMsg ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-400 dark:text-blue-500'}`}>
          <span className="font-semibold">Status:</span>
          {statusMsg && <CheckCircle className="w-3.5 h-3.5" />}
          {statusMsg}
        </div>
      </div>

      <div className="text-center">
        <button onClick={() => { setEditItem(null); setView('form') }}
          className="text-xs text-blue-600 hover:underline font-medium">
          Adicionar Oficina / Prestador
        </button>
      </div>
    </div>
  )
}
