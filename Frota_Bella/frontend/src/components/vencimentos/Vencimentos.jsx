import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  Bell, RefreshCw, Car, Wrench, AlertTriangle, CheckCircle, Clock,
  ArrowUp, ArrowDown, ArrowUpDown, Search, X, Users,
} from 'lucide-react'

const API = 'http://localhost:8000/api'

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />
  return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
}

const statusConfig = {
  Vencido:  { bg: 'bg-red-100 text-red-700 border border-red-300',    icon: AlertTriangle, dot: 'bg-red-500' },
  Próximo:  { bg: 'bg-orange-100 text-orange-700 border border-orange-300', icon: Clock, dot: 'bg-orange-400' },
  Ok:       { bg: 'bg-green-100 text-green-700 border border-green-300', icon: CheckCircle, dot: 'bg-green-500' },
}

function fmtKm(km) {
  if (km == null) return '-'
  return Number(km).toLocaleString('pt-BR') + ' km'
}

function fmtDate(dt) {
  if (!dt) return '-'
  return new Date(dt + 'T00:00:00').toLocaleDateString('pt-BR')
}

function StatusBadge({ status }) {
  if (!status) return <span className="text-gray-400 text-xs">-</span>
  const cfg = statusConfig[status] || statusConfig.Ok
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg}`}>
      <Icon className="w-3 h-3" />{status}
    </span>
  )
}

export default function Vencimentos() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState(new Set())
  const [sortField, setSortField] = useState('status')
  const [sortDir, setSortDir] = useState('asc')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/vencimentos`)
      setItems(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const toggleStatus = (status) => {
    setFilterStatus(prev => {
      const next = new Set(prev)
      if (status === 'Todos') return new Set()
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  const filtered = items
    .filter(i => filterStatus.size === 0 || filterStatus.has(i.status))
    .filter(i => !search ||
      (i.veiculo_placa || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.servico || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.parte_veiculo || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.motorista_nome || '').toLowerCase().includes(search.toLowerCase())
    )

  const sorted = sortField
    ? [...filtered].sort((a, b) => {
        const STATUS_ORDER = { Vencido: 0, Próximo: 1, Ok: 2 }
        if (sortField === 'status') {
          const oa = STATUS_ORDER[a.status] ?? 3
          const ob = STATUS_ORDER[b.status] ?? 3
          return sortDir === 'asc' ? oa - ob : ob - oa
        }
        const va = a[sortField] ?? ''; const vb = b[sortField] ?? ''
        return sortDir === 'asc'
          ? String(va).localeCompare(String(vb), 'pt-BR', { numeric: true })
          : String(vb).localeCompare(String(va), 'pt-BR', { numeric: true })
      })
    : filtered

  const counts = {
    total: items.length,
    vencidos: items.filter(i => i.status === 'Vencido').length,
    proximos: items.filter(i => i.status === 'Próximo').length,
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-lg shadow px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-blue-200" />
          <div>
            <h1 className="text-white font-bold text-base leading-tight">Vencimentos de Serviços</h1>
            <p className="text-blue-200 text-xs">Monitore os próximos vencimentos por KM e data</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-3 text-xs">
            <div className="bg-red-500/80 rounded px-3 py-1.5 text-center">
              <div className="text-white font-bold text-lg leading-none">{counts.vencidos}</div>
              <div className="text-red-200">Vencidos</div>
            </div>
            <div className="bg-orange-400/80 rounded px-3 py-1.5 text-center">
              <div className="text-white font-bold text-lg leading-none">{counts.proximos}</div>
              <div className="text-orange-100">Próximos</div>
            </div>
            <div className="bg-blue-700 rounded px-3 py-1.5 text-center">
              <div className="text-white font-bold text-lg leading-none">{counts.total}</div>
              <div className="text-blue-300">Total</div>
            </div>
          </div>
          <button onClick={fetchData} className="text-blue-200 hover:text-white transition-colors" title="Atualizar">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700 px-3 py-2 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 flex-1 min-w-40">
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <input className="flex-1 text-xs outline-none dark:text-gray-100 dark:placeholder-gray-400 bg-transparent" placeholder="Buscar por veículo, serviço ou parte..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')}><X className="w-3 h-3 text-gray-400" /></button>}
        </div>
        <div className="flex items-center gap-1.5">
          {[
            { label: 'Todos', active: filterStatus.size === 0, cls: 'bg-blue-600 text-white', inactiveCls: 'bg-gray-100 text-gray-500 hover:bg-gray-200' },
            { label: 'Vencido', active: filterStatus.has('Vencido'), cls: 'bg-red-500 text-white', inactiveCls: 'bg-red-50 text-red-400 hover:bg-red-100 border border-red-200' },
            { label: 'Próximo', active: filterStatus.has('Próximo'), cls: 'bg-orange-400 text-white', inactiveCls: 'bg-orange-50 text-orange-400 hover:bg-orange-100 border border-orange-200' },
            { label: 'Ok', active: filterStatus.has('Ok'), cls: 'bg-green-500 text-white', inactiveCls: 'bg-green-50 text-green-500 hover:bg-green-100 border border-green-200' },
          ].map(({ label, active, cls, inactiveCls }) => (
            <button key={label} onClick={() => toggleStatus(label)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${active ? cls : inactiveCls}`}>
              {label}
            </button>
          ))}
        </div>
        {(search || filterStatus.size > 0) && (
          <button onClick={() => { setSearch(''); setFilterStatus(new Set()) }}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
            <X className="w-3 h-3" /> Limpar
          </button>
        )}
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{sorted.length} registro(s)</span>
      </div>

      {/* Tabela */}
      <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/40">
              {[
                ['status', 'Status'],
                ['tipo_vencimento', 'Tipo'],
                ['veiculo_placa', 'Veículo / Motorista'],
                ['ultimo_km', 'KM Atual'],
                ['parte_veiculo', 'Parte Veículo'],
                ['servico', 'Serviço'],
                ['proximo_km_validade', 'Próx. KM Val.'],
                ['km_restante', 'KM Restante'],
                ['proxima_dt_validade', 'Próx. Dt. Val.'],
                ['dt_restante_dias', 'Dias Restantes'],
                ['manutencao_id', 'Manutenção'],
              ].map(([f, l]) => (
                <th key={f} className="px-3 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold whitespace-nowrap cursor-pointer select-none hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  onClick={() => handleSort(f)}>
                  <span className="flex items-center gap-1">{l} <SortIcon field={f} sortField={sortField} sortDir={sortDir} /></span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="text-center py-10 text-gray-400">
                <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />Carregando...
              </td></tr>
            ) : sorted.length === 0 ? (
              <tr><td colSpan={11} className="text-center py-10 text-gray-400">
                Nenhum vencimento encontrado.
              </td></tr>
            ) : sorted.map((item, idx) => {
              const rowBg = item.status === 'Vencido' ? 'bg-red-50 dark:bg-red-900/20' : item.status === 'Próximo' ? 'bg-orange-50 dark:bg-orange-900/20' : idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'
              const isMotorista = item.tipo_vencimento === 'CNH' || item.tipo_vencimento === 'Toxicológico'
              const tipoCfg = {
                'Serviço':      'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
                'CNH':          'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
                'Toxicológico': 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
              }
              return (
                <tr key={item.row_key || item.servico_id} className={`border-b border-gray-100 dark:border-gray-700 hover:brightness-95 transition-all ${rowBg}`}>
                  <td className="px-3 py-2"><StatusBadge status={item.status} /></td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${tipoCfg[item.tipo_vencimento] || tipoCfg['Serviço']}`}>
                      {item.tipo_vencimento || 'Serviço'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {isMotorista ? (
                      <div>
                        <div className="flex items-center gap-1 font-medium text-purple-700 dark:text-purple-400">
                          <Users className="w-3 h-3" />{item.motorista_nome}
                        </div>
                        {item.motorista_codigo && <div className="text-gray-400 dark:text-gray-500 text-[10px]">{item.motorista_codigo}</div>}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-1 font-medium text-blue-700 dark:text-blue-400">
                          <Car className="w-3 h-3" />{item.veiculo_placa}
                        </div>
                        {item.veiculo_descricao && <div className="text-gray-400 dark:text-gray-500 text-[10px]">{item.veiculo_descricao}</div>}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{fmtKm(item.ultimo_km)}</td>
                  <td className="px-3 py-2">{item.parte_veiculo || '-'}</td>
                  <td className="px-3 py-2 font-medium">{item.servico || '-'}</td>
                  <td className="px-3 py-2 tabular-nums">{fmtKm(item.proximo_km_validade)}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {item.km_restante != null ? (
                      <span className={`font-semibold ${item.km_restante <= 0 ? 'text-red-600' : item.km_restante <= 5000 ? 'text-orange-500' : 'text-green-600'}`}>
                        {item.km_restante <= 0 ? `${fmtKm(Math.abs(item.km_restante))} vencido` : fmtKm(item.km_restante)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(item.proxima_dt_validade)}</td>
                  <td className="px-3 py-2">
                    {item.dt_restante_dias != null ? (
                      <span className={`font-semibold ${item.dt_restante_dias < 0 ? 'text-red-600' : item.dt_restante_dias <= 30 ? 'text-orange-500' : 'text-green-600'}`}>
                        {item.dt_restante_dias < 0 ? `${Math.abs(item.dt_restante_dias)}d vencido` : `${item.dt_restante_dias}d`}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2">
                    {item.manutencao_id ? (
                      <Link to={`/manutencoes/${item.manutencao_id}/editar`}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium">
                        <Wrench className="w-3 h-3" />#{item.manutencao_id}
                      </Link>
                    ) : isMotorista ? (
                      <Link to="/motoristas"
                        className="flex items-center gap-1 text-purple-600 hover:text-purple-800 font-medium">
                        <Users className="w-3 h-3" />Ver
                      </Link>
                    ) : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
