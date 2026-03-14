import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  ClipboardList, Plus, Trash2, Pencil, Check, X,
  AlertTriangle, ChevronDown, Search, Car, Wrench, ImagePlus, Paperclip, ChevronLeft, ChevronRight,
} from 'lucide-react'

const API = 'http://localhost:8000/api'

const PRIORIDADES = ['Urgente', 'Alta', 'Média', 'Baixa']
const STATUS_LIST = ['Aberta', 'Em Análise', 'Finalizada', 'Rejeitada']

const priorBadge = {
  Urgente: 'bg-red-600 text-white',
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

const priorOrder = { Urgente: 0, Alta: 1, Média: 2, Baixa: 3 }

const emptyForm = {
  veiculo_id: '',
  solicitante: '',
  descricao: '',
  prioridade: 'Média',
  status: 'Aberta',
  observacao: '',
}

const inp = 'border border-gray-300 rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:border-blue-400 bg-white'
const sel = 'border border-gray-300 rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:border-blue-400 bg-white'

function fmtDate(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Solicitacoes() {
  const [items, setItems] = useState([])
  const [veiculos, setVeiculos] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPrior, setFilterPrior] = useState('')
  const [filterVeiculo, setFilterVeiculo] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formImages, setFormImages] = useState([])
  const fileInputRef = useRef()
  const editFileInputRef = useRef()
  const [editImages, setEditImages] = useState([])
  const [lightbox, setLightbox] = useState(null) // { images: [], idx: 0 }

  useEffect(() => {
    load()
    axios.get(`${API}/veiculos`).then(r => setVeiculos(r.data)).catch(() => {})
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
    if (!form.solicitante.trim() || !form.descricao.trim()) {
      setError('Solicitante e Descrição são obrigatórios'); return
    }
    setSaving(true); setError('')
    try {
      const payload = { ...form, veiculo_id: form.veiculo_id ? Number(form.veiculo_id) : null, imagens: formImages.length ? JSON.stringify(formImages) : null }
      const r = await axios.post(`${API}/solicitacoes`, payload)
      setItems(prev => [r.data, ...prev])
      setForm(emptyForm)
      setFormImages([])
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const startEdit = (s) => {
    setEditingId(s.id)
    setEditForm({
      veiculo_id: s.veiculo_id || '',
      solicitante: s.solicitante || '',
      descricao: s.descricao || '',
      prioridade: s.prioridade || 'Média',
      status: s.status || 'Aberta',
      observacao: s.observacao || '',
    })
    setEditImages(s.imagens ? JSON.parse(s.imagens) : [])
  }

  const cancelEdit = () => { setEditingId(null); setEditForm({}); setEditImages([]) }

  const handleSaveEdit = async (id) => {
    try {
      const payload = { ...editForm, veiculo_id: editForm.veiculo_id ? Number(editForm.veiculo_id) : null, imagens: editImages.length ? JSON.stringify(editImages) : null }
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

  const handleStatusChange = async (id, newStatus) => {
    try {
      const r = await axios.put(`${API}/solicitacoes/${id}`, { status: newStatus })
      setItems(prev => prev.map(x => x.id === id ? r.data : x))
    } catch { setError('Erro ao atualizar status') }
  }

  const filtered = items
    .filter(s => !filterStatus || s.status === filterStatus)
    .filter(s => !filterPrior || s.prioridade === filterPrior)
    .filter(s => !filterVeiculo || String(s.veiculo_id) === filterVeiculo)
    .filter(s => !search || s.descricao.toLowerCase().includes(search.toLowerCase()) || s.solicitante.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (priorOrder[a.prioridade] ?? 9) - (priorOrder[b.prioridade] ?? 9))

  const counts = { total: items.length, abertas: items.filter(x => x.status === 'Aberta').length, urgentes: items.filter(x => x.prioridade === 'Urgente' && x.status === 'Aberta').length }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">

      {/* ── CABEÇALHO ── */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-lg shadow px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-blue-200" />
          <div>
            <h1 className="text-white font-bold text-base leading-tight">Solicitações de Manutenção</h1>
            <p className="text-blue-200 text-xs">Registre e acompanhe as demandas da frota</p>
          </div>
        </div>
        <div className="flex gap-3 text-xs">
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
            <div className="text-blue-300">Urgentes</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ── FORMULÁRIO ── */}
      <div className="rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
          <form onSubmit={handleSave} className="p-4 bg-white space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-blue-800 mb-1">Solicitante <span className="text-red-500">*</span></label>
                <input className={inp} placeholder="Nome do solicitante" value={form.solicitante} onChange={setF('solicitante')} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-800 mb-1">Veículo</label>
                <select className={sel} value={form.veiculo_id} onChange={setF('veiculo_id')}>
                  <option value="">— Selecione —</option>
                  {veiculos.map(v => (
                    <option key={v.id} value={v.id}>{v.placa} — {v.descricao}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-800 mb-1">Prioridade</label>
                <select className={sel} value={form.prioridade} onChange={setF('prioridade')}>
                  {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
                </select>
                <div className="mt-1">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${priorBadge[form.prioridade]}`}>{form.prioridade}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-800 mb-1">Descrição do Problema / Serviço Solicitado <span className="text-red-500">*</span></label>
              <textarea className={`${inp} resize-none`} rows={3} placeholder="Descreva o problema ou serviço necessário..." value={form.descricao} onChange={setF('descricao')} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-blue-800 mb-1">Imagens</label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-3 bg-gray-50 hover:border-blue-400 transition-colors cursor-pointer min-h-[72px]"
                onPaste={e => addImages(Array.from(e.clipboardData.items).filter(i => i.type.startsWith('image/')).map(i => i.getAsFile()), setFormImages)}
                onClick={() => fileInputRef.current?.click()}
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
              >
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => { addImages(e.target.files, setFormImages); e.target.value = '' }}
                />
                {formImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-1 text-gray-400 py-2">
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

      {/* ── FILTROS ── */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-2.5 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5 flex-1 min-w-40">
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <input className="flex-1 text-xs outline-none" placeholder="Buscar por descrição ou solicitante..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none" value={filterVeiculo} onChange={e => setFilterVeiculo(e.target.value)}>
          <option value="">Todos os veículos</option>
          {veiculos.map(v => <option key={v.id} value={String(v.id)}>{v.placa}</option>)}
        </select>
        <select className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none" value={filterPrior} onChange={e => setFilterPrior(e.target.value)}>
          <option value="">Todas as prioridades</option>
          {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
        </select>
        {(filterStatus || filterPrior || filterVeiculo || search) && (
          <button onClick={() => { setFilterStatus(''); setFilterPrior(''); setFilterVeiculo(''); setSearch('') }}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} registro(s)</span>
      </div>

      {/* ── LISTA ── */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {/* Cabeçalho */}
        <div className="bg-blue-50 border-b border-blue-100 px-3 py-2 flex items-center gap-2 text-xs font-semibold text-blue-800 select-none">
          <span className="w-8 flex-shrink-0">#</span>
          <span className="w-24 flex-shrink-0">Veículo</span>
          <span className="w-32 flex-shrink-0">Solicitante</span>
          <span className="flex-1 min-w-0">Descrição</span>
          <span className="w-20 flex-shrink-0">Prioridade</span>
          <span className="w-24 flex-shrink-0 text-center">Dias em Aberto</span>
          <span className="w-24 flex-shrink-0">Status</span>
          <span className="w-24 flex-shrink-0">Manutenção</span>
          <span className="w-10 flex-shrink-0 text-center">Anexo</span>
          <span className="w-16 flex-shrink-0 text-center">Ações</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Nenhuma solicitação encontrada.
          </div>
        ) : filtered.map((s, idx) => (
          <div key={s.id} className={`border-b border-gray-100 last:border-b-0 ${
            s.prioridade === 'Urgente' ? 'border-l-4 border-l-red-500' :
            s.prioridade === 'Alta'    ? 'border-l-4 border-l-orange-400' :
            s.prioridade === 'Média'   ? 'border-l-4 border-l-yellow-400' :
                                         'border-l-4 border-l-green-400'
          } ${idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
            {editingId === s.id ? (
              /* ── MODO EDIÇÃO ── */
              <div className="p-4 bg-blue-50 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">Solicitante</label>
                    <input className={inp} value={editForm.solicitante} onChange={setEf('solicitante')} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">Veículo</label>
                    <select className={sel} value={editForm.veiculo_id} onChange={setEf('veiculo_id')}>
                      <option value="">— Selecione —</option>
                      {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} — {v.descricao}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">Prioridade</label>
                    <select className={sel} value={editForm.prioridade} onChange={setEf('prioridade')}>
                      {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">Status</label>
                    <select className={sel} value={editForm.status} onChange={setEf('status')}>
                      {STATUS_LIST.map(st => <option key={st}>{st}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-blue-800 mb-1">Observação</label>
                    <input className={inp} value={editForm.observacao} onChange={setEf('observacao')} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1">Descrição</label>
                  <textarea className={`${inp} resize-none`} rows={2} value={editForm.descricao} onChange={setEf('descricao')} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-800 mb-1">Imagens</label>
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-3 bg-white hover:border-blue-400 transition-colors cursor-pointer min-h-[60px]"
                    onPaste={e => { const items = Array.from(e.clipboardData.items); items.forEach(item => { if (item.type.startsWith('image/')) { const file = item.getAsFile(); const reader = new FileReader(); reader.onload = ev => setEditImages(imgs => [...imgs, ev.target.result]); reader.readAsDataURL(file) } }) }}
                    onClick={() => editFileInputRef.current?.click()}
                  >
                    <input ref={editFileInputRef} type="file" accept="image/*" multiple className="hidden"
                      onChange={e => { addImages(e.target.files, setEditImages); e.target.value = '' }} />
                    {editImages.length === 0 ? (
                      <div className="flex items-center gap-2 text-gray-400 text-xs">
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
                  <button type="button" onClick={cancelEdit} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 font-medium">Cancelar</button>
                  <button type="button" onClick={() => handleSaveEdit(s.id)} className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Salvar
                  </button>
                </div>
              </div>
            ) : (
              /* ── MODO LEITURA ── */
              <div className="px-3 py-2 flex items-center gap-2 min-w-0">
                <span className="w-8 flex-shrink-0 text-xs text-gray-400 font-medium">#{s.id}</span>
                <span className="w-24 flex-shrink-0">
                  {s.veiculo ? (
                    <span className="flex items-center gap-1 text-xs text-blue-600 font-medium whitespace-nowrap">
                      <Car className="w-3 h-3" /> {s.veiculo.placa}
                    </span>
                  ) : <span className="text-xs text-gray-300">—</span>}
                </span>
                <span className="w-32 flex-shrink-0 text-xs text-gray-700 truncate">{s.solicitante}</span>
                <span className="flex-1 min-w-0 text-xs font-medium text-gray-800 truncate">{s.descricao}</span>
                <span className={`w-20 flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${priorBadge[s.prioridade]}`}>
                  {s.prioridade === 'Urgente' && <AlertTriangle className="w-3 h-3" />}
                  {s.prioridade}
                </span>
                <span className="w-24 flex-shrink-0 text-center text-xs font-semibold text-gray-600">
                  {Math.floor((Date.now() - new Date(s.dt_solicitacao)) / 86400000)} dias
                </span>
                <span className={`w-24 flex-shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${statusBadge[s.status] || ''}`}>{s.status}</span>
                <span className="w-24 flex-shrink-0">
                  {s.manutencao_id ? (
                    <Link to={`/manutencoes/${s.manutencao_id}/editar`}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap">
                      <Wrench className="w-3 h-3" /> #{s.manutencao_id}
                    </Link>
                  ) : <span className="text-xs text-gray-300">—</span>}
                </span>
                <div className="w-10 flex-shrink-0 flex items-center justify-center">
                  {s.imagens && JSON.parse(s.imagens).length > 0 ? (
                    <button onClick={() => setLightbox({ images: JSON.parse(s.imagens), idx: 0 })}
                      title={`${JSON.parse(s.imagens).length} anexo(s)`}
                      className="relative p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors">
                      <Paperclip className="w-3.5 h-3.5" />
                      <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold leading-none">
                        {JSON.parse(s.imagens).length}
                      </span>
                    </button>
                  ) : <span className="text-gray-300 text-xs">—</span>}
                </div>
                <div className="w-16 flex-shrink-0 flex items-center justify-center gap-1">
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
      </div>

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
