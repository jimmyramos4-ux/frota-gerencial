import React, { useState, useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import axios from 'axios'
import {
  ChevronLeft,
  Upload,
  Loader2,
  Paperclip,
  Trash2,
  Camera,
  AlertCircle,
  CheckCircle,
  Download,
  Pencil,
} from 'lucide-react'

const API = 'http://localhost:8000/api'

function fmt(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('pt-BR') + ' ' + new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function ArquivosManutencao() {
  const { id } = useParams()
  const fileRef = useRef(null)
  const dropRef = useRef(null)

  const [man, setMan] = useState(null)
  const [arquivos, setArquivos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [editId, setEditId] = useState(null)

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/manutencoes/${id}`),
      axios.get(`${API}/manutencoes/${id}/arquivos`),
    ])
      .then(([mRes, aRes]) => {
        setMan(mRes.data)
        setArquivos(aRes.data)
      })
      .catch(() => setError('Erro ao carregar dados'))
      .finally(() => setLoading(false))
  }, [id])

  const refreshArquivos = () =>
    axios.get(`${API}/manutencoes/${id}/arquivos`).then((r) => setArquivos(r.data))

  const handleFileChange = (e) => {
    const f = e.target.files?.[0]
    if (f) setSelectedFile(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) setSelectedFile(f)
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile) {
      setError('Selecione um arquivo')
      return
    }
    setUploading(true)
    setError('')
    setSuccess('')
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('descricao', descricao)
      formData.append('usuario', 'Sistema')
      await axios.post(`${API}/manutencoes/${id}/arquivos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setSuccess('Arquivo enviado com sucesso!')
      setSelectedFile(null)
      setDescricao('')
      if (fileRef.current) fileRef.current.value = ''
      await refreshArquivos()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao enviar arquivo')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (arquivoId) => {
    if (!window.confirm('Confirma exclusão deste arquivo?')) return
    try {
      await axios.delete(`${API}/arquivos/${arquivoId}`)
      setArquivos((a) => a.filter((x) => x.id !== arquivoId))
      setSuccess('Arquivo excluído.')
      setTimeout(() => setSuccess(''), 2000)
    } catch {
      setError('Erro ao excluir arquivo')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Carregando...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="flex items-center gap-3">
        <Link to="/manutencoes" className="text-gray-500 hover:text-blue-600">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-base font-semibold text-gray-800">
          Manutenção de Arquivos da Manutenção de Veículos
        </h1>
      </div>

      {/* Manutencao info */}
      {man && (
        <div className="bg-blue-50 border border-blue-200 rounded px-4 py-2 text-sm flex items-center gap-6">
          <div>
            <span className="form-label">Código</span>
            <span className="font-semibold text-blue-800 ml-1">#{man.id}</span>
          </div>
          <div>
            <span className="form-label">Veículo</span>
            <span className="font-semibold text-blue-800 ml-1">
              {man.veiculo?.placa} — {man.veiculo?.descricao}
            </span>
          </div>
          <div>
            <span className="form-label">Status</span>
            <span className="ml-1 font-medium text-gray-700">{man.status}</span>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded flex items-center gap-2 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Upload card */}
      <div className="bg-white rounded shadow-sm border border-gray-200">
        <div className="section-header flex items-center gap-2">
          <Upload className="w-3.5 h-3.5" />
          Adicionar Arquivo
        </div>
        <form onSubmit={handleUpload} className="p-4 space-y-3">
          {/* Drop zone */}
          <div
            ref={dropRef}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              dragOver
                ? 'border-blue-400 bg-blue-50'
                : selectedFile
                ? 'border-green-400 bg-green-50'
                : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
            }`}
            onClick={() => fileRef.current?.click()}
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2 text-green-700">
                <Paperclip className="w-5 h-5" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-xs text-green-600">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ) : (
              <>
                <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  Arraste um arquivo aqui ou{' '}
                  <span className="text-blue-600 font-medium">clique para selecionar</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Suporta: PDF, imagens, documentos (máx. 10MB)
                </p>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept="*/*"
          />

          {/* Descricao */}
          <div>
            <label className="form-label">Descrição</label>
            <input
              className="form-input"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição do arquivo (opcional)"
            />
          </div>

          <div className="flex gap-2 justify-end">
            {selectedFile && (
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={() => { setSelectedFile(null); if (fileRef.current) fileRef.current.value = '' }}
              >
                Limpar
              </button>
            )}
            <button
              type="submit"
              className="btn-primary flex items-center gap-1.5"
              disabled={uploading || !selectedFile}
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {uploading ? 'Enviando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>

      {/* Arquivos list */}
      <div className="bg-white rounded shadow-sm border border-gray-200">
        <div className="section-header">
          Arquivos Anexados ({arquivos.length})
        </div>
        {arquivos.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Nenhum arquivo anexado ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-50 border-b border-blue-100">
                  <th className="px-3 py-1.5 text-left text-blue-800 font-semibold">Arquivo</th>
                  <th className="px-3 py-1.5 text-left text-blue-800 font-semibold">Descrição</th>
                  <th className="px-3 py-1.5 text-left text-blue-800 font-semibold">Usuário</th>
                  <th className="px-3 py-1.5 text-left text-blue-800 font-semibold">Data</th>
                  <th className="px-3 py-1.5 text-center text-blue-800 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {arquivos.map((a, idx) => (
                  <tr key={a.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2">
                      <a
                        href={`http://localhost:8000/api/uploads/${a.caminho}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <Paperclip className="w-3 h-3 flex-shrink-0" />
                        {a.nome_arquivo}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{a.descricao || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{a.usuario || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500">{fmt(a.created_at)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <a
                          href={`http://localhost:8000/api/uploads/${a.caminho}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-0.5 text-gray-500 hover:text-blue-600"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          className="p-0.5 text-gray-500 hover:text-red-600"
                          title="Excluir"
                          onClick={() => handleDelete(a.id)}
                        >
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
      </div>

      {/* Footer */}
      <div className="text-center pb-2">
        <Link to="/manutencoes" className="text-blue-600 hover:underline text-xs">
          &laquo; Listagem de Manutenções do Veículo
        </Link>
      </div>
    </div>
  )
}
