import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import {
  Package, Plus, Search, Pencil, Trash2, X, Save,
  Loader2, AlertCircle, CheckCircle, ArrowDownCircle,
  ArrowUpCircle, ChevronLeft, ChevronRight, Eye,
} from 'lucide-react'
import { API } from '../../lib/config'

const inp = "border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-700 dark:text-gray-100"
const sel = "border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-700 dark:text-gray-100"

const emptyPeca = { nome: '', descricao: '', unidade: 'un', estoque_minimo: '', ativo: true }
const emptyMovimento = { peca_id: '', tipo: 'entrada', quantidade: '', preco_unitario: '', fornecedor: '', nota_fiscal: '', observacao: '', usuario: '' }

function fmtNum(v) {
  if (v == null || v === '') return '0'
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
}
function fmtMoney(v) {
  if (v == null || v === '') return '-'
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function fmtDt(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ peca }) {
  const atual = Number(peca.estoque_atual ?? 0)
  const minimo = Number(peca.estoque_minimo ?? 0)
  if (atual <= 0) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white">Zerado</span>
  if (minimo > 0 && atual <= minimo) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500 text-white">Baixo</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-500 text-white">OK</span>
}

function Toast({ msg, onClose }) {
  if (!msg) return null
  const isErr = msg.startsWith('!')
  const text = isErr ? msg.slice(1) : msg
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border text-sm font-medium animate-fade-in max-w-sm
      ${isErr ? 'bg-red-600 border-red-700 text-white' : 'bg-green-600 border-green-700 text-white'}`}>
      {isErr ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
      <span className="flex-1">{text}</span>
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  )
}

// ── Modal Peça ────────────────────────────────────────────────────────────────
function ModalPeca({ peca, onClose, onSaved }) {
  const [form, setForm] = useState(peca ? { ...peca, estoque_minimo: peca.estoque_minimo ?? '' } : { ...emptyPeca })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const isEdit = Boolean(peca?.id)

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome.trim()) { setErr('Nome é obrigatório'); return }
    setSaving(true); setErr('')
    try {
      const payload = {
        ...form,
        estoque_minimo: form.estoque_minimo !== '' ? Number(form.estoque_minimo) : 0,
        ativo: Boolean(form.ativo),
      }
      if (isEdit) {
        await axios.put(`${API}/pecas/${peca.id}`, payload)
      } else {
        await axios.post(`${API}/pecas`, payload)
      }
      onSaved()
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Erro ao salvar peça')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg">
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-5 py-3 rounded-t-xl flex items-center justify-between">
          <span className="text-white font-bold text-sm flex items-center gap-2">
            <Package className="w-4 h-4" />
            {isEdit ? 'Editar Peça' : 'Nova Peça'}
          </span>
          <button onClick={onClose} className="text-blue-200 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {err && (
            <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{err}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Nome <span className="text-red-500">*</span></label>
              <input className={inp} value={form.nome} onChange={setF('nome')} placeholder="Ex: Filtro de óleo" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Unidade</label>
              <select className={sel} value={form.unidade} onChange={setF('unidade')}>
                <option value="un">un</option>
                <option value="kg">kg</option>
                <option value="L">L</option>
                <option value="m">m</option>
                <option value="cx">cx</option>
                <option value="par">par</option>
                <option value="jogo">jogo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Estoque Mínimo</label>
              <input className={inp} type="number" step="0.01" min="0" value={form.estoque_minimo} onChange={setF('estoque_minimo')} placeholder="0" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Status</label>
              <div className="flex gap-2">
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, ativo: true }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${form.ativo ? 'bg-green-500 border-green-500 text-white' : 'bg-transparent border-gray-300 dark:border-gray-600 text-gray-400 hover:border-green-400 hover:text-green-400'}`}>
                  Ativo
                </button>
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, ativo: false }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold border-2 transition-colors ${!form.ativo ? 'bg-red-500 border-red-500 text-white' : 'bg-transparent border-gray-300 dark:border-gray-600 text-gray-400 hover:border-red-400 hover:text-red-400'}`}>
                  Inativo
                </button>
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Descrição</label>
              <textarea className={`${inp} resize-none`} rows={2} value={form.descricao} onChange={setF('descricao')} placeholder="Descrição opcional..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-colors">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal Entrada de Estoque ──────────────────────────────────────────────────
function ModalEntrada({ pecaInicial, onClose, onSaved }) {
  const [form, setForm] = useState({
    ...emptyMovimento,
    peca_id: pecaInicial?.id || '',
    tipo: 'entrada',
  })
  const [pecaSearch, setPecaSearch] = useState(pecaInicial?.nome || '')
  const [pecaSugestoes, setPecaSugestoes] = useState([])
  const [pecaSelecionada, setPecaSelecionada] = useState(pecaInicial || null)
  const [showDrop, setShowDrop] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    if (pecaSearch.length < 1) { setPecaSugestoes([]); return }
    axios.get(`${API}/pecas`, { params: { q: pecaSearch, per_page: 20 } })
      .then(r => setPecaSugestoes(r.data.items))
      .catch(() => {})
  }, [pecaSearch])

  const selectPeca = (p) => {
    setPecaSelecionada(p)
    setPecaSearch(p.nome)
    setForm(f => ({ ...f, peca_id: p.id }))
    setShowDrop(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.peca_id) { setErr('Selecione uma peça'); return }
    if (!form.quantidade || Number(form.quantidade) <= 0) { setErr('Informe a quantidade'); return }
    setSaving(true); setErr('')
    try {
      const payload = {
        peca_id: Number(form.peca_id),
        tipo: form.tipo,
        quantidade: Number(form.quantidade),
        preco_unitario: form.preco_unitario ? Number(form.preco_unitario) : null,
        fornecedor: form.fornecedor || null,
        nota_fiscal: form.nota_fiscal || null,
        observacao: form.observacao || null,
        usuario: form.usuario || null,
        manutencao_id: null,
      }
      await axios.post(`${API}/movimentos-estoque`, payload)
      onSaved()
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Erro ao registrar movimento')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg">
        <div className="bg-gradient-to-r from-green-700 to-green-500 px-5 py-3 rounded-t-xl flex items-center justify-between">
          <span className="text-white font-bold text-sm flex items-center gap-2">
            <ArrowDownCircle className="w-4 h-4" />
            Registrar {form.tipo === 'entrada' ? 'Entrada' : 'Saída'} de Estoque
          </span>
          <button onClick={onClose} className="text-green-200 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {err && (
            <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{err}
            </div>
          )}

          {/* Tipo */}
          <div>
            <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Tipo de Movimento</label>
            <div className="flex gap-2">
              {['entrada', 'saida'].map(t => (
                <button key={t} type="button"
                  onClick={() => setForm(f => ({ ...f, tipo: t }))}
                  className={`flex-1 py-1.5 rounded text-xs font-bold border transition-colors
                    ${form.tipo === t
                      ? (t === 'entrada' ? 'bg-green-600 text-white border-green-600' : 'bg-red-600 text-white border-red-600')
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}>
                  {t === 'entrada' ? 'Entrada' : 'Saída'}
                </button>
              ))}
            </div>
          </div>

          {/* Busca de peça */}
          <div className="relative">
            <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Peça <span className="text-red-500">*</span></label>
            <div className="flex gap-1">
              <input className={inp} value={pecaSearch}
                onChange={e => { setPecaSearch(e.target.value); setShowDrop(true); setPecaSelecionada(null); setForm(f => ({ ...f, peca_id: '' })) }}
                onFocus={() => setShowDrop(true)}
                onBlur={() => setTimeout(() => setShowDrop(false), 200)}
                placeholder="Buscar peça por nome ou código..." />
              <button type="button" onClick={() => setShowDrop(d => !d)}
                className="border border-gray-300 dark:border-gray-600 rounded px-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 text-blue-600 dark:text-blue-400 transition-colors">
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
            {showDrop && pecaSugestoes.length > 0 && (
              <ul className="absolute z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg mt-0.5 w-full max-h-40 overflow-y-auto text-xs">
                {pecaSugestoes.map(p => (
                  <li key={p.id} onMouseDown={() => selectPeca(p)}
                    className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer border-b border-gray-50 dark:border-gray-700 last:border-0 flex items-center justify-between">
                    <span className="font-semibold dark:text-gray-200">{p.nome}</span>
                    <span className="text-gray-400 dark:text-gray-500">{p.codigo || ''} · Estoque: {fmtNum(p.estoque_atual)} {p.unidade}</span>
                  </li>
                ))}
              </ul>
            )}
            {pecaSelecionada && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                Estoque atual: <strong>{fmtNum(pecaSelecionada.estoque_atual)} {pecaSelecionada.unidade}</strong>
                {Number(pecaSelecionada.estoque_minimo) > 0 && ` · Mínimo: ${fmtNum(pecaSelecionada.estoque_minimo)}`}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Quantidade <span className="text-red-500">*</span></label>
              <input className={inp} type="number" step="0.001" min="0.001" value={form.quantidade} onChange={setF('quantidade')} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Preço Unitário</label>
              <input className={inp} type="number" step="0.01" min="0" value={form.preco_unitario} onChange={setF('preco_unitario')} placeholder="R$ 0,00" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Fornecedor</label>
              <input className={inp} value={form.fornecedor} onChange={setF('fornecedor')} placeholder="Nome do fornecedor" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Nota Fiscal</label>
              <input className={inp} value={form.nota_fiscal} onChange={setF('nota_fiscal')} placeholder="Nº NF" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Usuário</label>
              <input className={inp} value={form.usuario} onChange={setF('usuario')} placeholder="Seu nome" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Observação</label>
              <input className={inp} value={form.observacao} onChange={setF('observacao')} placeholder="Observação..." />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-1.5 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-colors">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Painel de Movimentos ──────────────────────────────────────────────────────
function PainelMovimentos({ peca, onClose, onRefresh }) {
  const [movimentos, setMovimentos] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    if (!peca) return
    setLoading(true)
    axios.get(`${API}/movimentos-estoque`, { params: { peca_id: peca.id } })
      .then(r => setMovimentos(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [peca])

  useEffect(() => { load() }, [load])

  const handleDelete = async (mv) => {
    if (!window.confirm('Remover este movimento?')) return
    try {
      await axios.delete(`${API}/movimentos-estoque/${mv.id}`)
      setMovimentos(m => m.filter(x => x.id !== mv.id))
      onRefresh()
    } catch {}
  }

  if (!peca) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-5 py-3 rounded-t-xl flex items-center justify-between flex-shrink-0">
          <span className="text-white font-bold text-sm flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Movimentos — {peca.nome}
            <span className="text-blue-200 font-normal text-xs">Estoque atual: {fmtNum(peca.estoque_atual)} {peca.unidade}</span>
          </span>
          <button onClick={onClose} className="text-blue-200 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-20 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
            </div>
          ) : movimentos.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">Nenhum movimento registrado.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/40">
                  <th className="px-3 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold">Data</th>
                  <th className="px-3 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold">Tipo</th>
                  <th className="px-3 py-2 text-right text-blue-800 dark:text-blue-300 font-semibold">Qtd</th>
                  <th className="px-3 py-2 text-right text-blue-800 dark:text-blue-300 font-semibold">Preço Unit.</th>
                  <th className="px-3 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold">Fornecedor</th>
                  <th className="px-3 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold">NF / OS</th>
                  <th className="px-3 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold">Observação</th>
                  <th className="px-3 py-2 text-center text-blue-800 dark:text-blue-300 font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {movimentos.map((mv, i) => (
                  <tr key={mv.id} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">{fmtDt(mv.created_at)}</td>
                    <td className="px-3 py-2">
                      {mv.tipo === 'entrada'
                        ? <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold"><ArrowDownCircle className="w-3 h-3" /> Entrada</span>
                        : <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold"><ArrowUpCircle className="w-3 h-3" /> Saída</span>
                      }
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold dark:text-gray-200">{fmtNum(mv.quantidade)} {mv.peca_unidade}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600 dark:text-gray-400">{mv.preco_unitario ? fmtMoney(mv.preco_unitario) : '-'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{mv.fornecedor || '-'}</td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">
                      {mv.nota_fiscal || ''}
                      {mv.manutencao_placa && <span className="text-blue-500 dark:text-blue-400"> OS:{mv.manutencao_placa}</span>}
                      {!mv.nota_fiscal && !mv.manutencao_placa && '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{mv.observacao || '-'}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => handleDelete(mv)} title="Remover"
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Página Principal ──────────────────────────────────────────────────────────
export default function Estoque() {
  const [pecas, setPecas] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('true')
  const [toast, setToast] = useState('')
  const [modalPeca, setModalPeca] = useState(null)   // null | false (nova) | {peca obj} (editar)
  const [modalEntrada, setModalEntrada] = useState(null) // null | false | peca obj
  const [painelMov, setPainelMov] = useState(null)   // null | peca obj

  const PER_PAGE = 50

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const loadPecas = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, per_page: PER_PAGE }
      if (search) params.q = search
      if (filtroAtivo !== '') params.ativo = filtroAtivo === 'true'
      const r = await axios.get(`${API}/pecas`, { params })
      setPecas(r.data.items)
      setTotal(r.data.total)
    } catch {
      showToast('!Erro ao carregar peças')
    } finally { setLoading(false) }
  }, [page, search, filtroAtivo])

  useEffect(() => { loadPecas() }, [loadPecas])

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [search, filtroAtivo])

  const handleDelete = async (peca) => {
    if (!window.confirm(`Excluir a peça "${peca.nome}"? Todos os movimentos serão removidos.`)) return
    try {
      await axios.delete(`${API}/pecas/${peca.id}`)
      showToast('Peça excluída')
      loadPecas()
    } catch (ex) {
      showToast('!' + (ex.response?.data?.detail || 'Erro ao excluir'))
    }
  }

  const totalPages = Math.ceil(total / PER_PAGE) || 1

  return (
    <div className="space-y-4 w-full">
      <Toast msg={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-lg shadow px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-6 h-6 text-blue-300" />
          <div>
            <h1 className="text-white font-bold text-base leading-tight">Estoque de Peças</h1>
            <p className="text-blue-200 text-xs">{total} peça(s) cadastrada(s)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModalEntrada(false)}
            className="px-3 py-1.5 text-xs bg-green-500 hover:bg-green-400 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-colors">
            <ArrowDownCircle className="w-3.5 h-3.5" /> Registrar Entrada
          </button>
          <button onClick={() => setModalPeca(false)}
            className="px-3 py-1.5 text-xs bg-white/20 hover:bg-white/30 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nova Peça
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 pl-7 text-xs w-full focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-700 dark:text-gray-100"
            placeholder="Buscar por nome ou código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none"
          value={filtroAtivo} onChange={e => setFiltroAtivo(e.target.value)}>
          <option value="true">Somente ativas</option>
          <option value="false">Somente inativas</option>
          <option value="">Todas</option>
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
          </div>
        ) : pecas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500">
            <Package className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">Nenhuma peça encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/40">
                  <th className="px-3 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold">Código</th>
                  <th className="px-3 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold">Nome</th>
                  <th className="px-3 py-2 text-center text-blue-800 dark:text-blue-300 font-semibold">Unidade</th>
                  <th className="px-3 py-2 text-right text-blue-800 dark:text-blue-300 font-semibold">Estoque Atual</th>
                  <th className="px-3 py-2 text-right text-blue-800 dark:text-blue-300 font-semibold">Estoque Mínimo</th>
                  <th className="px-3 py-2 text-center text-blue-800 dark:text-blue-300 font-semibold">Status</th>
                  <th className="px-3 py-2 text-center text-blue-800 dark:text-blue-300 font-semibold">Ativo</th>
                  <th className="px-3 py-2 text-center text-blue-800 dark:text-blue-300 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pecas.map((p, i) => (
                  <tr key={p.id}
                    className={`border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors
                      ${i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                    <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400">{p.codigo || '-'}</td>
                    <td className="px-3 py-2 font-semibold dark:text-gray-200">{p.nome}</td>
                    <td className="px-3 py-2 text-center text-gray-500 dark:text-gray-400">{p.unidade}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold dark:text-gray-200">{fmtNum(p.estoque_atual)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-500 dark:text-gray-400">{fmtNum(p.estoque_minimo)}</td>
                    <td className="px-3 py-2 text-center"><StatusBadge peca={p} /></td>
                    <td className="px-3 py-2 text-center">
                      {p.ativo
                        ? <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold">Ativo</span>
                        : <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-semibold">Inativo</span>
                      }
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setPainelMov(p)} title="Ver movimentos"
                          className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setModalEntrada(p)} title="Registrar entrada"
                          className="p-1 text-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors">
                          <ArrowDownCircle className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setModalPeca(p)} title="Editar"
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(p)} title="Excluir"
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{total} peça(s) · Página {page} de {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      {modalPeca !== null && (
        <ModalPeca
          peca={modalPeca || null}
          onClose={() => setModalPeca(null)}
          onSaved={() => { setModalPeca(null); loadPecas(); showToast(modalPeca ? 'Peça atualizada!' : 'Peça cadastrada!') }}
        />
      )}
      {modalEntrada !== null && (
        <ModalEntrada
          pecaInicial={modalEntrada || null}
          onClose={() => setModalEntrada(null)}
          onSaved={() => { setModalEntrada(null); loadPecas(); showToast('Movimento registrado!') }}
        />
      )}
      {painelMov && (
        <PainelMovimentos
          peca={painelMov}
          onClose={() => setPainelMov(null)}
          onRefresh={loadPecas}
        />
      )}
    </div>
  )
}
