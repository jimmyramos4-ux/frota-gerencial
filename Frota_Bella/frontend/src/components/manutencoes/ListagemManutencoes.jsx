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
} from 'lucide-react'
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

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        page,
        per_page: perPage,
        ...(appliedFilters.status && { status: appliedFilters.status }),
        ...(appliedFilters.tipo && { tipo: appliedFilters.tipo }),
        ...(appliedFilters.prioridade && { prioridade: appliedFilters.prioridade }),
        ...(appliedFilters.veiculo && { veiculo: appliedFilters.veiculo }),
        ...(appliedFilters.motorista && { motorista: appliedFilters.motorista }),
        ...(appliedFilters.dt_inicio_gte && { dt_inicio_gte: appliedFilters.dt_inicio_gte }),
        ...(appliedFilters.dt_inicio_lte && { dt_inicio_lte: appliedFilters.dt_inicio_lte }),
        ...(appliedFilters.servicos_solicitados && { search: appliedFilters.servicos_solicitados }),
        ...(appliedFilters.resp_manutencao && { search: appliedFilters.resp_manutencao }),
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
  const fi = 'border border-gray-300 rounded px-1.5 py-0 text-xs w-full focus:outline-none focus:border-blue-400 h-5'
  const fs = 'border border-gray-300 rounded px-1 py-0 text-xs bg-white focus:outline-none focus:border-blue-400 w-full h-5'
  const Lbl = ({ children, wide }) => (
    <td className={`px-1.5 py-1 text-right text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-100 whitespace-nowrap ${wide ? 'w-28' : 'w-20'}`}>
      {children}
    </td>
  )
  const Td = ({ children, colSpan }) => (
    <td className="px-1 py-1 border border-gray-100 bg-white" colSpan={colSpan}>{children}</td>
  )

  return (
    <div className="space-y-3">
      {/* Page title */}
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-800">
          Listagem de Manutenções de Veículo
        </h1>
        <button
          onClick={fetchData}
          className="text-gray-500 hover:text-blue-600 transition-colors"
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
                <th className="px-2 py-2 text-left text-blue-800 font-semibold whitespace-nowrap">Man.</th>
                <th className="px-2 py-2 text-left text-blue-800 font-semibold whitespace-nowrap">Veículo</th>
                <th className="px-2 py-2 text-left text-blue-800 font-semibold whitespace-nowrap">Motorista</th>
                <th className="px-2 py-2 text-left text-blue-800 font-semibold whitespace-nowrap">Responsável Man.</th>
                <th className="px-2 py-2 text-right text-blue-800 font-semibold whitespace-nowrap">Km Entrada</th>
                <th className="px-2 py-2 text-left text-blue-800 font-semibold whitespace-nowrap">Dt. Início</th>
                <th className="px-2 py-2 text-left text-blue-800 font-semibold whitespace-nowrap">Dt. Previsão</th>
                <th className="px-2 py-2 text-left text-blue-800 font-semibold whitespace-nowrap">Dt. Término</th>
                <th className="px-2 py-2 text-left text-blue-800 font-semibold whitespace-nowrap">Prioridade</th>
                <th className="px-2 py-2 text-left text-blue-800 font-semibold whitespace-nowrap">Tipo</th>
                <th className="px-2 py-2 text-left text-blue-800 font-semibold whitespace-nowrap">Status</th>
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
                data.items.map((item, idx) => (
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
                        <Link
                          to={`/manutencoes/${item.id}/arquivos`}
                          className="p-0.5 text-gray-500 hover:text-blue-600"
                          title="Arquivos"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                        </Link>
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
                          onClick={() => window.open(`/manutencoes/${item.id}/extrato`, '_blank')}
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
      <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
        <form onSubmit={handleFilter}>
          <table className="w-full border-collapse text-xs">
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
                <Lbl>Uso</Lbl>
                <Td>
                  <select className={fs} value={filters.uso} onChange={setF('uso')}>
                    <option value=""></option><option>Interna</option><option>Externa</option>
                  </select>
                </Td>
                <Lbl>Status</Lbl>
                <Td>
                  <select className={fs} value={filters.status} onChange={setF('status')}>
                    <option value=""></option><option>Em Andamento</option><option>Finalizada</option><option>Cancelada</option>
                  </select>
                </Td>
              </tr>
              {/* Linha 2 */}
              <tr>
                <Lbl>Código</Lbl>
                <Td><input className={fi} value={filters.codigo_motorista} onChange={setF('codigo_motorista')} /></Td>
                <Lbl wide>Motorista</Lbl>
                <Td><input className={fi} value={filters.motorista} onChange={setF('motorista')} /></Td>
                <Lbl>Km Entrada &gt;=</Lbl>
                <Td><input className={fi} type="number" value={filters.km_gte} onChange={setF('km_gte')} /></Td>
                <Lbl>Km Entrada &lt;=</Lbl>
                <Td><input className={fi} type="number" value={filters.km_lte} onChange={setF('km_lte')} /></Td>
                <Lbl>Lançada Despesa</Lbl>
                <Td>
                  <select className={fs} value={filters.lancada_despesa} onChange={setF('lancada_despesa')}>
                    <option value=""></option><option value="sim">Sim</option><option value="nao">Não</option>
                  </select>
                </Td>
              </tr>
              {/* Linha 3 */}
              <tr>
                <Lbl>Código</Lbl>
                <Td><input className={fi} value={filters.codigo_resp_man} onChange={setF('codigo_resp_man')} /></Td>
                <Lbl wide>Resp. Manutenção</Lbl>
                <Td><input className={fi} value={filters.resp_manutencao} onChange={setF('resp_manutencao')} /></Td>
                <Lbl>Código</Lbl>
                <Td><input className={fi} value={filters.codigo_resp_serv} onChange={setF('codigo_resp_serv')} /></Td>
                <Lbl wide>Resp. Serviço</Lbl>
                <Td colSpan={3}><input className={fi} value={filters.resp_servico} onChange={setF('resp_servico')} /></Td>
              </tr>
              {/* Linha 4 */}
              <tr>
                <Lbl>Nr. Frota</Lbl>
                <Td><input className={fi} value={filters.nr_frota} onChange={setF('nr_frota')} /></Td>
                <Lbl wide>Dt. Início &gt;=</Lbl>
                <Td><input className={fi} type="date" value={filters.dt_inicio_gte} onChange={setF('dt_inicio_gte')} /></Td>
                <Lbl>Dt. Início &lt;=</Lbl>
                <Td><input className={fi} type="date" value={filters.dt_inicio_lte} onChange={setF('dt_inicio_lte')} /></Td>
                <Lbl>Dt. Término &gt;=</Lbl>
                <Td><input className={fi} type="date" value={filters.dt_termino_gte} onChange={setF('dt_termino_gte')} /></Td>
                <Lbl>Dt. Término &lt;=</Lbl>
                <Td>
                  <div className="flex items-center gap-1">
                    <input className={fi} type="date" value={filters.dt_termino_lte} onChange={setF('dt_termino_lte')} />
                  </div>
                </Td>
                <Lbl>Prioridade</Lbl>
                <Td>
                  <select className={fs} value={filters.prioridade} onChange={setF('prioridade')}>
                    <option value=""></option><option>Alta</option><option>Média</option><option>Baixa</option>
                  </select>
                </Td>
              </tr>
              {/* Linha 5 */}
              <tr>
                <Lbl>Controle</Lbl>
                <Td>
                  <span className="flex items-center gap-0.5">
                    <input className={fi} value={filters.controle} onChange={setF('controle')} />
                    <span className="inline-flex items-center justify-center w-4 h-4 bg-yellow-400 rounded-sm shrink-0">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </span>
                  </span>
                </Td>
                <Lbl wide>Dt. Previsão &gt;=</Lbl>
                <Td><input className={fi} type="date" value={filters.dt_previsao_gte} onChange={setF('dt_previsao_gte')} /></Td>
                <Lbl>Dt. Previsão &lt;=</Lbl>
                <Td><input className={fi} type="date" value={filters.dt_previsao_lte} onChange={setF('dt_previsao_lte')} /></Td>
                <Lbl>Portaria</Lbl>
                <Td>
                  <select className={fs} value={filters.portaria} onChange={setF('portaria')}>
                    <option value=""></option><option value="sim">Sim</option><option value="nao">Não</option>
                  </select>
                </Td>
                <Lbl>Anexo</Lbl>
                <Td>
                  <select className={fs} value={filters.anexo} onChange={setF('anexo')}>
                    <option value=""></option><option value="sim">Com Anexo</option><option value="nao">Sem Anexo</option>
                  </select>
                </Td>
              </tr>
              {/* Linha 6 */}
              <tr>
                <Lbl>Dt. Serviço &gt;=</Lbl>
                <Td><input className={fi} type="date" value={filters.dt_servico_gte} onChange={setF('dt_servico_gte')} /></Td>
                <Lbl wide>Dt. Serviço &lt;=</Lbl>
                <Td><input className={fi} type="date" value={filters.dt_servico_lte} onChange={setF('dt_servico_lte')} /></Td>
                <Lbl>Serviços Solicitados</Lbl>
                <Td colSpan={5}><input className={fi} value={filters.servicos_solicitados} onChange={setF('servicos_solicitados')} /></Td>
              </tr>
              {/* Linha 7 */}
              <tr>
                <Lbl>Tipo Serviço</Lbl>
                <Td colSpan={9}>
                  <select className={`${fs} w-full`} value={filters.tipo_servico} onChange={setF('tipo_servico')}>
                    <option value=""></option><option>Corretivo</option><option>Preventivo</option>
                  </select>
                </Td>
              </tr>
            </tbody>
          </table>
          {/* Botões */}
          <div className="bg-blue-50 border-t border-gray-200 py-1.5 flex justify-center gap-3">
            <button type="submit" className="px-5 py-0.5 text-xs bg-white border border-gray-400 rounded hover:bg-gray-50 shadow-sm">Filtrar</button>
            <button type="button" className="px-5 py-0.5 text-xs bg-white border border-gray-400 rounded hover:bg-gray-50 shadow-sm" onClick={handleClear}>Limpar</button>
          </div>
        </form>
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
    </div>
  )
}
