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
  X,
  ChevronRight,
} from 'lucide-react'
import { API } from '../../lib/config'

function fmt(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('pt-BR') + ' ' + new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function isImage(nome) {
  return /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(nome)
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
  const [lightbox, setLightbox] = useState(null) // { arquivos: [], idx: 0 }

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

  const readAsBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (ev) => resolve(ev.target.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile) { setError('Selecione um arquivo'); return }
    setUploading(true); setError(''); setSuccess('')
    try {
      const conteudo = await readAsBase64(selectedFile)
      await axios.post(`${API}/manutencoes/${id}/arquivos`, {
        nome_arquivo: selectedFile.name,
        conteudo,
        descricao,
        usuario: 'Sistema',
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

  const imagens = arquivos.filter((a) => a.conteudo && isImage(a.nome_arquivo))

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
        <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">
          Arquivos da Manutenção #{id}
        </h1>
      </div>

      {/* Manutencao info */}
      {man && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded px-4 py-2 text-sm flex items-center gap-6">
          <div>
            <span className="form-label">Código</span>
            <span className="font-semibold text-blue-800 dark:text-blue-300 ml-1">#{man.id}</span>
          </div>
          <div>
            <span className="form-label">Veículo</span>
            <span className="font-semibold text-blue-800 dark:text-blue-300 ml-1">
              {man.veiculo?.placa} — {man.veiculo?.descricao}
            </span>
          </div>
          <div>
            <span className="form-label">Status</span>
            <span className="ml-1 font-medium text-gray-700 dark:text-gray-300">{man.status}</span>
          </div>
        </div>
      )}

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded flex items-center gap-2 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-3 py-2 rounded flex items-center gap-2 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Upload card */}
      <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="section-header flex items-center gap-2">
          <Upload className="w-3.5 h-3.5" />
          Adicionar Arquivo
        </div>
        <form onSubmit={handleUpload} className="p-4 space-y-3">
          <div
            ref={dropRef}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              dragOver
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : selectedFile
                ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
            }`}
            onClick={() => fileRef.current?.click()}
          >
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
                <Paperclip className="w-5 h-5" />
                <span className="font-medium">{selectedFile.name}</span>
                <span className="text-xs text-green-600 dark:text-green-500">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ) : (
              <>
                <Camera className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Arraste um arquivo aqui ou{' '}
                  <span className="text-blue-600 dark:text-blue-400 font-medium">clique para selecionar</span>
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Suporta: PDF, imagens, documentos (máx. 10MB)
                </p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} accept="*/*" />

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
              <button type="button" className="btn-secondary btn-sm"
                onClick={() => { setSelectedFile(null); if (fileRef.current) fileRef.current.value = '' }}>
                Limpar
              </button>
            )}
            <button type="submit" className="btn-primary flex items-center gap-1.5" disabled={uploading || !selectedFile}>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? 'Enviando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>

      {/* Miniaturas de imagens */}
      {imagens.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-3">Imagens ({imagens.length})</p>
          <div className="flex flex-wrap gap-2">
            {imagens.map((a, idx) => (
              <div key={a.id} className="relative group cursor-pointer"
                onClick={() => setLightbox({ arquivos: imagens, idx })}>
                <img src={a.conteudo} alt={a.nome_arquivo}
                  className="h-20 w-20 object-cover rounded border border-gray-200 dark:border-gray-600 hover:opacity-90 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de arquivos */}
      <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="section-header">
          Arquivos Anexados ({arquivos.length})
        </div>
        {arquivos.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
            Nenhum arquivo anexado ainda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/40">
                  <th className="px-3 py-1.5 text-left text-blue-800 dark:text-blue-300 font-semibold">Arquivo</th>
                  <th className="px-3 py-1.5 text-left text-blue-800 dark:text-blue-300 font-semibold">Descrição</th>
                  <th className="px-3 py-1.5 text-left text-blue-800 dark:text-blue-300 font-semibold">Usuário</th>
                  <th className="px-3 py-1.5 text-left text-blue-800 dark:text-blue-300 font-semibold">Data</th>
                  <th className="px-3 py-1.5 text-center text-blue-800 dark:text-blue-300 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {arquivos.map((a, idx) => (
                  <tr key={a.id} className={`border-b border-gray-100 dark:border-gray-700 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                    <td className="px-3 py-2">
                      {a.conteudo ? (
                        isImage(a.nome_arquivo) ? (
                          <button onClick={() => setLightbox({ arquivos: imagens, idx: imagens.findIndex(i => i.id === a.id) })}
                            className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:underline">
                            <Paperclip className="w-3 h-3 flex-shrink-0" />
                            {a.nome_arquivo}
                          </button>
                        ) : (
                          <a href={a.conteudo} download={a.nome_arquivo}
                            className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 hover:underline">
                            <Paperclip className="w-3 h-3 flex-shrink-0" />
                            {a.nome_arquivo}
                          </a>
                        )
                      ) : (
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <Paperclip className="w-3 h-3 flex-shrink-0" />
                          {a.nome_arquivo}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{a.descricao || '-'}</td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{a.usuario || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500 dark:text-gray-400">{fmt(a.created_at)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        {a.conteudo && (
                          <a href={a.conteudo} download={a.nome_arquivo}
                            className="p-0.5 text-gray-500 hover:text-blue-600" title="Download">
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button className="p-0.5 text-gray-500 hover:text-red-600" title="Excluir"
                          onClick={() => handleDelete(a.id)}>
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

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center"
          onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-gray-300" onClick={() => setLightbox(null)}>
            <X className="w-6 h-6" />
          </button>
          <button className="absolute left-4 text-white hover:text-gray-300 disabled:opacity-30"
            disabled={lightbox.idx === 0}
            onClick={e => { e.stopPropagation(); setLightbox(lb => ({ ...lb, idx: lb.idx - 1 })) }}>
            <ChevronLeft className="w-8 h-8" />
          </button>
          <div className="flex flex-col items-center gap-2" onClick={e => e.stopPropagation()}>
            <img src={lightbox.arquivos[lightbox.idx].conteudo}
              alt={lightbox.arquivos[lightbox.idx].nome_arquivo}
              className="max-h-[82vh] max-w-[85vw] rounded shadow-2xl object-contain" />
            <span className="text-white text-xs opacity-70">{lightbox.arquivos[lightbox.idx].nome_arquivo}</span>
          </div>
          <button className="absolute right-4 text-white hover:text-gray-300 disabled:opacity-30"
            disabled={lightbox.idx === lightbox.arquivos.length - 1}
            onClick={e => { e.stopPropagation(); setLightbox(lb => ({ ...lb, idx: lb.idx + 1 })) }}>
            <ChevronRight className="w-8 h-8" />
          </button>
          <div className="absolute bottom-4 text-white text-sm">
            {lightbox.idx + 1} / {lightbox.arquivos.length}
          </div>
        </div>
      )}
    </div>
  )
}
