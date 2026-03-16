import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  Wrench, Car, RefreshCw, ChevronDown, ChevronUp, ChevronsUpDown,
  AlertTriangle, CheckCircle2, Eye,
} from 'lucide-react'

const API = 'http://localhost:8000/api'


const prioridadeBadge = {
  Alta: 'bg-red-100 text-red-700',
  Média: 'bg-orange-100 text-orange-700',
  Baixa: 'bg-green-100 text-green-700',
}

function fmt(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('pt-BR')
}

function VeiculoRow({ v }) {
  const [open, setOpen] = useState(false)
  const manut = v.manutencao

  return (
    <>
      <tr
        onClick={() => v.em_manutencao && setOpen(o => !o)}
        className={`border-b text-xs transition-colors ${
          v.em_manutencao
            ? 'border-orange-200 bg-orange-50 hover:bg-orange-100 cursor-pointer'
            : 'border-gray-100 bg-white hover:bg-green-50'
        }`}
      >
        {/* Indicador lateral colorido + Placa */}
        <td className="py-2 pl-0 pr-3 whitespace-nowrap">
          <div className="flex items-center gap-0">
            <div className={`w-1 self-stretch rounded-l ${v.em_manutencao ? 'bg-orange-400' : 'bg-green-400'}`} />
            <div className="pl-3 flex items-center gap-2">
              {v.em_manutencao
                ? <ChevronDown className={`w-3.5 h-3.5 text-orange-500 transition-transform ${open ? '' : '-rotate-90'}`} />
                : <span className="w-3.5 h-3.5" />}
              <span className="font-bold text-blue-700 tracking-wide">{v.placa}</span>
            </div>
          </div>
        </td>

        {/* Veículo */}
        <td className="px-3 py-2">
          <div className="font-semibold text-gray-800">{v.descricao}</div>
          <div className="text-gray-400">{v.tipo}{v.ano ? ` · ${v.ano}` : ''}</div>
        </td>

        {/* Status badge */}
        <td className="px-3 py-2 text-center">
          {v.em_manutencao ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-500 text-white shadow-sm">
              <AlertTriangle className="w-3 h-3" /> Em Manutenção
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
              <CheckCircle2 className="w-3 h-3" /> Em Operação
            </span>
          )}
        </td>

        {/* Manutenção # */}
        <td className="px-3 py-2 whitespace-nowrap">
          {manut
            ? <span className="font-semibold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded">#{manut.id}</span>
            : <span className="text-gray-300">—</span>}
        </td>

        {/* Datas */}
        <td className="px-3 py-2 whitespace-nowrap text-gray-600">
          {manut?.dt_inicio ? fmt(manut.dt_inicio) : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-3 py-2 whitespace-nowrap">
          {manut?.dt_previsao
            ? <span className="text-orange-700 font-medium">{fmt(manut.dt_previsao)}</span>
            : <span className="text-gray-300">—</span>}
        </td>

        {/* Responsável */}
        <td className="px-3 py-2 text-gray-600">
          {manut?.responsavel || <span className="text-gray-300">—</span>}
        </td>

        {/* Prioridade */}
        <td className="px-3 py-2">
          {manut?.prioridade
            ? <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${prioridadeBadge[manut.prioridade] || ''}`}>{manut.prioridade}</span>
            : <span className="text-gray-300">—</span>}
        </td>

        {/* Serviços */}
        <td className="px-3 py-2">
          {manut?.servicos?.length > 0
            ? (
              <span className="inline-flex items-center gap-1 font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                <Wrench className="w-3 h-3" /> {manut.servicos.length}
              </span>
            )
            : <span className="text-gray-300">—</span>}
        </td>

        {/* Ver manutenção */}
        <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
          {manut
            ? (
              <Link to={`/manutencoes/${manut.id}/editar`}
                className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-800 transition-colors"
                title="Ver manutenção">
                <Eye className="w-3.5 h-3.5" />
              </Link>
            )
            : <span className="text-gray-300">—</span>}
        </td>
      </tr>

      {/* Sub-tabela de serviços */}
      {open && manut && (
        <tr>
          <td colSpan={10} className="px-0 pb-0 pt-0 bg-orange-50 border-b-2 border-orange-300">
            <div className="mx-4 mb-3 mt-1 rounded-lg border border-orange-300 overflow-hidden shadow-sm">
              {/* Cabeçalho resumo da manutenção */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-2 text-xs text-white flex flex-wrap gap-x-5 gap-y-0.5 font-medium">
                <span><strong className="font-bold">Tipo:</strong> {manut.tipo || '-'}</span>
                <span><strong className="font-bold">Motorista:</strong> {manut.motorista || '-'}</span>
                <span><strong className="font-bold">Km:</strong> {manut.km_entrada?.toLocaleString('pt-BR') || '-'}</span>
                {manut.servicos_solicitados && (
                  <span><strong className="font-bold">Solicitado:</strong> {manut.servicos_solicitados}</span>
                )}
              </div>

              {manut.servicos.length === 0 ? (
                <div className="text-xs text-gray-400 px-4 py-3 bg-white">Nenhum serviço registrado.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-orange-100 text-orange-900 border-b border-orange-200">
                      <th className="px-4 py-1.5 text-left font-semibold">Parte do Veículo</th>
                      <th className="px-4 py-1.5 text-left font-semibold">Serviço</th>
                      <th className="px-4 py-1.5 text-left font-semibold">Tipo</th>
                      <th className="px-4 py-1.5 text-left font-semibold">Responsável</th>
                      <th className="px-4 py-1.5 text-center font-semibold">Status</th>
                      <th className="px-4 py-1.5 text-right font-semibold">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {manut.servicos.map((s, i) => (
                      <tr key={i} className={`border-t border-orange-100 ${i % 2 === 0 ? 'bg-white' : 'bg-orange-50'}`}>
                        <td className="px-4 py-1.5 text-gray-600">{s.parte_veiculo || '-'}</td>
                        <td className="px-4 py-1.5 font-semibold text-gray-800">{s.servico || '-'}</td>
                        <td className="px-4 py-1.5 text-gray-600">{s.tipo_uso || '-'}</td>
                        <td className="px-4 py-1.5 text-gray-600">{s.pessoa_responsavel || '-'}</td>
                        <td className="px-4 py-1.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            s.status === 'Finalizado' ? 'bg-green-500 text-white' :
                            s.status === 'Cancelado' ? 'bg-red-500 text-white' :
                            'bg-blue-500 text-white'}`}>
                            {s.status || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-1.5 text-right font-semibold text-gray-700">
                          {s.valor ? `R$ ${Number(s.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 opacity-40" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-blue-300" />
    : <ChevronDown className="w-3 h-3 text-blue-300" />
}

function sortFrota(list, col, dir) {
  if (!col) return list
  return [...list].sort((a, b) => {
    let va, vb
    switch (col) {
      case 'placa':       va = a.placa; vb = b.placa; break
      case 'descricao':   va = a.descricao; vb = b.descricao; break
      case 'status':      va = a.em_manutencao ? 1 : 0; vb = b.em_manutencao ? 1 : 0; break
      case 'os':          va = a.manutencao?.id ?? 0; vb = b.manutencao?.id ?? 0; break
      case 'dt_inicio':   va = a.manutencao?.dt_inicio ?? ''; vb = b.manutencao?.dt_inicio ?? ''; break
      case 'dt_previsao': va = a.manutencao?.dt_previsao ?? ''; vb = b.manutencao?.dt_previsao ?? ''; break
      case 'responsavel': va = a.manutencao?.responsavel ?? ''; vb = b.manutencao?.responsavel ?? ''; break
      case 'prioridade': {
        const ord = { Alta: 3, Média: 2, Baixa: 1, '': 0 }
        va = ord[a.manutencao?.prioridade ?? ''] ?? 0
        vb = ord[b.manutencao?.prioridade ?? ''] ?? 0
        break
      }
      case 'servicos':    va = a.manutencao?.servicos?.length ?? 0; vb = b.manutencao?.servicos?.length ?? 0; break
      default: return 0
    }
    if (va < vb) return dir === 'asc' ? -1 : 1
    if (va > vb) return dir === 'asc' ? 1 : -1
    return 0
  })
}

export default function Dashboard() {
  const [frota, setFrota] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortCol, setSortCol] = useState('status')
  const [sortDir, setSortDir] = useState('desc')

  const fetchAll = async () => {
    setLoading(true)
    try {
      const frotaRes = await axios.get(`${API}/frota-status`)
      setFrota(frotaRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const sorted = sortFrota(frota, sortCol, sortDir)
  const emManutencao = frota.filter(v => v.em_manutencao).length
  const emOperacao = frota.filter(v => !v.em_manutencao).length

  return (
    <div className="space-y-5">
      {/* Status da Frota */}
      <div className="rounded-lg shadow-sm border border-gray-200 overflow-hidden">

        {/* Header gradiente */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-white font-bold text-sm">
            <Car className="w-5 h-5" /> Status da Frota
          </span>
          <button onClick={fetchAll} className="text-blue-200 hover:text-white transition-colors" title="Atualizar">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-3 divide-x divide-gray-200 border-b border-gray-200">
          <div className="flex items-center gap-3 px-5 py-3 bg-gray-50">
            <div className="p-2 rounded-full bg-blue-100">
              <Car className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total de Veículos</p>
              <p className="text-2xl font-extrabold text-gray-800">{frota.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-3 bg-orange-50">
            <div className="p-2 rounded-full bg-orange-200">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-orange-700 font-medium">Em Manutenção</p>
              <p className="text-2xl font-extrabold text-orange-600">{emManutencao}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-5 py-3 bg-green-50">
            <div className="p-2 rounded-full bg-green-200">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-green-700 font-medium">Em Operação</p>
              <p className="text-2xl font-extrabold text-green-600">{emOperacao}</p>
            </div>
          </div>
        </div>

        {/* Barra de percentual */}
        {frota.length > 0 && (
          <div className="px-4 py-2 bg-white border-b border-gray-100 flex items-center gap-2">
            <span className="text-xs text-gray-400 w-20 shrink-0">Disponibilidade</span>
            <div className="flex-1 rounded-full overflow-hidden h-2.5 bg-gray-100">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${(emOperacao / frota.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-green-600 w-10 text-right">
              {Math.round((emOperacao / frota.length) * 100)}%
            </span>
          </div>
        )}

        {/* Tabela */}
        <div className="overflow-x-auto bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                {[
                  { col: 'placa',      label: 'Placa',        cls: 'py-2 pl-4 pr-3 text-left' },
                  { col: 'descricao',  label: 'Veículo',      cls: 'px-3 py-2 text-left' },
                  { col: 'status',     label: 'Status',       cls: 'px-3 py-2 text-center' },
                  { col: 'os',         label: 'OS',           cls: 'px-3 py-2 text-left' },
                  { col: 'dt_inicio',  label: 'Dt. Início',   cls: 'px-3 py-2 text-left' },
                  { col: 'dt_previsao',label: 'Previsão',     cls: 'px-3 py-2 text-left' },
                  { col: 'responsavel',label: 'Responsável',  cls: 'px-3 py-2 text-left' },
                  { col: 'prioridade', label: 'Prioridade',   cls: 'px-3 py-2 text-left' },
                  { col: 'servicos',   label: 'Serviços',     cls: 'px-3 py-2 text-left' },
                  { col: '_ver',       label: '',             cls: 'px-3 py-2 text-center w-8' },
                ].map(({ col, label, cls }) => (
                  <th key={col}
                    onClick={() => col !== '_ver' && handleSort(col)}
                    className={`${cls} text-gray-600 font-semibold select-none transition-colors ${col !== '_ver' ? 'cursor-pointer hover:bg-gray-200' : ''}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      {col !== '_ver' && <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400">
                  <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Carregando...
                </td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-gray-400">Nenhum veículo cadastrado.</td></tr>
              ) : (
                sorted.map(v => <VeiculoRow key={v.id} v={v} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
