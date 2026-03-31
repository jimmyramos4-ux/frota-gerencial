import React, { useState } from 'react'
import axios from 'axios'
import { X, Mail, Send } from 'lucide-react'

const API = 'http://localhost:8000/api'

export function EmailModal({ manutencaoId, onClose }) {
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [erro, setErro] = useState('')

  const handleSend = async (e) => {
    e.preventDefault()
    if (!email) return
    setSending(true)
    setErro('')
    try {
      await axios.post(`${API}/manutencoes/${manutencaoId}/enviar-email`, { email })
      setSent(true)
      setTimeout(onClose, 2000)
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao enviar e-mail. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-blue-700 text-white px-4 py-2 rounded-t">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span className="font-semibold text-sm">
              Enviar PDF da Manutenção Veículo por E-mail
            </span>
          </div>
          <button onClick={onClose} className="hover:text-blue-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSend} className="p-5">
          {sent ? (
            <p className="text-green-600 font-medium text-center py-4">
              ✓ E-mail enviado com sucesso!
            </p>
          ) : (
            <>
              <label className="form-label">E-mail Destino</label>
              <input
                type="email"
                className="form-input mb-4"
                placeholder="destinatario@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              {erro && <p className="text-red-500 text-xs mb-3">{erro}</p>}
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="btn-secondary btn-sm px-4 py-1.5"
                  onClick={onClose}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary btn-sm px-4 py-1.5 flex items-center gap-1.5"
                  disabled={sending}
                >
                  {sending ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3" />
                      Enviar
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}

export function ConfirmModal({ title, message, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded shadow-xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between bg-red-600 text-white px-4 py-2 rounded-t">
          <span className="font-semibold text-sm">{title || 'Confirmar'}</span>
          <button onClick={onClose} className="hover:text-red-200">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">
          <p className="text-gray-700 dark:text-gray-200 mb-4">{message || 'Tem certeza?'}</p>
          <div className="flex gap-2 justify-end">
            <button className="btn-secondary btn-sm px-4 py-1.5" onClick={onClose}>
              Cancelar
            </button>
            <button className="btn-danger btn-sm px-4 py-1.5" onClick={onConfirm}>
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
