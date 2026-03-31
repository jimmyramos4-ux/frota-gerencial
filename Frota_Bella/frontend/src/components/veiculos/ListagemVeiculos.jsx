import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  X,
  Save,
  Loader2,
  Car,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Download,
  History,
} from 'lucide-react'

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />
  return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
}

const API = 'http://localhost:8000/api'

const emptyForm = {
  placa: '',
  marca: '',
  modelo: '',
  tipo: '',
  grupo: '',
  ano: '',
  chassi: '',
  capacidade: '',
  vinculo: '',
  ultimo_km: '',
}

function fmt(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('pt-BR')
}

function fmtKm(km) {
  if (!km) return '-'
  return Number(km).toLocaleString('pt-BR') + ' km'
}

function VeiculoModal({ veiculo, onClose, onSaved }) {
  const isEdit = Boolean(veiculo?.id)
  const [form, setForm] = useState(
    veiculo
      ? { placa: veiculo.placa, marca: veiculo.marca || '', modelo: veiculo.modelo || '', tipo: veiculo.tipo || '', grupo: veiculo.grupo || '', ano: veiculo.ano || '', chassi: veiculo.chassi || '', capacidade: veiculo.capacidade || '', vinculo: veiculo.vinculo || '', ultimo_km: veiculo.ultimo_km || '' }
      : emptyForm
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setF = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.placa || !form.marca || !form.modelo) {
      setError('Placa, Marca e Modelo são obrigatórios')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, ano: form.ano ? Number(form.ano) : null, ultimo_km: form.ultimo_km ? Number(form.ultimo_km) : null }
      if (isEdit) {
        await axios.put(`${API}/veiculos/${veiculo.id}`, payload)
      } else {
        await axios.post(`${API}/veiculos`, payload)
      }
      onSaved()
    } catch (err) {
      const d = err.response?.data?.detail
      setError(typeof d === 'string' ? d : Array.isArray(d) ? d.map(e => e.msg).join(', ') : 'Erro ao salvar veículo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between bg-blue-700 text-white px-4 py-2 rounded-t">
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4" />
            <span className="font-semibold text-sm">
              {isEdit ? `Editar Veículo #${veiculo.id}` : 'Novo Veículo'}
            </span>
          </div>
          <button onClick={onClose} className="hover:text-blue-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Placa <span className="text-red-500">*</span></label>
              <input className="form-input" value={form.placa} onChange={setF('placa')} placeholder="ABC-1234" />
            </div>
            <div>
              <label className="form-label">Ano Fabricação</label>
              <input className="form-input" type="number" value={form.ano} onChange={setF('ano')} placeholder="2020" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Marca <span className="text-red-500">*</span></label>
              <input className="form-input" value={form.marca} onChange={setF('marca')} placeholder="Ex: Volkswagen" />
            </div>
            <div>
              <label className="form-label">Modelo <span className="text-red-500">*</span></label>
              <input className="form-input" value={form.modelo} onChange={setF('modelo')} placeholder="Ex: Gol" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Tipo</label>
              <input className="form-input" value={form.tipo} onChange={setF('tipo')} placeholder="Ex: Caminhão" />
            </div>
            <div>
              <label className="form-label">Grupo</label>
              <select className="form-select" value={form.grupo} onChange={setF('grupo')}>
                <option value="">-</option>
                <option>Leve</option>
                <option>Pesado</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Chassi</label>
              <input className="form-input" value={form.chassi} onChange={setF('chassi')} placeholder="Nº do chassi" />
            </div>
            <div>
              <label className="form-label">Último KM</label>
              <input className="form-input" type="number" value={form.ultimo_km} onChange={setF('ultimo_km')} placeholder="Ex: 125000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Capacidade</label>
              <input className="form-input" value={form.capacidade} onChange={setF('capacidade')} placeholder="Ex: 14.000 kg" />
            </div>
            <div>
              <label className="form-label">Vínculo do Veículo</label>
              <select className="form-select" value={form.vinculo} onChange={setF('vinculo')}>
                <option value="">-</option>
                <option>Próprio</option>
                <option>Locado</option>
                <option>Terceiro</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" className="btn-secondary btn-sm px-4 py-1.5" onClick={onClose}>
              Cancelar
            </button>
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

export default function ListagemVeiculos() {
  const navigate = useNavigate()
  const [veiculos, setVeiculos] = useState([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [toast, setToast] = useState(null) // { msg, type: 'success'|'error' }
  const [sortField, setSortField] = useState('')
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchVeiculos = useCallback(async () => {
    setLoading(true)
    try {
      const params = search ? { search } : {}
      const res = await axios.get(`${API}/veiculos`, { params })
      setVeiculos(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchVeiculos() }, [fetchVeiculos])

  const handleDelete = async (id) => {
    if (!window.confirm('Confirmar exclusão do veículo?')) return
    try {
      await axios.delete(`${API}/veiculos/${id}`)
      showToast('Veículo excluído com sucesso.')
      fetchVeiculos()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Erro ao excluir veículo', 'error')
    }
  }

  const handleSaved = () => {
    setModal(null)
    showToast('Veículo salvo com sucesso!')
    fetchVeiculos()
  }

  const handleSyncKm = async () => {
    setSyncing(true)
    try {
      const res = await axios.post(`${API}/veiculos/sync-km`)
      const { atualizados, nao_encontrados } = res.data
      let msg = `${atualizados} veículo(s) atualizados com KM do Excel.`
      if (nao_encontrados.length > 0) msg += ` Não encontrados: ${nao_encontrados.join(', ')}.`
      showToast(msg)
      fetchVeiculos()
    } catch (err) {
      showToast(err.response?.data?.detail || 'Erro ao sincronizar KM', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const cols = [
    ['placa','Placa'],['marca','Marca'],['modelo','Modelo'],['tipo','Tipo'],
    ['grupo','Grupo'],['ano','Ano'],['capacidade','Capacidade'],['vinculo','Vínculo'],
    ['chassi','Chassi'],['ultimo_km','Último KM'],['created_at','Cadastro']
  ]

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

      {/* Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">Veículos</h1>
        <div className="flex items-center gap-2">
          <button onClick={fetchVeiculos} className="text-gray-500 hover:text-blue-600 transition-colors" title="Atualizar">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleSyncKm}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg font-bold shadow-sm transition-colors"
            title="Sincronizar KM do Excel"
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {syncing ? 'Sincronizando...' : 'Sync KM'}
          </button>
          <button onClick={() => setModal('new')} className="btn-primary flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            Novo Veículo
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center gap-2">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          className="flex-1 text-sm outline-none dark:text-gray-100 dark:placeholder-gray-400 bg-transparent"
          placeholder="Pesquisar por placa ou descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="section-header">
          Veículos Cadastrados ({veiculos.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/40">
                {cols.map(([f, l]) => (
                  <th key={f} className="px-3 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold cursor-pointer select-none hover:bg-blue-100 dark:hover:bg-blue-900/30 whitespace-nowrap" onClick={() => handleSort(f)}>
                    <span className="flex items-center gap-1">{l} <SortIcon field={f} sortField={sortField} sortDir={sortDir} /></span>
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-blue-800 dark:text-blue-300 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="text-center py-8 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />Carregando...
                </td></tr>
              ) : veiculos.length === 0 ? (
                <tr><td colSpan={12} className="text-center py-8 text-gray-400">Nenhum veículo encontrado.</td></tr>
              ) : (
                (sortField ? [...veiculos].sort((a, b) => {
                  const va = a[sortField] ?? ''; const vb = b[sortField] ?? ''
                  return sortDir === 'asc' ? String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) : String(vb).localeCompare(String(va), 'pt-BR', { numeric: true })
                }) : veiculos).map((v, idx) => (
                  <tr key={v.id} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                    <td className="px-3 py-2 font-medium text-blue-700 dark:text-blue-400">{v.placa}</td>
                    <td className="px-3 py-2">{v.marca || '-'}</td>
                    <td className="px-3 py-2">{v.modelo || '-'}</td>
                    <td className="px-3 py-2">{v.tipo || '-'}</td>
                    <td className="px-3 py-2">{v.grupo || '-'}</td>
                    <td className="px-3 py-2">{v.ano || '-'}</td>
                    <td className="px-3 py-2">{v.capacidade || '-'}</td>
                    <td className="px-3 py-2">{v.vinculo || '-'}</td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{v.chassi || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {v.ultimo_km ? (
                        <span className="inline-flex flex-col">
                          <span className="font-semibold text-blue-700">{fmtKm(v.ultimo_km)}</span>
                          {v.ultimo_km_data && <span className="text-gray-400 dark:text-gray-500 text-[10px]">{fmt(v.ultimo_km_data)}</span>}
                        </span>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500 dark:text-gray-400">{fmt(v.created_at)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <button className="p-0.5 text-gray-500 hover:text-blue-600" title="Histórico" onClick={() => navigate(`/veiculos/${v.id}/historico`)}>
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-0.5 text-gray-500 hover:text-yellow-600" title="Editar" onClick={() => setModal(v)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-0.5 text-gray-500 hover:text-red-600" title="Excluir" onClick={() => handleDelete(v.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <VeiculoModal
          veiculo={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
