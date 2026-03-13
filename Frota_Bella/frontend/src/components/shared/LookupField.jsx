import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import { Search, Plus, X, Loader2, Check } from 'lucide-react'

const API = 'http://localhost:8000/api'

export default function LookupField({ endpoint, value, onChange, placeholder = 'Selecione...' }) {
  const [inputText, setInputText] = useState(value || '')
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 224 })

  // modal
  const [showModal, setShowModal] = useState(false)
  const [newNome, setNewNome] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')

  const wrapRef = useRef(null)
  const timerRef = useRef(null)
  const confirmedRef = useRef(value || '')

  useEffect(() => {
    setInputText(value || '')
    confirmedRef.current = value || ''
  }, [value])

  const fetchItems = async (q = '') => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/${endpoint}/lookup`, { params: q ? { search: q } : {} })
      setItems(res.data)
    } catch {}
    finally { setLoading(false) }
  }

  const calcPos = () => {
    if (wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + 2, left: r.left, width: Math.max(r.width, 200) })
    }
  }

  const handleInputChange = (e) => {
    const t = e.target.value
    setInputText(t)
    calcPos()
    setOpen(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fetchItems(t), 200)
  }

  const handleFocus = () => {
    calcPos()
    setOpen(true)
    fetchItems(inputText)
  }

  const handleBlur = () => {
    setTimeout(() => {
      setOpen(false)
      setInputText(confirmedRef.current)
    }, 200)
  }

  const handleSelect = (nome) => {
    confirmedRef.current = nome
    onChange(nome)
    setInputText(nome)
    setOpen(false)
  }

  const openModal = () => {
    setOpen(false)
    setNewNome('')
    setAddError('')
    setShowModal(true)
  }

  const handleAdd = async () => {
    if (!newNome.trim()) return
    setAdding(true)
    setAddError('')
    try {
      const res = await axios.post(`${API}/${endpoint}`, { nome: newNome.trim() })
      handleSelect(res.data.nome)
      setShowModal(false)
      setNewNome('')
    } catch (err) {
      setAddError(err.response?.data?.detail || 'Erro ao cadastrar')
    } finally { setAdding(false) }
  }

  // ── DROPDOWN (portal) ──
  const dropdown = open && createPortal(
    <div
      style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded shadow-lg"
    >
      <ul className="max-h-44 overflow-y-auto">
        {loading ? (
          <li className="px-3 py-2 text-gray-400 text-xs flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Carregando...
          </li>
        ) : items.length === 0 ? (
          <li className="px-3 py-2 text-gray-400 text-xs">Nenhum resultado.</li>
        ) : (
          items.map((item) => (
            <li
              key={item.id}
              className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-blue-50 flex items-center justify-between ${value === item.nome ? 'bg-blue-50 text-blue-700 font-medium' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(item.nome) }}
            >
              {item.nome}
              {value === item.nome && <Check className="w-3 h-3 text-blue-600" />}
            </li>
          ))
        )}
      </ul>
      <div className="border-t border-gray-100 p-1.5">
        <button
          type="button"
          className="w-full text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 px-1 py-0.5 hover:bg-blue-50 rounded"
          onMouseDown={(e) => { e.preventDefault(); openModal() }}
        >
          <Plus className="w-3 h-3" /> Cadastrar novo
        </button>
      </div>
    </div>,
    document.body
  )

  // ── MODAL (portal) ──
  const modal = showModal && createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-80 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-3 flex items-center justify-between">
          <span className="text-white font-bold text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Cadastrar novo
          </span>
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="text-blue-200 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-blue-800 mb-1">Nome</label>
            <input
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:border-blue-400"
              placeholder="Digite o nome..."
              value={newNome}
              onChange={(e) => setNewNome(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowModal(false) }}
              autoFocus
            />
          </div>
          {addError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">{addError}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowModal(false)}
            className="px-4 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !newNome.trim()}
            className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors"
          >
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Salvar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex gap-1">
        <input
          className="form-input text-xs py-0.5 flex-1"
          value={inputText}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="border border-gray-300 rounded px-1.5 hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
          onMouseDown={(e) => { e.preventDefault(); calcPos(); setOpen(o => !o); if (!open) fetchItems('') }}
          title="Buscar"
        >
          <Search className="w-3 h-3" />
        </button>
      </div>
      {dropdown}
      {modal}
    </div>
  )
}
