import React, { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import {
  ClipboardList, Plus, Trash2, Pencil, Check, X,
  AlertTriangle, ChevronDown, Search, Car, Package, Wrench, ImagePlus, Paperclip, ChevronLeft, ChevronRight,
  ArrowUp, ArrowDown, ArrowUpDown, FileSpreadsheet, FileText, CalendarClock, Save, Loader2,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { API } from '../../lib/config'

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />
  return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
}


const PRIORIDADES = ['Crítico', 'Alta', 'Média', 'Baixa']
const STATUS_LIST = ['Aberta', 'Em Análise', 'Finalizada', 'Rejeitada']

const priorBadge = {
  Crítico: 'bg-red-600 text-white',
  Alta:    'bg-orange-500 text-white',
  Média:   'bg-yellow-400 text-gray-900',
  Baixa:   'bg-green-500 text-white',
}

const statusBadge = {
  Aberta:      'bg-blue-100 text-blue-700 border border-blue-300',
  'Em Análise':'bg-purple-100 text-purple-700 border border-purple-300',
  Aprovada:    'bg-green-100 text-green-700 border border-green-300',
  Finalizada:  'bg-green-100 text-green-700 border border-green-300',
  Rejeitada:   'bg-red-100 text-red-700 border border-red-300',
}

const priorOrder = { Crítico: 0, Alta: 1, Média: 2, Baixa: 3 }

const todayISO = () => new Date().toISOString().split('T')[0]

const emptyForm = {
  veiculo_id: '',
  ativo_id: '',
  solicitante: '',
  parte_veiculo: '',
  descricao: '',
  prioridade: 'Média',
  status: 'Aberta',
  observacao: '',
  dt_solicitacao: todayISO(),
}

const inp = 'border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-700 dark:text-gray-100'
const sel = 'border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-700 dark:text-gray-100'

function fmtDate(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function fmtDateBR(dt) {
  if (!dt) return ''
  return new Date(dt + 'T00:00:00').toLocaleDateString('pt-BR')
}

function AcaoModal({ sol, onClose, onSaved }) {
  const [acao, setAcao] = useState(sol.acao || '')
  const [prazo, setPrazo] = useState(sol.prazo_acao || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const r = await axios.put(`${API}/solicitacoes/${sol.id}`, { acao, prazo_acao: prazo || null })
      onSaved(r.data)
      onClose()
    } catch { alert('Erro ao salvar ação') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between bg-blue-700 text-white px-4 py-2 rounded-t">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            <span className="font-semibold text-sm">Registrar Ação — #{sol.id}</span>
          </div>
          <button onClick={onClose} className="hover:text-blue-200"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded px-3 py-2 flex gap-2 flex-wrap">
            <span className="font-medium text-gray-700 dark:text-gray-200">{sol.veiculo?.placa || sol.ativo?.nome}</span>
            <span>·</span>
            <span>{sol.descricao}</span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Ação a ser tomada</label>
            <textarea
              className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-xs w-full focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-700 dark:text-gray-100 resize-none"
              rows={3}
              placeholder="Descreva a ação necessária..."
              value={acao}
              onChange={e => setAcao(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Prazo</label>
            <input type="date"
              className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-xs w-full focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-700 dark:text-gray-100"
              value={prazo} onChange={e => setPrazo(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end pt-1 border-t border-gray-100 dark:border-gray-700">
            <button onClick={onClose} className="btn-secondary btn-sm px-4 py-1.5">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary btn-sm px-4 py-1.5 flex items-center gap-1.5">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              {saving ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Solicitacoes() {
  const [items, setItems] = useState([])
  const [veiculos, setVeiculos] = useState([])
  const [ativos, setAtivos] = useState([])
  const [partes, setPartes] = useState([])
  const [formTipoEntidade, setFormTipoEntidade] = useState('veiculo') // 'veiculo' | 'ativo'
  const [editTipoEntidade, setEditTipoEntidade] = useState('veiculo')
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [searchParams] = useSearchParams()
  const [filterStatus, setFilterStatus] = useState(() => searchParams.get('status') ?? 'Aberta')
  const [filterPrior, setFilterPrior] = useState('')
  const [filterMes, setFilterMes] = useState(() => searchParams.get('mes') || '')
  const [search, setSearch] = useState('')
  const [filterEntidade, setFilterEntidade] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showResumo, setShowResumo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formImages, setFormImages] = useState([])
  const fileInputRef = useRef()
  const editFileInputRef = useRef()
  const [editImages, setEditImages] = useState([])
  const [lightbox, setLightbox] = useState(null) // { images: [], idx: 0 }
  const [sortField, setSortField] = useState('')
  const [sortDir, setSortDir] = useState('asc')
  const [acaoModal, setAcaoModal] = useState(null)

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  useEffect(() => {
    load()
    axios.get(`${API}/veiculos`).then(r => setVeiculos(r.data)).catch(() => {})
    axios.get(`${API}/ativos`, { params: { per_page: 200, ativo: 'true' } }).then(r => setAtivos(r.data.items)).catch(() => {})
    axios.get(`${API}/partes-veiculo/lookup`).then(r => setPartes(r.data)).catch(() => {})
  }, [])

  const load = async () => {
    try {
      const r = await axios.get(`${API}/solicitacoes`, { params: { per_page: 200 } })
      setItems(r.data.items)
    } catch { setError('Erro ao carregar solicitações') }
  }

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const setEf = k => e => setEditForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.veiculo_id && !form.ativo_id || !form.descricao.trim()) {
      setError('Selecione um Veículo ou Ativo e preencha a Descrição'); return
    }
    setSaving(true); setError('')
    try {
      const payload = { ...form, veiculo_id: form.veiculo_id ? Number(form.veiculo_id) : null, ativo_id: form.ativo_id ? Number(form.ativo_id) : null, imagens: formImages.length ? JSON.stringify(formImages) : null, dt_solicitacao: form.dt_solicitacao ? form.dt_solicitacao + 'T00:00:00' : null }
      const r = await axios.post(`${API}/solicitacoes`, payload)
      setItems(prev => [r.data, ...prev])
      setForm(emptyForm)
      setFormImages([])
      setShowForm(false)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const diasAberto = (dt) => {
    if (!dt) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const d = new Date(dt.includes('T') ? dt : dt + 'T00:00:00'); d.setHours(0, 0, 0, 0)
    return Math.floor((today - d) / 86400000)
  }

  const startEdit = (s) => {
    setEditingId(s.id)
    setEditTipoEntidade(s.ativo_id && !s.veiculo_id ? 'ativo' : 'veiculo')
    setEditForm({
      veiculo_id: s.veiculo_id || '',
      ativo_id: s.ativo_id || '',
      solicitante: s.solicitante || '',
      parte_veiculo: s.parte_veiculo || '',
      descricao: s.descricao || '',
      prioridade: s.prioridade || 'Média',
      status: s.status || 'Aberta',
      observacao: s.observacao || '',
      dt_solicitacao: s.dt_solicitacao ? s.dt_solicitacao.split('T')[0] : todayISO(),
    })
    setEditImages(s.imagens ? JSON.parse(s.imagens) : [])
  }

  const cancelEdit = () => { setEditingId(null); setEditForm({}); setEditImages([]) }

  const handleSaveEdit = async (id) => {
    try {
      const payload = { ...editForm, veiculo_id: editForm.veiculo_id ? Number(editForm.veiculo_id) : null, ativo_id: editForm.ativo_id ? Number(editForm.ativo_id) : null, imagens: editImages.length ? JSON.stringify(editImages) : null, dt_solicitacao: editForm.dt_solicitacao ? editForm.dt_solicitacao + 'T00:00:00' : null }
      const r = await axios.put(`${API}/solicitacoes/${id}`, payload)
      setItems(prev => prev.map(x => x.id === id ? r.data : x))
      cancelEdit()
    } catch { setError('Erro ao salvar') }
  }

  const addImages = (files, setter) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => setter(imgs => [...imgs, ev.target.result])
      reader.readAsDataURL(file)
    })
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta solicitação?')) return
    try {
      await axios.delete(`${API}/solicitacoes/${id}`)
      setItems(prev => prev.filter(x => x.id !== id))
    } catch { setError('Erro ao excluir') }
  }

  const handleAcaoSaved = (updated) => {
    setItems(prev => prev.map(i => i.id === updated.id ? { ...i, acao: updated.acao, prazo_acao: updated.prazo_acao } : i))
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      const r = await axios.put(`${API}/solicitacoes/${id}`, { status: newStatus })
      setItems(prev => prev.map(x => x.id === id ? r.data : x))
    } catch { setError('Erro ao atualizar status') }
  }

  const filtered = items
    .filter(s => !filterStatus || s.status === filterStatus)
    .filter(s => !filterPrior || s.prioridade === filterPrior)
    .filter(s => !filterMes || (s.dt_solicitacao || '').startsWith(filterMes))
    .filter(s => !filterEntidade || (s.veiculo?.placa === filterEntidade || s.ativo?.nome === filterEntidade))
    .filter(s => !search ||
      s.descricao.toLowerCase().includes(search.toLowerCase()) ||
      s.solicitante.toLowerCase().includes(search.toLowerCase()) ||
      (s.veiculo?.placa || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.ativo?.nome || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => (priorOrder[a.prioridade] ?? 9) - (priorOrder[b.prioridade] ?? 9))

  const displayItems = sortField
    ? [...filtered].sort((a, b) => {
        const va = a[sortField] ?? ''; const vb = b[sortField] ?? ''
        return sortDir === 'asc' ? String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) : String(vb).localeCompare(String(va), 'pt-BR', { numeric: true })
      })
    : filtered

  const fmtDt = (dt) => dt ? new Date(dt).toLocaleDateString('pt-BR') : ''
  const calcDiasAberto = (dt) => dt ? Math.floor((Date.now() - new Date(dt)) / 86400000) : ''

  const exportRows = (list) => list.map(s => ({
    '#': s.id,
    'Veículo/Ativo': s.veiculo?.placa || s.ativo?.nome || '',
    'Solicitante': s.solicitante || '',
    'Descrição': s.descricao || '',
    'Parte': s.parte_veiculo || '',
    'Prioridade': s.prioridade || '',
    'Dias em Aberto': calcDiasAberto(s.dt_solicitacao),
    'Status': s.status || '',
    'Data Solicitação': fmtDt(s.dt_solicitacao),
    'Observação': s.observacao || '',
    'Manutenção': s.manutencao_id ? `#${s.manutencao_id}` : '',
  }))

  const exportExcel = () => {
    const rows = exportRows(displayItems)
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Solicitações')
    XLSX.writeFile(wb, `solicitacoes_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(13)
    doc.text('Solicitações de Manutenção', 14, 14)
    doc.setFontSize(8)
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 20)
    const rows = exportRows(displayItems)
    const headers = Object.keys(rows[0] || {})
    autoTable(doc, {
      startY: 24,
      head: [headers],
      body: rows.map(r => headers.map(h => r[h])),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [30, 80, 180], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 244, 255] },
    })
    doc.save(`solicitacoes_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  const counts = { total: items.length, abertas: items.filter(x => x.status === 'Aberta').length, urgentes: items.filter(x => x.prioridade === 'Crítico' && x.status === 'Aberta').length }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">

      {/* ── CABEÇALHO ── */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-lg shadow px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <ClipboardList className="w-6 h-6 text-blue-200" />
          <div>
            <h1 className="text-white font-bold text-base leading-tight">Solicitações de Manutenção</h1>
            <p className="text-blue-200 text-xs">Registre e acompanhe as demandas da frota</p>
          </div>
        </div>
        {/* Legenda de prioridades */}
        <div className="flex items-center gap-3 flex-1 justify-center">
          <span className="text-blue-300 text-[10px] font-semibold uppercase tracking-wide shrink-0">Prioridade:</span>
          {[
            { color: '#ef4444', label: 'Crítico', desc: 'Parado / Risco operacional' },
            { color: '#f97316', label: 'Alta',    desc: 'Impacto significativo' },
            { color: '#eab308', label: 'Média',   desc: 'Atenção necessária' },
            { color: '#22c55e', label: 'Baixa',   desc: 'Sem urgência' },
          ].map(({ color, label, desc }) => (
            <span key={label} className="flex items-center gap-1">
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
              <span style={{ color }} className="text-[11px] font-bold">{label}</span>
              <span className="text-blue-300 text-[10px]">— {desc}</span>
            </span>
          ))}
        </div>
        <div className="flex gap-3 text-xs shrink-0">
          <div className="bg-blue-700 rounded px-3 py-1.5 text-center">
            <div className="text-white font-bold text-lg leading-none">{counts.total}</div>
            <div className="text-blue-300">Total</div>
          </div>
          <div className="bg-blue-700 rounded px-3 py-1.5 text-center">
            <div className="text-yellow-300 font-bold text-lg leading-none">{counts.abertas}</div>
            <div className="text-blue-300">Abertas</div>
          </div>
          <div className="bg-blue-700 rounded px-3 py-1.5 text-center">
            <div className="text-red-300 font-bold text-lg leading-none">{counts.urgentes}</div>
            <div className="text-blue-300">Críticos</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ── FORMULÁRIO ── */}
      <div className="rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowForm(f => !f)}
          className="w-full bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-2.5 flex items-center justify-between text-white"
        >
          <span className="flex items-center gap-2 font-bold text-sm">
            <Plus className="w-4 h-4" /> Nova Solicitação
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showForm ? 'rotate-180' : ''}`} />
        </button>

        {showForm && (
          <form onSubmit={handleSave} className="p-4 bg-white dark:bg-gray-800 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">
                  Veículo / Ativo <span className="text-red-500">*</span>
                  <span className="ml-2 inline-flex rounded overflow-hidden border border-gray-300 dark:border-gray-600 align-middle">
                    <button type="button"
                      onClick={() => { setFormTipoEntidade('veiculo'); setForm(f => ({ ...f, ativo_id: '' })) }}
                      className={`px-2 py-0 text-[10px] font-semibold transition-colors leading-5 ${formTipoEntidade === 'veiculo' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                      Veículo
                    </button>
                    <button type="button"
                      onClick={() => { setFormTipoEntidade('ativo'); setForm(f => ({ ...f, veiculo_id: '' })) }}
                      className={`px-2 py-0 text-[10px] font-semibold transition-colors leading-5 ${formTipoEntidade === 'ativo' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                      Ativo
                    </button>
                  </span>
                </label>
                {formTipoEntidade === 'veiculo' ? (
                  <select className={sel} value={form.veiculo_id} onChange={setF('veiculo_id')}>
                    <option value="">— Selecione —</option>
                    {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} — {v.descricao}</option>)}
                  </select>
                ) : (
                  <select className={sel} value={form.ativo_id} onChange={setF('ativo_id')}>
                    <option value="">— Selecione —</option>
                    {ativos.map(a => <option key={a.id} value={a.id}>{a.nome}{a.tipo ? ` — ${a.tipo}` : ''}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Solicitante</label>
                <input className={inp} placeholder="Nome do solicitante" value={form.solicitante} onChange={setF('solicitante')} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Parte do Veículo</label>
                <select className={sel} value={form.parte_veiculo} onChange={setF('parte_veiculo')}>
                  <option value="">— Selecione —</option>
                  {partes.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">
                  Prioridade
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${priorBadge[form.prioridade]}`}>{form.prioridade}</span>
                </label>
                <select className={sel} value={form.prioridade} onChange={setF('prioridade')}>
                  {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Data da Solicitação</label>
                <input type="date" className={inp} value={form.dt_solicitacao} onChange={setF('dt_solicitacao')} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Descrição do Problema / Serviço Solicitado <span className="text-red-500">*</span></label>
                <textarea className={`${inp} resize-none`} rows={3} placeholder="Descreva o problema ou serviço necessário..." value={form.descricao} onChange={setF('descricao')} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Observações</label>
                <textarea className={`${inp} resize-none`} rows={3} placeholder="Observações adicionais..." value={form.observacao} onChange={setF('observacao')} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Imagens</label>
              <div
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50 hover:border-blue-400 transition-colors cursor-pointer min-h-[72px]"
                onPaste={e => addImages(Array.from(e.clipboardData.items).filter(i => i.type.startsWith('image/')).map(i => i.getAsFile()), setFormImages)}
                onClick={() => fileInputRef.current?.click()}
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => { addImages(e.target.files, setFormImages); e.target.value = '' }}
                />
                {formImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-500 py-2">
                    <ImagePlus className="w-5 h-5" />
                    <span className="text-xs">Cole (Ctrl+V) ou clique para adicionar imagens</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formImages.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img} alt="" className="h-16 w-16 object-cover rounded border border-gray-200" />
                        <button type="button" onClick={e => { e.stopPropagation(); setFormImages(imgs => imgs.filter((_, j) => j !== i)) }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                    <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 hover:border-blue-400">
                      <ImagePlus className="w-5 h-5" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={saving}
                className="px-5 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-colors">
                <Plus className="w-3.5 h-3.5" />
                {saving ? 'Salvando...' : 'Registrar Solicitação'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── RESUMO POR VEÍCULO / ATIVO ── */}
      {items.length > 0 && (() => {
        const byEntidade = {}
        items.forEach(s => {
          const key = s.veiculo?.placa || s.ativo?.nome || '—'
          const desc = s.veiculo?.descricao || s.ativo?.tipo || ''
          const isAtivo = !s.veiculo && !!s.ativo
          if (!byEntidade[key]) byEntidade[key] = { key, desc, isAtivo, total: 0, abertas: 0, criticos: 0, altaPrior: '' }
          byEntidade[key].total++
          if (['Aberta', 'Em Análise'].includes(s.status)) byEntidade[key].abertas++
          if (s.prioridade === 'Crítico' && ['Aberta', 'Em Análise'].includes(s.status)) byEntidade[key].criticos++
          const order = { Crítico: 0, Alta: 1, Média: 2, Baixa: 3 }
          if (!byEntidade[key].altaPrior || (order[s.prioridade] ?? 99) < (order[byEntidade[key].altaPrior] ?? 99))
            byEntidade[key].altaPrior = s.prioridade
        })
        const grupos = Object.values(byEntidade).filter(g => g.abertas > 0).sort((a, b) => {
          if (a.isAtivo !== b.isAtivo) return a.isAtivo ? -1 : 1
          return a.key.localeCompare(b.key)
        })
        const priorColor = { Crítico: 'bg-red-500', Alta: 'bg-orange-400', Média: 'bg-yellow-400', Baixa: 'bg-green-400' }
        if (!grupos.length) return null
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/40 px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Resumo de Solicitações Abertas</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{grupos.length} item(s) com solicitações em aberto</span>
                <button onClick={() => setShowResumo(v => !v)}
                  className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 font-medium">
                  {showResumo ? 'Ocultar ▲' : 'Mostrar ▼'}
                </button>
              </div>
            </div>
            {showResumo && <div className="flex overflow-x-auto gap-2 p-3">
              {grupos.map(g => (
                <div key={g.key}
                  onClick={() => { setFilterEntidade(g.key); setFilterStatus('Aberta') }}
                  className={`flex-shrink-0 w-40 border rounded-lg p-2.5 cursor-pointer hover:shadow-md transition-all ${g.isAtivo ? 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 hover:border-purple-400' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`font-bold text-xs truncate ${g.isAtivo ? 'text-purple-700 dark:text-purple-300' : 'text-blue-700 dark:text-blue-300'}`}>{g.key}</span>
                    {g.altaPrior && <span className={`w-2 h-2 flex-shrink-0 rounded-full ${priorColor[g.altaPrior] || 'bg-gray-300'}`} title={g.altaPrior} />}
                  </div>
                  {g.desc && <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mb-1.5">{g.desc}</p>}
                  <div className="flex gap-1 text-[10px]">
                    <span className="flex-1 text-center bg-gray-200 dark:bg-gray-600 rounded py-0.5">
                      <span className="block font-bold text-gray-700 dark:text-gray-200">{g.total}</span>
                      <span className="text-gray-500 dark:text-gray-400">Total</span>
                    </span>
                    <span className="flex-1 text-center bg-orange-100 dark:bg-orange-900/30 rounded py-0.5">
                      <span className={`block font-bold ${g.abertas > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400'}`}>{g.abertas}</span>
                      <span className="text-gray-500 dark:text-gray-400">Abertas</span>
                    </span>
                    {g.criticos > 0 && (
                      <span className="flex-1 text-center bg-red-100 dark:bg-red-900/30 rounded py-0.5">
                        <span className="block font-bold text-red-600 dark:text-red-400">{g.criticos}</span>
                        <span className="text-gray-500 dark:text-gray-400">Crítico</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>}
          </div>
        )
      })()}

      {/* ── FILTROS ── */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-2.5 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5 flex-1 min-w-40">
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <input className="flex-1 text-xs outline-none bg-transparent dark:text-gray-100 dark:placeholder-gray-400" placeholder="Buscar por descrição, solicitante ou placa..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100" value={filterPrior} onChange={e => setFilterPrior(e.target.value)}>
          <option value="">Todas as prioridades</option>
          {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
        </select>
        {filterMes && (
          <span className="flex items-center gap-1 text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
            {filterMes}
            <button onClick={() => setFilterMes('')} className="hover:text-red-500"><X className="w-3 h-3" /></button>
          </span>
        )}
        {filterEntidade && (
          <span className="flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
            {filterEntidade}
            <button onClick={() => setFilterEntidade('')} className="hover:text-red-500"><X className="w-3 h-3" /></button>
          </span>
        )}
        {(filterStatus || filterPrior || search || filterMes || filterEntidade) && (
          <button onClick={() => { setFilterStatus(''); setFilterPrior(''); setSearch(''); setFilterMes(''); setFilterEntidade('') }}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-gray-400 dark:text-gray-500">{filtered.length} registro(s)</span>
          <button onClick={exportExcel} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold transition-colors" title="Exportar Excel">
            <FileSpreadsheet className="w-3 h-3" /> Excel
          </button>
          <button onClick={exportPdf} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-red-600 hover:bg-red-700 text-white rounded font-bold transition-colors" title="Exportar PDF">
            <FileText className="w-3 h-3" /> PDF
          </button>
        </div>
      </div>

      {/* ── LISTA ── */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <div className="min-w-[920px]">
        {/* Cabeçalho */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/40 px-3 py-2 flex items-center gap-2 text-xs font-semibold text-blue-800 dark:text-blue-300 select-none">
          <span className="w-8 flex-shrink-0 cursor-pointer hover:text-blue-600" onClick={() => handleSort('id')}><span className="flex items-center gap-0.5"># <SortIcon field="id" sortField={sortField} sortDir={sortDir} /></span></span>
          <span className="w-24 flex-shrink-0 cursor-pointer hover:text-blue-600" onClick={() => handleSort('veiculo_id')}><span className="flex items-center gap-0.5">Veículo <SortIcon field="veiculo_id" sortField={sortField} sortDir={sortDir} /></span></span>
          <span className="w-32 flex-shrink-0 cursor-pointer hover:text-blue-600" onClick={() => handleSort('solicitante')}><span className="flex items-center gap-0.5">Solicitante <SortIcon field="solicitante" sortField={sortField} sortDir={sortDir} /></span></span>
          <span className="flex-1 min-w-0 cursor-pointer hover:text-blue-600" onClick={() => handleSort('descricao')}><span className="flex items-center gap-0.5">Descrição <SortIcon field="descricao" sortField={sortField} sortDir={sortDir} /></span></span>
          <span className="w-24 flex-shrink-0 cursor-pointer hover:text-blue-600" onClick={() => handleSort('parte_veiculo')}><span className="flex items-center gap-0.5">Parte <SortIcon field="parte_veiculo" sortField={sortField} sortDir={sortDir} /></span></span>
          <span className="w-20 flex-shrink-0 cursor-pointer hover:text-blue-600" onClick={() => handleSort('prioridade')}><span className="flex items-center gap-0.5">Prioridade <SortIcon field="prioridade" sortField={sortField} sortDir={sortDir} /></span></span>
          <span className="w-24 flex-shrink-0 text-center cursor-pointer hover:text-blue-600" onClick={() => handleSort('dt_solicitacao')}><span className="flex items-center justify-center gap-0.5">Dias em Aberto <SortIcon field="dt_solicitacao" sortField={sortField} sortDir={sortDir} /></span></span>
          <span className="w-24 flex-shrink-0 cursor-pointer hover:text-blue-600" onClick={() => handleSort('status')}><span className="flex items-center gap-0.5">Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} /></span></span>
          <span className="w-40 flex-shrink-0">Ação / Prazo</span>
          <span className="w-24 flex-shrink-0 text-center">Ações</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
            Nenhuma solicitação encontrada.
          </div>
        ) : displayItems.map((s, idx) => (
          <div key={s.id} className={`border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
            s.prioridade === 'Crítico' ? 'border-l-4 border-l-red-500' :
            s.prioridade === 'Alta'    ? 'border-l-4 border-l-orange-400' :
            s.prioridade === 'Média'   ? 'border-l-4 border-l-yellow-400' :
                                         'border-l-4 border-l-green-400'
          } ${idx % 2 === 1 ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800'}`}>
            {editingId === s.id ? (
              /* ── MODO EDIÇÃO ── */
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 space-y-3">
                {/* Linha 1: Veículo/Ativo | Solicitante | Prioridade | Data | Status | Parte do Veículo */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 items-end">
                  <div>
                    <div className="h-6 flex items-center gap-1 mb-1">
                      <label className="text-xs font-semibold text-blue-800 dark:text-blue-300">Veículo / Ativo</label>
                      <div className="ml-1 flex rounded overflow-hidden border border-gray-300 dark:border-gray-600 text-[10px]">
                        <button type="button"
                          onClick={() => { setEditTipoEntidade('veiculo'); setEditForm(f => ({ ...f, ativo_id: '' })) }}
                          className={`px-2 py-0.5 font-semibold transition-colors ${editTipoEntidade === 'veiculo' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                          Veículo
                        </button>
                        <button type="button"
                          onClick={() => { setEditTipoEntidade('ativo'); setEditForm(f => ({ ...f, veiculo_id: '' })) }}
                          className={`px-2 py-0.5 font-semibold transition-colors ${editTipoEntidade === 'ativo' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                          Ativo
                        </button>
                      </div>
                    </div>
                    {editTipoEntidade === 'veiculo' ? (
                      <select className={sel} value={editForm.veiculo_id} onChange={setEf('veiculo_id')}>
                        <option value="">— Selecione —</option>
                        {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} — {v.descricao}</option>)}
                      </select>
                    ) : (
                      <select className={sel} value={editForm.ativo_id} onChange={setEf('ativo_id')}>
                        <option value="">— Selecione —</option>
                        {ativos.map(a => <option key={a.id} value={a.id}>{a.nome}{a.tipo ? ` — ${a.tipo}` : ''}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Solicitante</label>
                    <input className={inp} value={editForm.solicitante} onChange={setEf('solicitante')} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Prioridade</label>
                    <select className={sel} value={editForm.prioridade} onChange={setEf('prioridade')}>
                      {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Data da Solicitação</label>
                    <input type="date" className={inp} value={editForm.dt_solicitacao || ''} onChange={setEf('dt_solicitacao')} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Status</label>
                    <select className={sel} value={editForm.status} onChange={setEf('status')}>
                      {STATUS_LIST.map(st => <option key={st}>{st}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Parte do Veículo</label>
                    <select className={sel} value={editForm.parte_veiculo} onChange={setEf('parte_veiculo')}>
                      <option value="">— Selecione —</option>
                      {partes.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                    </select>
                  </div>
                </div>
                {/* Linha 2: Descrição | Observação */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Descrição</label>
                    <textarea className={`${inp} resize-none`} rows={2} value={editForm.descricao} onChange={setEf('descricao')} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Observação</label>
                    <textarea className={`${inp} resize-none`} rows={2} value={editForm.observacao} onChange={setEf('observacao')} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Imagens</label>
                  <div
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-700/50 hover:border-blue-400 transition-colors cursor-pointer min-h-[60px]"
                    onPaste={e => { const items = Array.from(e.clipboardData.items); items.forEach(item => { if (item.type.startsWith('image/')) { const file = item.getAsFile(); const reader = new FileReader(); reader.onload = ev => setEditImages(imgs => [...imgs, ev.target.result]); reader.readAsDataURL(file) } }) }}
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    <input ref={editFileInputRef} type="file" accept="image/*" multiple className="hidden"
                      onChange={e => { addImages(e.target.files, setEditImages); e.target.value = '' }} />
                    {editImages.length === 0 ? (
                      <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-xs">
                        <ImagePlus className="w-4 h-4" /> Cole (Ctrl+V) ou clique para adicionar imagens
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {editImages.map((img, i) => (
                          <div key={i} className="relative group">
                            <img src={img} alt="" className="h-16 w-16 object-cover rounded border border-gray-200 cursor-pointer"
                              onClick={e => { e.stopPropagation(); setLightbox({ images: editImages, idx: i }) }} />
                            <button type="button" onClick={e => { e.stopPropagation(); setEditImages(imgs => imgs.filter((_, j) => j !== i)) }}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                        <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 hover:border-blue-400">
                          <ImagePlus className="w-5 h-5" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={cancelEdit} className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">Cancelar</button>
                  <button type="button" onClick={() => handleSaveEdit(s.id)} className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Salvar
                  </button>
                </div>
              </div>
            ) : (
              /* ── MODO LEITURA ── */
              <div className="px-3 py-2 flex items-center gap-2 min-w-0">
                <span className="w-8 flex-shrink-0 text-xs text-gray-400 dark:text-gray-500 font-medium">#{s.id}</span>
                <span className="w-24 flex-shrink-0">
                  {s.veiculo ? (
                    <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
                      <Car className="w-3 h-3" /> {s.veiculo.placa}
                    </span>
                  ) : s.ativo ? (
                    <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium whitespace-nowrap">
                      <Package className="w-3 h-3" /> {s.ativo.nome}
                    </span>
                  ) : <span className="text-xs text-gray-300 dark:text-gray-600">—</span>}
                </span>
                <span className="w-32 flex-shrink-0 text-xs text-gray-700 dark:text-gray-300 truncate">{s.solicitante}</span>
                <span className="flex-1 min-w-0 text-xs font-medium text-gray-800 dark:text-gray-200 break-words">
                  {s.descricao}
                </span>
                <span className="w-24 flex-shrink-0 text-xs text-gray-600 dark:text-gray-400 truncate" title={s.parte_veiculo}>{s.parte_veiculo || '—'}</span>
                <span className={`w-20 flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${priorBadge[s.prioridade]}`}>
                  {s.prioridade === 'Crítico' && <AlertTriangle className="w-3 h-3" />}
                  {s.prioridade}
                </span>
                <span className="w-24 flex-shrink-0 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {(() => { const d = diasAberto(s.dt_solicitacao); return d === null ? '-' : `${d} dia${d !== 1 ? 's' : ''}` })()}
                </span>
                <span className={`w-24 flex-shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadge[s.status] || ''}`}>{s.status}</span>
                {/* Ação / Prazo */}
                <div className="w-48 flex-shrink-0">
                  {s.acao ? (
                    <button onClick={() => setAcaoModal(s)} className="group text-left w-full">
                      <div className="text-xs text-gray-700 dark:text-gray-200 leading-snug break-words">{s.acao}</div>
                      {s.prazo_acao && (() => {
                        const dias = Math.floor((new Date(s.prazo_acao) - new Date()) / 86400000)
                        return (
                          <div className={`text-[10px] font-semibold mt-0.5 flex items-center gap-1 ${dias < 0 ? 'text-red-500' : dias <= 7 ? 'text-orange-500' : 'text-green-600'}`}>
                            <CalendarClock className="w-3 h-3" />
                            {dias < 0 ? `${Math.abs(dias)}d vencido` : fmtDateBR(s.prazo_acao)}
                          </div>
                        )
                      })()}
                      <Pencil className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 mt-0.5" />
                    </button>
                  ) : (
                    <button onClick={() => setAcaoModal(s)}
                      className="flex items-center gap-1 text-gray-400 hover:text-blue-500 text-xs transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Registrar
                    </button>
                  )}
                </div>
                <div className="w-24 flex-shrink-0 flex items-center justify-center gap-1">
                  {s.manutencao_id ? (
                    <Link to={`/manutencoes/${s.manutencao_id}/editar`}
                      title={`Manutenção #${s.manutencao_id}`}
                      className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors">
                      <Wrench className="w-3.5 h-3.5" />
                    </Link>
                  ) : <span className="w-6" />}
                  <div className="w-6 flex items-center justify-center flex-shrink-0">
                    {s.imagens && JSON.parse(s.imagens).length > 0 ? (
                      <button onClick={() => setLightbox({ images: JSON.parse(s.imagens), idx: 0 })}
                        title={`${JSON.parse(s.imagens).length} anexo(s)`}
                        className="relative p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold leading-none">
                          {JSON.parse(s.imagens).length}
                        </span>
                      </button>
                    ) : <span className="w-6" />}
                  </div>
                  <button onClick={() => startEdit(s)} title="Editar"
                    className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(s.id)} title="Excluir"
                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        </div>{/* min-w */}
        </div>{/* overflow-x-auto */}
      </div>

      {acaoModal && (
        <AcaoModal sol={acaoModal} onClose={() => setAcaoModal(null)} onSaved={handleAcaoSaved} />
      )}

      {/* ── LIGHTBOX ── */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-gray-300" onClick={() => setLightbox(null)}>
            <X className="w-6 h-6" />
          </button>
          <button className="absolute left-4 text-white hover:text-gray-300 disabled:opacity-30"
            disabled={lightbox.idx === 0}
            onClick={e => { e.stopPropagation(); setLightbox(lb => ({ ...lb, idx: lb.idx - 1 })) }}>
            <ChevronLeft className="w-8 h-8" />
          </button>
          <img src={lightbox.images[lightbox.idx]} alt="" className="max-h-[85vh] max-w-[85vw] rounded shadow-2xl object-contain" onClick={e => e.stopPropagation()} />
          <button className="absolute right-4 text-white hover:text-gray-300 disabled:opacity-30"
            disabled={lightbox.idx === lightbox.images.length - 1}
            onClick={e => { e.stopPropagation(); setLightbox(lb => ({ ...lb, idx: lb.idx + 1 })) }}>
            <ChevronRight className="w-8 h-8" />
          </button>
          <div className="absolute bottom-4 text-white text-sm">{lightbox.idx + 1} / {lightbox.images.length}</div>
        </div>
      )}
    </div>
  )
}
