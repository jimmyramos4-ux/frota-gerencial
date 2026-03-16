import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  Paperclip,
  Mail,
  Printer,
  Pencil,
  ClipboardList,
  Plus,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
} from 'lucide-react'

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />
  return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
}
import Pagination from '../shared/Pagination.jsx'
import { EmailModal, ConfirmModal } from '../shared/Modal.jsx'

const API = 'http://localhost:8000/api'

const statusColor = {
  'Em Andamento': 'bg-blue-100 text-blue-800',
  Finalizada: 'bg-green-100 text-green-800',
  Cancelada: 'bg-red-100 text-red-800',
}

const prioridadeColor = {
  Alta: 'text-red-600 font-semibold',
  Média: 'text-orange-500 font-semibold',
  Baixa: 'text-green-600 font-semibold',
}

const emptyFilters = {
  manutencao: '',
  veiculo: '',
  tipo: '',
  uso: '',
  status: '',
  codigo_motorista: '',
  motorista: '',
  km_gte: '',
  km_lte: '',
  lancada_despesa: '',
  codigo_resp_man: '',
  resp_manutencao: '',
  codigo_resp_serv: '',
  resp_servico: '',
  nr_frota: '',
  dt_inicio_gte: '',
  dt_inicio_lte: '',
  dt_termino_gte: '',
  dt_termino_lte: '',
  prioridade: '',
  controle: '',
  dt_previsao_gte: '',
  dt_previsao_lte: '',
  portaria: '',
  anexo: '',
  dt_servico_gte: '',
  dt_servico_lte: '',
  servicos_solicitados: '',
  tipo_servico: '',
}

function fmt(dt) {
  if (!dt) return '-'
  const d = new Date(dt)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('pt-BR')
}

const fi = 'border border-gray-300 rounded px-1.5 py-0 text-xs w-full focus:outline-none focus:border-blue-400 h-5'
const fs = 'border border-gray-300 rounded px-1 py-0 text-xs bg-white focus:outline-none focus:border-blue-400 w-full h-5'
function Lbl({ children, wide }) {
  return <td className={`px-1.5 py-1 text-right text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-100 whitespace-nowrap ${wide ? 'w-28' : 'w-20'}`}>{children}</td>
}
function Td({ children, colSpan }) {
  return <td className="px-1 py-1 border border-gray-100 bg-white" colSpan={colSpan}>{children}</td>
}

export default function ListagemManutencoes() {
  const navigate = useNavigate()
  const [data, setData] = useState({ items: [], total: 0, page: 1, per_page: 10, total_pages: 1 })
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [filters, setFilters] = useState(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState({})
  const [emailModal, setEmailModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [sortField, setSortField] = useState('')
  const [sortDir, setSortDir] = useState('asc')
  const [showFilters, setShowFilters] = useState(false)
  const [lightbox, setLightbox] = useState(null) // { arquivos: [], idx: 0 }

  const handleOpenAnexos = async (item) => {
    if (!item.arquivos_count) return
    try {
      const res = await axios.get(`${API}/manutencoes/${item.id}/arquivos`)
      setLightbox({ arquivos: res.data, idx: 0 })
    } catch { /* silencioso */ }
  }

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const f = appliedFilters
      const params = {
        page,
        per_page: perPage,
        ...(f.status              && { status: f.status }),
        ...(f.tipo                && { tipo: f.tipo }),
        ...(f.prioridade          && { prioridade: f.prioridade }),
        ...(f.veiculo             && { veiculo: f.veiculo }),
        ...(f.motorista           && { motorista: f.motorista }),
        ...(f.manutencao          && { manutencao: f.manutencao }),
        ...(f.resp_manutencao     && { resp_manutencao: f.resp_manutencao }),
        ...(f.servicos_solicitados && { servicos_solicitados: f.servicos_solicitados }),
        ...(f.km_gte              && { km_gte: f.km_gte }),
        ...(f.km_lte              && { km_lte: f.km_lte }),
        ...(f.dt_inicio_gte       && { dt_inicio_gte: f.dt_inicio_gte }),
        ...(f.dt_inicio_lte       && { dt_inicio_lte: f.dt_inicio_lte }),
        ...(f.dt_termino_gte      && { dt_termino_gte: f.dt_termino_gte }),
        ...(f.dt_termino_lte      && { dt_termino_lte: f.dt_termino_lte }),
        ...(f.dt_previsao_gte     && { dt_previsao_gte: f.dt_previsao_gte }),
        ...(f.dt_previsao_lte     && { dt_previsao_lte: f.dt_previsao_lte }),
        ...(f.anexo               && { anexo: f.anexo }),
        ...(f.tipo_servico        && { tipo_servico: f.tipo_servico }),
      }
      const res = await axios.get(`${API}/manutencoes`, { params })
      setData(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, perPage, appliedFilters])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleFilter = (e) => {
    e.preventDefault()
    setPage(1)
    setAppliedFilters({ ...filters })
  }

  const handleClear = () => {
    setFilters(emptyFilters)
    setAppliedFilters({})
    setPage(1)
  }

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/manutencoes/${id}`)
      fetchData()
    } catch (err) {
      alert('Erro ao excluir manutenção')
    }
    setDeleteModal(null)
  }

  const setF = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))

  const from = data.total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, data.total)

  // Helpers para filtros compactos

  return (
    <div className="space-y-3">
      {/* Page title */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-lg shadow px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-blue-200" />
          <div>
            <h1 className="text-white font-bold text-base leading-tight">Manutenções de Veículo</h1>
            <p className="text-blue-200 text-xs">Gerencie e acompanhe as manutenções da frota</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="text-blue-200 hover:text-white transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table card */}
      <div className="bg-white rounded shadow-sm border border-gray-200">
        {/* Pagination bar TOP */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
            <span className="text-xs text-gray-500 ml-2">
              {data.total === 0 ? '0 registros' : `${from} à ${to} de ${data.total}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500">Por página:</label>
            <select
              className="border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white"
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-50 border-b border-blue-100">
                {[['id','Man.'],['veiculo_placa','Veículo'],['motorista_nome','Motorista'],['responsavel_manutencao','Responsável Man.'],['km_entrada','Km Entrada'],['dt_inicio','Dt. Início'],['dt_previsao','Dt. Previsão'],['dt_termino','Dt. Término'],['prioridade','Prioridade'],['tipo','Tipo'],['status','Status']].map(([f,l]) => (
                  <th key={f} className="px-2 py-2 text-left text-blue-800 font-semibold whitespace-nowrap cursor-pointer select-none hover:bg-blue-100" onClick={() => handleSort(f)}>
                    <span className="flex items-center gap-1">{l} <SortIcon field={f} sortField={sortField} sortDir={sortDir} /></span>
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-blue-800 font-semibold whitespace-nowrap">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
                    Carregando...
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-gray-400">
                    Nenhuma manutenção encontrada.
                  </td>
                </tr>
              ) : (
                (sortField ? [...data.items].sort((a, b) => {
                  const va = a[sortField] ?? ''; const vb = b[sortField] ?? ''
                  return sortDir === 'asc' ? String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) : String(vb).localeCompare(String(va), 'pt-BR', { numeric: true })
                }) : data.items).map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-2 py-1.5 font-medium text-blue-700">#{item.id}</td>
                    <td className="px-2 py-1.5">
                      <div className="font-medium">{item.veiculo_placa}</div>
                      <div className="text-gray-400 text-xs leading-none">{item.veiculo_descricao}</div>
                    </td>
                    <td className="px-2 py-1.5">{item.motorista_nome || '-'}</td>
                    <td className="px-2 py-1.5">{item.responsavel_manutencao || '-'}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums">
                      {item.km_entrada ? item.km_entrada.toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{fmt(item.dt_inicio)}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{fmt(item.dt_previsao)}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{fmt(item.dt_termino)}</td>
                    <td className="px-2 py-1.5">
                      {item.prioridade ? (
                        <span className={prioridadeColor[item.prioridade] || ''}>
                          {item.prioridade}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-2 py-1.5">{item.tipo || '-'}</td>
                    <td className="px-2 py-1.5">
                      <span className={`status-badge ${statusColor[item.status] || 'bg-gray-100 text-gray-600'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          className={`relative p-0.5 transition-colors ${item.arquivos_count > 0 ? 'text-blue-500 hover:text-blue-700' : 'text-gray-300 cursor-default'}`}
                          title={item.arquivos_count > 0 ? `${item.arquivos_count} anexo(s)` : 'Sem anexos'}
                          onClick={() => handleOpenAnexos(item)}
                          disabled={!item.arquivos_count}
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          {item.arquivos_count > 0 && (
                            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold leading-none">
                              {item.arquivos_count}
                            </span>
                          )}
                        </button>
                        <button
                          className="p-0.5 text-gray-500 hover:text-indigo-600"
                          title="Enviar por e-mail"
                          onClick={() => setEmailModal(item.id)}
                        >
                          <Mail className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="p-0.5 text-gray-500 hover:text-green-600"
                          title="Imprimir"
                          onClick={() => window.open(`/manutencoes/${item.id}/extrato?print=1`, '_blank')}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          to={`/manutencoes/${item.id}/editar`}
                          className="p-0.5 text-gray-500 hover:text-yellow-600"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          to={`/manutencoes/${item.id}/extrato`}
                          className="p-0.5 text-gray-500 hover:text-purple-600"
                          title="Extrato"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Status bar */}
        <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
          <span>Total: {data.total} manutenção(ões)</span>
          <span>Página {page} de {data.total_pages}</span>
        </div>
      </div>

      {/* Filter Form — compacto */}
      <div className="bg-white rounded shadow-sm border border-gray-200">
        <button
          type="button"
          onClick={() => setShowFilters(f => !f)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2"><Filter className="w-3.5 h-3.5" /> Filtros</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
        {showFilters && <form onSubmit={handleFilter}>
          <div className="overflow-x-auto">
          <table className="border-collapse text-xs" style={{minWidth: '860px', width: '100%'}}>
            <tbody>
              {/* Linha 1 */}
              <tr>
                <Lbl>Manutenção</Lbl>
                <Td><input className={fi} value={filters.manutencao} onChange={setF('manutencao')} /></Td>
                <Lbl wide>Veículo</Lbl>
                <Td><input className={fi} value={filters.veiculo} onChange={setF('veiculo')} /></Td>
                <Lbl>Tipo</Lbl>
                <Td>
                  <select className={fs} value={filters.tipo} onChange={setF('tipo')}>
                    <option value=""></option><option>Corretiva</option><option>Preventiva</option>
                  </select>
                </Td>
                <Lbl>Status</Lbl>
                <Td colSpan={3}>
                  <select className={fs} value={filters.status} onChange={setF('status')}>
                    <option value=""></option><option>Em Andamento</option><option>Finalizada</option><option>Cancelada</option>
                  </select>
                </Td>
              </tr>
              {/* Linha 2 */}
              <tr>
                <Lbl wide>Motorista</Lbl>
                <Td><input className={fi} value={filters.motorista} onChange={setF('motorista')} /></Td>
                <Lbl>Km Entrada &gt;=</Lbl>
                <Td><input className={fi} type="number" value={filters.km_gte} onChange={setF('km_gte')} /></Td>
                <Lbl>Km Entrada &lt;=</Lbl>
                <Td><input className={fi} type="number" value={filters.km_lte} onChange={setF('km_lte')} /></Td>
                <Lbl wide>Resp. Manutenção</Lbl>
                <Td colSpan={3}><input className={fi} value={filters.resp_manutencao} onChange={setF('resp_manutencao')} /></Td>
              </tr>
              {/* Linha 4 */}
              <tr>
                <Lbl wide>Dt. Início &gt;=</Lbl>
                <Td><input className={fi} type="date" value={filters.dt_inicio_gte} onChange={setF('dt_inicio_gte')} /></Td>
                <Lbl>Dt. Início &lt;=</Lbl>
                <Td><input className={fi} type="date" value={filters.dt_inicio_lte} onChange={setF('dt_inicio_lte')} /></Td>
                <Lbl>Dt. Término &gt;=</Lbl>
                <Td><input className={fi} type="date" value={filters.dt_termino_gte} onChange={setF('dt_termino_gte')} /></Td>
                <Lbl>Dt. Término &lt;=</Lbl>
                <Td><input className={fi} type="date" value={filters.dt_termino_lte} onChange={setF('dt_termino_lte')} /></Td>
                <Lbl>Prioridade</Lbl>
                <Td>
                  <select className={fs} value={filters.prioridade} onChange={setF('prioridade')}>
                    <option value=""></option><option>Alta</option><option>Média</option><option>Baixa</option>
                  </select>
                </Td>
              </tr>
              {/* Linha 5 */}
              <tr>
                <Lbl wide>Dt. Previsão &gt;=</Lbl>
                <Td><input className={fi} type="date" value={filters.dt_previsao_gte} onChange={setF('dt_previsao_gte')} /></Td>
                <Lbl>Dt. Previsão &lt;=</Lbl>
                <Td><input className={fi} type="date" value={filters.dt_previsao_lte} onChange={setF('dt_previsao_lte')} /></Td>
                <Lbl>Dt. Serviço &gt;=</Lbl>
                <Td><input className={fi} type="date" value={filters.dt_servico_gte} onChange={setF('dt_servico_gte')} /></Td>
                <Lbl wide>Dt. Serviço &lt;=</Lbl>
                <Td><input className={fi} type="date" value={filters.dt_servico_lte} onChange={setF('dt_servico_lte')} /></Td>
                <Lbl>Anexo</Lbl>
                <Td>
                  <select className={fs} value={filters.anexo} onChange={setF('anexo')}>
                    <option value=""></option><option value="sim">Com Anexo</option><option value="nao">Sem Anexo</option>
                  </select>
                </Td>
              </tr>
              {/* Linha 6 */}
              <tr>
                <Lbl>Serviços Solicitados</Lbl>
                <Td colSpan={5}><input className={fi} value={filters.servicos_solicitados} onChange={setF('servicos_solicitados')} /></Td>
                <Lbl>Tipo Serviço</Lbl>
                <Td colSpan={3}>
                  <input className={fi} value={filters.tipo_servico} onChange={setF('tipo_servico')} placeholder="Ex: Revisão, Calibração..." />
                </Td>
              </tr>
            </tbody>
          </table>
          </div>
          {/* Botões */}
          <div className="bg-blue-50 border-t border-gray-200 py-1.5 flex justify-center gap-3">
            <button type="submit" className="px-5 py-0.5 text-xs bg-white border border-gray-400 rounded hover:bg-gray-50 shadow-sm">Filtrar</button>
            <button type="button" className="px-5 py-0.5 text-xs bg-white border border-gray-400 rounded hover:bg-gray-50 shadow-sm" onClick={handleClear}>Limpar</button>
          </div>
        </form>}
      </div>

      {/* Bottom link */}
      <div className="text-center pb-2">
        <Link
          to="/manutencoes/nova"
          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
        >
          <Plus className="w-4 h-4" />
          Adicionar Manutenção de Veículo
        </Link>
      </div>

      {/* Modals */}
      {emailModal && (
        <EmailModal manutencaoId={emailModal} onClose={() => setEmailModal(null)} />
      )}
      {deleteModal && (
        <ConfirmModal
          title="Excluir Manutenção"
          message={`Tem certeza que deseja excluir a manutenção #${deleteModal}?`}
          onConfirm={() => handleDelete(deleteModal)}
          onClose={() => setDeleteModal(null)}
        />
      )}

      {/* Lightbox de anexos */}
      {lightbox && (() => {
        const arq = lightbox.arquivos[lightbox.idx]
        const isImg = arq && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(arq.nome_arquivo)
        const url = arq ? `http://localhost:8000/api/uploads/${arq.caminho}` : null
        const imgArquivos = lightbox.arquivos.filter(a => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(a.nome_arquivo))
        return (
          <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center" onClick={() => setLightbox(null)}>
            <button className="absolute top-4 right-4 text-white hover:text-gray-300" onClick={() => setLightbox(null)}>
              <X className="w-6 h-6" />
            </button>
            {/* Thumbnails */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2" onClick={e => e.stopPropagation()}>
              {lightbox.arquivos.map((a, i) => {
                const aUrl = `http://localhost:8000/api/uploads/${a.caminho}`
                const aImg = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(a.nome_arquivo)
                return (
                  <button key={a.id} onClick={() => setLightbox(lb => ({ ...lb, idx: i }))}
                    className={`w-10 h-10 rounded border-2 overflow-hidden flex-shrink-0 transition-all ${i === lightbox.idx ? 'border-white scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                    {aImg
                      ? <img src={aUrl} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gray-700 flex items-center justify-center"><FileText className="w-4 h-4 text-gray-300" /></div>}
                  </button>
                )
              })}
            </div>
            {/* Conteúdo principal */}
            <div className="mt-16" onClick={e => e.stopPropagation()}>
              {isImg
                ? <img src={url} alt={arq.nome_arquivo} className="max-h-[70vh] max-w-[85vw] rounded shadow-2xl object-contain" />
                : <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4 shadow-2xl">
                    <FileText className="w-16 h-16 text-blue-400" />
                    <div className="text-gray-700 font-medium text-sm">{arq?.nome_arquivo}</div>
                    <a href={url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                      <Download className="w-4 h-4" /> Baixar arquivo
                    </a>
                  </div>
              }
            </div>
            {/* Navegação */}
            <button className="absolute left-4 text-white hover:text-gray-300 disabled:opacity-30" disabled={lightbox.idx === 0}
              onClick={e => { e.stopPropagation(); setLightbox(lb => ({ ...lb, idx: lb.idx - 1 })) }}>
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button className="absolute right-4 text-white hover:text-gray-300 disabled:opacity-30" disabled={lightbox.idx === lightbox.arquivos.length - 1}
              onClick={e => { e.stopPropagation(); setLightbox(lb => ({ ...lb, idx: lb.idx + 1 })) }}>
              <ChevronRight className="w-8 h-8" />
            </button>
            <div className="absolute bottom-4 text-white text-sm">{lightbox.idx + 1} / {lightbox.arquivos.length} — {arq?.nome_arquivo}</div>
          </div>
        )
      })()}
    </div>
  )
}
