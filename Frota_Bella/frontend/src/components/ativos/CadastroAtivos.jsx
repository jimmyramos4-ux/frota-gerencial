import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import {
  Plus, Pencil, Trash2, RefreshCw, Search, X, Save,
  Loader2, Package, AlertCircle, CheckCircle,
  ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react'
import { API } from '../../lib/config'


const EMPTY = {
  nome: '', tipo: '', codigo: '', localizacao: '',
  descricao: '', observacao: '', ativo: true,
}

const TIPOS = [
  '', 'Instalação', 'Equipamento', 'Veículo Especial',
  'Ferramenta', 'Infraestrutura', 'Refrigeração', 'Outro',
]

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />
  return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
}

// ── MODAL ────────────────────────────────────────────────────────────────────
export function AtivoModal({ ativo, onClose, onSaved }) {
  const isEdit = Boolean(ativo?.id)
  const [form, setForm] = useState(
    ativo
      ? { nome: ativo.nome || '', tipo: ativo.tipo || '', codigo: ativo.codigo || '', localizacao: ativo.localizacao || '', descricao: ativo.descricao || '', observacao: ativo.observacao || '', ativo: ativo.ativo ?? true }
      : EMPTY
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setF = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        nome: form.nome.trim(),
        tipo: form.tipo || null,
        codigo: form.codigo || null,
        localizacao: form.localizacao || null,
        descricao: form.descricao || null,
        observacao: form.observacao || null,
        ativo: form.ativo,
      }
      if (isEdit) {
        await axios.put(`${API}/ativos/${ativo.id}`, payload)
      } else {
        await axios.post(`${API}/ativos`, payload)
      }
      onSaved()
    } catch (err) {
      const d = err.response?.data?.detail
      setError(typeof d === 'string' ? d : 'Erro ao salvar ativo')
    } finally { setSaving(false) }
  }

  const inp = "border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-700 dark:text-gray-100"
  const sel = "border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-700 dark:text-gray-100"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between bg-blue-700 text-white px-4 py-2 rounded-t">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            <span className="font-semibold text-sm">
              {isEdit ? `Editar Ativo: ${ativo.nome}` : 'Novo Ativo'}
            </span>
          </div>
          <button onClick={onClose} className="hover:text-blue-200"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded flex items-center gap-2 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
          <div>
            <label className="form-label">Nome <span className="text-red-500">*</span></label>
            <input className={inp} value={form.nome} onChange={setF('nome')} placeholder="Ex: Garagem Principal, Empilhadeira 01..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Tipo</label>
              <select className={sel} value={form.tipo} onChange={setF('tipo')}>
                {TIPOS.map(t => <option key={t} value={t}>{t || '— Selecione —'}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Código Interno</label>
              <input className={inp} value={form.codigo} onChange={setF('codigo')} placeholder="Ex: EQ-001" />
            </div>
          </div>
          <div>
            <label className="form-label">Localização</label>
            <input className={inp} value={form.localizacao} onChange={setF('localizacao')} placeholder="Ex: Galpão A, Pátio Central..." />
          </div>
          <div>
            <label className="form-label">Descrição</label>
            <input className={inp} value={form.descricao} onChange={setF('descricao')} placeholder="Descrição resumida do ativo" />
          </div>
          <div>
            <label className="form-label">Observação</label>
            <textarea className={`${inp} resize-none`} rows={2} value={form.observacao} onChange={setF('observacao')} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={form.ativo}
              onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
              className="w-3.5 h-3.5 accent-blue-600" />
            Ativo
          </label>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" className="btn-secondary btn-sm px-4 py-1.5" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary btn-sm px-4 py-1.5 flex items-center gap-1.5" disabled={saving}>
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {saving ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── LISTAGEM ──────────────────────────────────────────────────────────────────
export default function CadastroAtivos() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'new' | ativo object
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [sortField, setSortField] = useState('')
  const [sortDir, setSortDir] = useState('asc')
  const PER_PAGE = 15

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await axios.get(`${API}/ativos`, {
        params: { page, per_page: PER_PAGE, search: search || undefined },
      })
      setItems(r.data.items)
      setTotal(r.data.total)
    } finally { setLoading(false) }
  }, [page, search])

  useEffect(() => { load() }, [load])

  const handleSaved = () => {
    setModal(null)
    showToast('Ativo salvo com sucesso!')
    load()
  }

  const handleDelete = async (id, nome) => {
    if (!window.confirm(`Excluir o ativo "${nome}"?`)) return
    try {
      await axios.delete(`${API}/ativos/${id}`)
      showToast('Ativo excluído.')
      load()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Erro ao excluir', 'error')
    }
  }

  const tipoBadge = {
    'Instalação':      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    'Equipamento':     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    'Veículo Especial':'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    'Ferramenta':      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    'Infraestrutura':  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    'Refrigeração':    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
    'Outro':           'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  }

  const sorted = sortField
    ? [...items].sort((a, b) => {
        const va = a[sortField] ?? ''; const vb = b[sortField] ?? ''
        return sortDir === 'asc'
          ? String(va).localeCompare(String(vb), 'pt-BR', { numeric: true })
          : String(vb).localeCompare(String(va), 'pt-BR', { numeric: true })
      })
    : items

  return (
    <div className="space-y-3">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border text-sm font-medium max-w-sm
          ${toast.type === 'error' ? 'bg-red-600 border-red-700 text-white' : 'bg-green-600 border-green-700 text-white'}`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
          <span className="flex-1">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Título */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">Ativos / Equipamentos</h1>
        <div className="flex items-center gap-2">
          <button onClick={load} className="text-gray-500 hover:text-blue-600 transition-colors" title="Atualizar">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Novo Ativo
          </button>
        </div>
      </div>

      {/* Pesquisa */}
      <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center gap-2">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          className="flex-1 text-sm outline-none dark:text-gray-100 dark:placeholder-gray-400 bg-transparent"
          placeholder="Pesquisar por nome, código ou localização..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
        {search && <button onClick={() => { setSearch(''); setPage(1) }}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>}
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="section-header">Ativos Cadastrados ({total})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/40">
                {[['nome','Nome'],['tipo','Tipo'],['codigo','Código'],['localizacao','Localização'],['descricao','Descrição']].map(([f,l]) => (
                  <th key={f} className="px-3 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold cursor-pointer select-none hover:bg-blue-100 dark:hover:bg-blue-900/30 whitespace-nowrap" onClick={() => handleSort(f)}>
                    <span className="flex items-center gap-1">{l} <SortIcon field={f} sortField={sortField} sortDir={sortDir} /></span>
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold">Status</th>
                <th className="px-3 py-2 text-center text-blue-800 dark:text-blue-300 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />Carregando...
                </td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum ativo cadastrado.</td></tr>
              ) : sorted.map((item, idx) => (
                <tr key={item.id} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                  <td className="px-3 py-2 font-medium text-blue-700 dark:text-blue-400">{item.nome}</td>
                  <td className="px-3 py-2">
                    {item.tipo
                      ? <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${tipoBadge[item.tipo] || 'bg-gray-100 text-gray-600'}`}>{item.tipo}</span>
                      : <span className="text-gray-300">-</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400">{item.codigo || '-'}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{item.localizacao || '-'}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-gray-500 max-w-xs truncate">{item.descricao || '-'}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold
                      ${item.ativo ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1.5">
                      <button className="p-0.5 text-gray-500 hover:text-yellow-600" title="Editar" onClick={() => setModal(item)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-0.5 text-gray-500 hover:text-red-600" title="Excluir" onClick={() => handleDelete(item.id, item.nome)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {total > PER_PAGE && (
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500">
            <span>{total} registros — Página {page} de {Math.ceil(total / PER_PAGE)}</span>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-2 py-1 rounded border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">‹</button>
              <button disabled={page >= Math.ceil(total / PER_PAGE)} onClick={() => setPage(p => p + 1)}
                className="px-2 py-1 rounded border border-gray-200 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700">›</button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <AtivoModal
          ativo={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
