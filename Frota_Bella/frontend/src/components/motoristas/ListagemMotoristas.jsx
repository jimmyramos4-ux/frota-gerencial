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
  Users,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'

const API = 'http://localhost:8000/api'

const emptyForm = { codigo: '', nome: '' }

function fmt(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('pt-BR')
}

function MotoristaModal({ motorista, onClose, onSaved }) {
  const isEdit = Boolean(motorista?.id)
  const [form, setForm] = useState(
    motorista ? { codigo: motorista.codigo, nome: motorista.nome } : emptyForm
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setF = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.codigo || !form.nome) {
      setError('Código e Nome são obrigatórios')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        await axios.put(`${API}/motoristas/${motorista.id}`, form)
      } else {
        await axios.post(`${API}/motoristas`, form)
      }
      onSaved()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar motorista')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between bg-blue-700 text-white px-4 py-2 rounded-t">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="font-semibold text-sm">
              {isEdit ? `Editar Motorista #${motorista.id}` : 'Novo Motorista'}
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
          <div>
            <label className="form-label">Código <span className="text-red-500">*</span></label>
            <input
              className="form-input"
              value={form.codigo}
              onChange={setF('codigo')}
              placeholder="Ex: MOT001"
            />
          </div>
          <div>
            <label className="form-label">Nome <span className="text-red-500">*</span></label>
            <input
              className="form-input"
              value={form.nome}
              onChange={setF('nome')}
              placeholder="Nome completo"
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" className="btn-secondary btn-sm px-4 py-1.5" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary btn-sm px-4 py-1.5 flex items-center gap-1.5"
              disabled={saving}
            >
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
  const [modal, setModal] = useState(null) // null | 'new' | motorista object
  const [success, setSuccess] = useState('')

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

  useEffect(() => {
    fetchMotoristas()
  }, [fetchMotoristas])

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

  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-800">Motoristas</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchMotoristas}
            className="text-gray-500 hover:text-blue-600 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setModal('new')}
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Motorista
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
          placeholder="Pesquisar por código ou nome..."
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
          Motoristas Cadastrados ({motoristas.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-50 border-b border-blue-100">
                <th className="px-3 py-2 text-left text-blue-800 font-semibold">Código</th>
                <th className="px-3 py-2 text-left text-blue-800 font-semibold">Nome</th>
                <th className="px-3 py-2 text-left text-blue-800 font-semibold">Cadastro</th>
                <th className="px-3 py-2 text-center text-blue-800 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
                    Carregando...
                  </td>
                </tr>
              ) : motoristas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-400">
                    Nenhum motorista encontrado.
                  </td>
                </tr>
              ) : (
                motoristas.map((m, idx) => (
                  <tr
                    key={m.id}
                    className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className="px-3 py-2 font-medium text-blue-700">{m.codigo}</td>
                    <td className="px-3 py-2">{m.nome}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">{fmt(m.created_at)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          className="p-0.5 text-gray-500 hover:text-yellow-600"
                          title="Editar"
                          onClick={() => setModal(m)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-0.5 text-gray-500 hover:text-red-600"
                          title="Excluir"
                          onClick={() => handleDelete(m.id)}
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
        <MotoristaModal
          motorista={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
