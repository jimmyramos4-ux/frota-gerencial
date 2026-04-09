import React, { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import {
  Plus, Pencil, Trash2, RefreshCw, Search, X, Save, Loader2,
  Users, AlertCircle, CheckCircle, ArrowUp, ArrowDown, ArrowUpDown,
  Paperclip, Upload, FileText, FileSpreadsheet,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />
  return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
}

const API = 'http://localhost:8000/api'

const CATEGORIAS_CNH = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE']
const TIPOS_MOTORISTA = ['Administrativo', 'Comercial', 'Varejo', 'Outro']

const emptyForm = {
  nome: '', tipo: '', cpf: '', dt_nascimento: '', nr_registro_cnh: '',
  validade_cnh: '', categoria_cnh: '', telefone: '', email: '', cidade_emissao_cnh: '',
  dt_exame_toxicologico: '', ativo: true,
}

function calcAge(dt) {
  if (!dt) return null
  const birth = new Date(dt)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

const inp = 'border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-700 dark:text-gray-100'
const sel = 'border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-700 dark:text-gray-100'
const lbl = 'block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1'

function fmt(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('pt-BR')
}

function fmtCNHValidade(val) {
  if (!val) return '-'
  // val = "YYYY-MM-DD" or "DD/MM/YYYY"
  if (val.includes('-')) {
    const [y, m, d] = val.split('-')
    return `${d}/${m}/${y}`
  }
  return val
}

function MotoristaModal({ motorista, onClose, onSaved }) {
  const isEdit = Boolean(motorista?.id)
  const [form, setForm] = useState(
    motorista ? {
      nome: motorista.nome || '',
      tipo: motorista.tipo || '',
      ativo: motorista.ativo ?? true,
      cpf: motorista.cpf || '',
      email: motorista.email || '',
      dt_nascimento: motorista.dt_nascimento || '',
      nr_registro_cnh: motorista.nr_registro_cnh || '',
      validade_cnh: motorista.validade_cnh || '',
      categoria_cnh: motorista.categoria_cnh || '',
      telefone: motorista.telefone || '',
      cidade_emissao_cnh: motorista.cidade_emissao_cnh || '',
      dt_exame_toxicologico: motorista.dt_exame_toxicologico || '',
    } : emptyForm
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [arquivos, setArquivos] = useState([])
  const [pendingFiles, setPendingFiles] = useState([]) // files queued before save
  const [uploading, setUploading] = useState(false)
  const [savedId, setSavedId] = useState(motorista?.id || null)
  const fileInputRef = useRef()

  useEffect(() => {
    if (savedId) {
      axios.get(`${API}/motoristas/${savedId}/arquivos`).then(r => setArquivos(r.data)).catch(() => {})
    }
  }, [savedId])

  // clean up object URLs on unmount
  useEffect(() => {
    return () => { pendingFiles.forEach(pf => URL.revokeObjectURL(pf.url)) }
  }, []) // eslint-disable-line

  const handleUpload = async (file) => {
    if (!file) return
    if (!savedId) {
      // queue for upload after save
      setPendingFiles(prev => [...prev, { file, url: URL.createObjectURL(file), name: file.name }])
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await axios.post(`${API}/motoristas/${savedId}/arquivos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setArquivos(prev => [r.data, ...prev])
    } catch { alert('Erro ao enviar arquivo') }
    finally { setUploading(false) }
  }

  const handleFileInput = (e) => { handleUpload(e.target.files[0]); e.target.value = '' }

  const handleDeleteArquivo = async (id) => {
    if (!window.confirm('Remover este arquivo?')) return
    try {
      await axios.delete(`${API}/motoristas/arquivos/${id}`)
      setArquivos(prev => prev.filter(a => a.id !== id))
    } catch { alert('Erro ao remover arquivo') }
  }

  const handleRemovePending = (idx) => {
    setPendingFiles(prev => {
      URL.revokeObjectURL(prev[idx].url)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const setF = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nome) {
      setError('Nome é obrigatório')
      return
    }
    setSaving(true); setError('')
    try {
      if (isEdit) {
        await axios.put(`${API}/motoristas/${motorista.id}`, form)
        onSaved()
      } else {
        const r = await axios.post(`${API}/motoristas`, form)
        const newId = r.data.id
        // upload pending files
        for (const pf of pendingFiles) {
          const fd = new FormData()
          fd.append('file', pf.file)
          await axios.post(`${API}/motoristas/${newId}/arquivos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        }
        onSaved()
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar motorista')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between bg-blue-700 text-white px-4 py-2 rounded-t">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="font-semibold text-sm">
              {isEdit ? `Editar Motorista #${motorista.id}` : 'Novo Motorista'}
            </span>
          </div>
          <button onClick={onClose} className="hover:text-blue-200"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}

          {/* Linha 1: Nome + Tipo + Status (+ código somente leitura na edição) */}
          <div className={`grid gap-3 ${isEdit ? 'grid-cols-6' : 'grid-cols-4'}`}>
            {isEdit && (
              <div>
                <label className={lbl}>Código</label>
                <div className="border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-xs bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300 font-mono">
                  {motorista.codigo}
                </div>
              </div>
            )}
            <div className={isEdit ? 'col-span-3' : 'col-span-2'}>
              <label className={lbl}>Nome <span className="text-red-500">*</span></label>
              <input className={inp} value={form.nome} onChange={setF('nome')} placeholder="Nome completo" autoFocus />
            </div>
            <div>
              <label className={lbl}>Tipo</label>
              <select className={sel} value={form.tipo} onChange={setF('tipo')}>
                <option value="">— Selecione —</option>
                {TIPOS_MOTORISTA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Status</label>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))}
                className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-semibold border transition-colors ${form.ativo
                  ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400'
                  : 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${form.ativo ? 'bg-green-500' : 'bg-red-500'}`} />
                {form.ativo ? 'Ativo' : 'Demitido'}
              </button>
            </div>
          </div>

          {/* Linha 2: CPF + Nascimento + E-mail + Telefone */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={lbl}>CPF</label>
              <input className={inp} value={form.cpf} onChange={setF('cpf')} placeholder="000.000.000-00" maxLength={14} />
            </div>
            <div>
              <label className={lbl}>Nascimento</label>
              <input type="date" className={inp} value={form.dt_nascimento} onChange={setF('dt_nascimento')} />
            </div>
            <div>
              <label className={lbl}>E-mail</label>
              <input type="email" className={inp} value={form.email} onChange={setF('email')} placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className={lbl}>Telefone</label>
              <input className={inp} value={form.telefone} onChange={setF('telefone')} placeholder="(00) 90000-0000" maxLength={20} />
            </div>
          </div>

          {/* Divisor CNH */}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">CNH</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className={lbl}>Nº Registro CNH</label>
                <input className={inp} value={form.nr_registro_cnh} onChange={setF('nr_registro_cnh')} placeholder="00000000000" maxLength={20} />
              </div>
              <div>
                <label className={lbl}>Categoria</label>
                <select className={sel} value={form.categoria_cnh} onChange={setF('categoria_cnh')}>
                  <option value="">— Selecione —</option>
                  {CATEGORIAS_CNH.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Validade CNH</label>
                <input type="date" className={inp} value={form.validade_cnh} onChange={setF('validade_cnh')} />
              </div>
              <div>
                <label className={lbl}>Cidade de Emissão</label>
                <input className={inp} value={form.cidade_emissao_cnh} onChange={setF('cidade_emissao_cnh')} placeholder="Cidade / UF" />
              </div>
              <div>
                <label className={lbl}>Exame Toxicológico</label>
                <input type="date" className={inp} value={form.dt_exame_toxicologico} onChange={setF('dt_exame_toxicologico')} />
              </div>
            </div>
          </div>

          {/* Seção de documentos */}
          <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
            <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Documentos</label>
            {/* Drop zone — sempre visível */}
            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50 hover:border-blue-400 transition-colors cursor-pointer min-h-[72px]"
              onClick={() => fileInputRef.current?.click()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleUpload(f) }}
              onDragOver={e => e.preventDefault()}
            >
              <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileInput} disabled={uploading} />
              {(() => {
                const allFiles = savedId
                  ? arquivos.map(a => ({ key: `s-${a.id}`, isPdf: a.nome_arquivo.toLowerCase().endsWith('.pdf'), url: `http://localhost:8000/api/uploads/${a.caminho}`, name: a.nome_arquivo, onRemove: () => handleDeleteArquivo(a.id) }))
                  : pendingFiles.map((pf, i) => ({ key: `p-${i}`, isPdf: pf.name.toLowerCase().endsWith('.pdf'), url: pf.url, name: pf.name, onRemove: () => handleRemovePending(i) }))
                if (allFiles.length === 0) return (
                  <div className="flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-500 py-2">
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    <span className="text-xs">{uploading ? 'Enviando...' : 'Clique ou arraste PDF / imagem aqui'}</span>
                  </div>
                )
                return (
                  <div className="flex flex-wrap gap-2">
                    {allFiles.map(f => (
                      <div key={f.key} className="relative group flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        {f.isPdf ? (
                          <a href={f.url} target="_blank" rel="noreferrer" className="h-16 w-16 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 flex flex-col items-center justify-center gap-1 hover:border-blue-400">
                            <FileText className="w-7 h-7 text-red-500" />
                            <span className="text-[9px] text-gray-500 truncate w-14 text-center px-1">{f.name}</span>
                          </a>
                        ) : (
                          <a href={f.url} target="_blank" rel="noreferrer">
                            <img src={f.url} alt={f.name} className="h-16 w-16 object-cover rounded border border-gray-200 dark:border-gray-600 hover:border-blue-400" />
                          </a>
                        )}
                        <button type="button" onClick={f.onRemove}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                    {!uploading && (
                      <div className="h-16 w-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded flex items-center justify-center text-gray-400 hover:border-blue-400">
                        <Upload className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-1 border-t border-gray-100 dark:border-gray-700">
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

export default function ListagemMotoristas() {
  const [motoristas, setMotoristas] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [success, setSuccess] = useState('')
  const [sortField, setSortField] = useState('')
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const fetchMotoristas = useCallback(async () => {
    setLoading(true)
    try {
      const params = search ? { search } : {}
      const res = await axios.get(`${API}/motoristas`, { params })
      setMotoristas(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchMotoristas() }, [fetchMotoristas])

  const handleDelete = async (id) => {
    if (!window.confirm('Confirmar exclusão do motorista?')) return
    try {
      await axios.delete(`${API}/motoristas/${id}`)
      setSuccess('Motorista excluído com sucesso.')
      setTimeout(() => setSuccess(''), 3000)
      fetchMotoristas()
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao excluir motorista')
    }
  }

  const handleSaved = () => {
    setModal(null)
    setSuccess('Motorista salvo com sucesso!')
    setTimeout(() => setSuccess(''), 3000)
    fetchMotoristas()
  }

  const sorted = sortField
    ? [...motoristas].sort((a, b) => {
        const va = a[sortField] ?? ''; const vb = b[sortField] ?? ''
        return sortDir === 'asc'
          ? String(va).localeCompare(String(vb), 'pt-BR', { numeric: true })
          : String(vb).localeCompare(String(va), 'pt-BR', { numeric: true })
      })
    : motoristas

  const cols = [
    ['nome', 'Nome'], ['ativo', 'Status'], ['tipo', 'Tipo'], ['cpf', 'CPF'], ['dt_nascimento', 'Idade'],
    ['nr_registro_cnh', 'Nº CNH'], ['categoria_cnh', 'Cat.'],
    ['validade_cnh', 'Validade CNH'], ['telefone', 'Telefone'],
    ['cidade_emissao_cnh', 'Cidade Emissão'], ['dt_exame_toxicologico', 'Exame Toxicológico'],
  ]

  const exportRows = (list) => list.map(m => ({
    'Nome': m.nome || '',
    'Status': m.ativo === false ? 'Demitido' : 'Ativo',
    'Tipo': m.tipo || '',
    'CPF': m.cpf || '',
    'Nascimento': m.dt_nascimento ? fmtCNHValidade(m.dt_nascimento) : '',
    'Idade': calcAge(m.dt_nascimento) != null ? `${calcAge(m.dt_nascimento)} anos` : '',
    'E-mail': m.email || '',
    'Telefone': m.telefone || '',
    'Nº CNH': m.nr_registro_cnh || '',
    'Categoria CNH': m.categoria_cnh || '',
    'Validade CNH': m.validade_cnh ? fmtCNHValidade(m.validade_cnh) : '',
    'Cidade Emissão CNH': m.cidade_emissao_cnh || '',
    'Exame Toxicológico': m.dt_exame_toxicologico ? fmtCNHValidade(m.dt_exame_toxicologico) : '',
  }))

  const exportExcel = () => {
    const rows = exportRows(sorted)
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Motoristas')
    XLSX.writeFile(wb, `motoristas_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(13)
    doc.text('Motoristas Cadastrados', 14, 14)
    doc.setFontSize(8)
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 20)
    const rows = exportRows(sorted)
    const headers = Object.keys(rows[0] || {})
    autoTable(doc, {
      startY: 24,
      head: [headers],
      body: rows.map(r => headers.map(h => r[h])),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [30, 80, 180], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 244, 255] },
    })
    doc.save(`motoristas_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">Motoristas</h1>
        <div className="flex items-center gap-2">
          <button onClick={fetchMotoristas} className="text-gray-500 hover:text-blue-600 transition-colors" title="Atualizar">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm transition-colors" title="Exportar Excel">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button onClick={exportPdf} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-sm transition-colors" title="Exportar PDF">
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Novo Motorista
          </button>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-3 py-2 rounded flex items-center gap-2 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />{success}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center gap-2">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          className="flex-1 text-sm outline-none dark:text-gray-100 dark:placeholder-gray-400 bg-transparent"
          placeholder="Pesquisar por código ou nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="section-header">Motoristas Cadastrados ({motoristas.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/40">
                {cols.map(([f, l]) => (
                  <th key={f} className="px-3 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold cursor-pointer select-none hover:bg-blue-100 dark:hover:bg-blue-900/30 whitespace-nowrap" onClick={() => handleSort(f)}>
                    <span className="flex items-center gap-1">{l} <SortIcon field={f} sortField={sortField} sortDir={sortDir} /></span>
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-blue-800 dark:text-blue-300 font-semibold w-8">Doc.</th>
                <th className="px-3 py-2 text-center text-blue-800 dark:text-blue-300 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={cols.length + 1} className="text-center py-8 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />Carregando...
                </td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={cols.length + 1} className="text-center py-8 text-gray-400">Nenhum motorista encontrado.</td></tr>
              ) : sorted.map((m, idx) => (
                <tr key={m.id} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                  <td className="px-3 py-2 dark:text-gray-200 whitespace-nowrap">{m.nome}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {m.ativo === false
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Demitido</span>
                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Ativo</span>
                    }
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {m.tipo ? (
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded text-[10px] font-medium">{m.tipo}</span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{m.cpf || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap text-center">
                    {calcAge(m.dt_nascimento) !== null ? `${calcAge(m.dt_nascimento)} anos` : '—'}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{m.nr_registro_cnh || '—'}</td>
                  <td className="px-3 py-2 text-center">
                    {m.categoria_cnh ? (
                      <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-bold">{m.categoria_cnh}</span>
                    ) : '—'}
                  </td>
                  <td className={`px-3 py-2 whitespace-nowrap font-medium ${m.validade_cnh && new Date(m.validade_cnh) < new Date() ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}`}>
                    {fmtCNHValidade(m.validade_cnh)}
                  </td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{m.telefone || '—'}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{m.cidade_emissao_cnh || '—'}</td>
                  <td className={`px-3 py-2 whitespace-nowrap font-medium ${m.dt_exame_toxicologico && new Date(m.dt_exame_toxicologico) < new Date() ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'}`}>
                    {fmtCNHValidade(m.dt_exame_toxicologico)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {m.arquivos_count > 0 ? (
                      <button onClick={() => setModal(m)} title={`${m.arquivos_count} documento(s)`}
                        className="inline-flex items-center gap-0.5 text-blue-500 hover:text-blue-700">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-semibold">{m.arquivos_count}</span>
                      </button>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1.5">
                      <button className="p-0.5 text-gray-500 hover:text-yellow-600" title="Editar" onClick={() => setModal(m)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button className="p-0.5 text-gray-500 hover:text-red-600" title="Excluir" onClick={() => handleDelete(m.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <MotoristaModal
          motorista={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
