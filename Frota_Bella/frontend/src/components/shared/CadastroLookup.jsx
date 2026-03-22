import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Plus, Pencil, Trash2, RefreshCw, Search, X, Save, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

const API = 'http://localhost:8000/api'

function fmt(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('pt-BR')
}

export default function CadastroLookup({ titulo, endpoint, icone: Icone }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editNome, setEditNome] = useState('')
  const [newNome, setNewNome] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const params = search ? { search } : {}
      const res = await axios.get(`${API}/${endpoint}`, { params })
      setItems(res.data)
    } catch { }
    finally { setLoading(false) }
  }, [search, endpoint])

  useEffect(() => { fetch() }, [fetch])

  const showSuccess = (msg) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newNome.trim()) return
    setSaving(true)
    setError('')
    try {
      await axios.post(`${API}/${endpoint}`, { nome: newNome.trim() })
      setNewNome('')
      showSuccess('Cadastrado com sucesso!')
      fetch()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao cadastrar')
    } finally { setSaving(false) }
  }

  const handleEdit = async (id) => {
    if (!editNome.trim()) return
    setSaving(true)
    setError('')
    try {
      await axios.put(`${API}/${endpoint}/${id}`, { nome: editNome.trim() })
      setEditingId(null)
      showSuccess('Atualizado com sucesso!')
      fetch()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao atualizar')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Confirmar exclusão?')) return
    try {
      await axios.delete(`${API}/${endpoint}/${id}`)
      showSuccess('Excluído com sucesso.')
      fetch()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao excluir')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          {Icone && <Icone className="w-4 h-4 text-blue-600" />}
          {titulo}
        </h1>
        <button onClick={fetch} className="text-gray-500 dark:text-gray-400 hover:text-blue-600" title="Atualizar">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-3 py-2 rounded flex items-center gap-2 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />{success}
        </div>
      )}

      {/* Add form */}
      <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="section-header">Novo Cadastro</div>
        <form onSubmit={handleAdd} className="p-3 flex gap-2">
          <input
            className="form-input flex-1"
            placeholder={`Nome do ${titulo.toLowerCase()}...`}
            value={newNome}
            onChange={(e) => setNewNome(e.target.value)}
          />
          <button type="submit" className="btn-primary flex items-center gap-1.5" disabled={saving || !newNome.trim()}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Adicionar
          </button>
        </form>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700 px-3 py-2 flex items-center gap-2">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          className="flex-1 text-sm outline-none dark:text-gray-100 dark:placeholder-gray-400 bg-transparent"
          placeholder="Pesquisar..."
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
        <div className="section-header">{titulo} Cadastrados ({items.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/40">
                <th className="px-3 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold">#</th>
                <th className="px-3 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold">Nome</th>
                <th className="px-3 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold">Cadastro</th>
                <th className="px-3 py-2 text-center text-blue-800 dark:text-blue-300 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />Carregando...
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">Nenhum registro encontrado.</td></tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                    <td className="px-3 py-2 text-gray-400 dark:text-gray-500">{item.id}</td>
                    <td className="px-3 py-2">
                      {editingId === item.id ? (
                        <input
                          className="form-input py-0.5 text-xs"
                          value={editNome}
                          onChange={(e) => setEditNome(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(item.id); if (e.key === 'Escape') setEditingId(null) }}
                        />
                      ) : (
                        <span className="font-medium">{item.nome}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmt(item.created_at)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        {editingId === item.id ? (
                          <>
                            <button className="p-0.5 text-green-600 hover:text-green-800" title="Salvar" onClick={() => handleEdit(item.id)}>
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-0.5 text-gray-500 hover:text-gray-700" title="Cancelar" onClick={() => setEditingId(null)}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="p-0.5 text-gray-500 hover:text-yellow-600" title="Editar"
                              onClick={() => { setEditingId(item.id); setEditNome(item.nome) }}>
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-0.5 text-gray-500 hover:text-red-600" title="Excluir" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
