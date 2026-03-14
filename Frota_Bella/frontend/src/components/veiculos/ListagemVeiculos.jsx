import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
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
} from 'lucide-react'

const API = 'http://localhost:8000/api'

const emptyForm = {
  placa: '',
  marca: '',
  modelo: '',
  tipo: '',
  grupo: '',
  ano: '',
  chassi: '',
}

function fmt(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('pt-BR')
}

function VeiculoModal({ veiculo, onClose, onSaved }) {
  const isEdit = Boolean(veiculo?.id)
  const [form, setForm] = useState(
    veiculo
      ? { placa: veiculo.placa, marca: veiculo.marca || '', modelo: veiculo.modelo || '', tipo: veiculo.tipo || '', grupo: veiculo.grupo || '', ano: veiculo.ano || '', chassi: veiculo.chassi || '' }
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
      const payload = { ...form, ano: form.ano ? Number(form.ano) : null }
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
      <div className="bg-white rounded shadow-xl w-full max-w-lg mx-4">
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
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded flex items-center gap-2 text-sm">
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
          <div>
            <label className="form-label">Chassi</label>
            <input className="form-input" value={form.chassi} onChange={setF('chassi')} placeholder="Nº do chassi" />
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
  const [veiculos, setVeiculos] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'new' | veiculo object
  const [success, setSuccess] = useState('')

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

  useEffect(() => {
    fetchVeiculos()
  }, [fetchVeiculos])

  const handleDelete = async (id) => {
    if (!window.confirm('Confirmar exclusão do veículo?')) return
    try {
      await axios.delete(`${API}/veiculos/${id}`)
      setSuccess('Veículo excluído com sucesso.')
      setTimeout(() => setSuccess(''), 3000)
      fetchVeiculos()
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao excluir veículo')
    }
  }

  const handleSaved = () => {
    setModal(null)
    setSuccess('Veículo salvo com sucesso!')
    setTimeout(() => setSuccess(''), 3000)
    fetchVeiculos()
  }

  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-800">Veículos</h1>
        <div className="flex items-center gap-2">
          <button onClick={fetchVeiculos} className="text-gray-500 hover:text-blue-600 transition-colors" title="Atualizar">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setModal('new')}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Veículo
          </button>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded flex items-center gap-2 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded shadow-sm border border-gray-200 px-3 py-2 flex items-center gap-2">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          className="flex-1 text-sm outline-none"
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
      <div className="bg-white rounded shadow-sm border border-gray-200">
        <div className="section-header">
          Veículos Cadastrados ({veiculos.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-50 border-b border-blue-100">
                <th className="px-3 py-2 text-left text-blue-800 font-semibold">Placa</th>
                <th className="px-3 py-2 text-left text-blue-800 font-semibold">Marca</th>
                <th className="px-3 py-2 text-left text-blue-800 font-semibold">Modelo</th>
                <th className="px-3 py-2 text-left text-blue-800 font-semibold">Tipo</th>
                <th className="px-3 py-2 text-left text-blue-800 font-semibold">Grupo</th>
                <th className="px-3 py-2 text-left text-blue-800 font-semibold">Ano</th>
                <th className="px-3 py-2 text-left text-blue-800 font-semibold">Chassi</th>
                <th className="px-3 py-2 text-left text-blue-800 font-semibold">Cadastro</th>
                <th className="px-3 py-2 text-center text-blue-800 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
                    Carregando...
                  </td>
                </tr>
              ) : veiculos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-gray-400">
                    Nenhum veículo encontrado.
                  </td>
                </tr>
              ) : (
                veiculos.map((v, idx) => (
                  <tr
                    key={v.id}
                    className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="px-3 py-2 font-medium text-blue-700">{v.placa}</td>
                    <td className="px-3 py-2">{v.marca || '-'}</td>
                    <td className="px-3 py-2">{v.modelo || '-'}</td>
                    <td className="px-3 py-2">{v.tipo || '-'}</td>
                    <td className="px-3 py-2">{v.grupo || '-'}</td>
                    <td className="px-3 py-2">{v.ano || '-'}</td>
                    <td className="px-3 py-2 text-gray-500">{v.chassi || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">{fmt(v.created_at)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          className="p-0.5 text-gray-500 hover:text-yellow-600"
                          title="Editar"
                          onClick={() => setModal(v)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-0.5 text-gray-500 hover:text-red-600"
                          title="Excluir"
                          onClick={() => handleDelete(v.id)}
                        >
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

      {/* Modal */}
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
