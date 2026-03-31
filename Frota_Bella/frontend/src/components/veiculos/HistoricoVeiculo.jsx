import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Car, Wrench, DollarSign, ChevronDown, ChevronRight,
  CheckCircle, Clock, XCircle, AlertTriangle, BarChart2, TrendingUp,
} from 'lucide-react'

const API = 'http://localhost:8000/api'

function fmtVal(v) {
  if (!v && v !== 0) return '—'
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDt(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('pt-BR')
}

function fmtKm(km) {
  if (!km) return '-'
  return Number(km).toLocaleString('pt-BR') + ' km'
}

const STATUS_BADGE = {
  'Finalizada':   'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'Em Andamento': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'Cancelada':    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}
const STATUS_SRV = {
  'Finalizado':   'bg-green-500 text-white',
  'Em Andamento': 'bg-blue-500 text-white',
  'Cancelado':    'bg-red-500 text-white',
}
const TIPO_BADGE = {
  'Corretiva':  'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'Preventiva': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
}
const PRIO_BADGE = {
  'Alta':  'text-red-600 dark:text-red-400 font-bold',
  'Média': 'text-yellow-600 dark:text-yellow-400 font-semibold',
  'Baixa': 'text-gray-500 dark:text-gray-400',
}

function KpiCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
      </div>
    </div>
  )
}

function BarChartCusto({ dados }) {
  const max = Math.max(...dados.map(d => d.valor), 1)
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-blue-500" /> Custo por Mês (últimos 12 meses)
      </h3>
      <div className="flex items-end gap-1 h-28">
        {dados.map(d => (
          <div key={d.key} className="flex-1 flex flex-col items-center justify-end h-full gap-0.5">
            {d.valor > 0 && (
              <span className="text-[9px] text-gray-500 dark:text-gray-400 text-center leading-tight whitespace-nowrap">
                {fmtVal(d.valor).replace('R$ ', '')}
              </span>
            )}
            <div
              className="w-full rounded-t bg-blue-500 dark:bg-blue-600 min-h-[2px] transition-all"
              style={{ height: `${Math.max((d.valor / max) * 80, d.valor > 0 ? 4 : 2)}px` }}
            />
            <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5 truncate w-full text-center">
              {d.label.slice(0, 5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TopPartes({ dados }) {
  if (!dados.length) return null
  const max = Math.max(...dados.map(d => d.valor), 1)
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-orange-500" /> Top Partes por Custo
      </h3>
      <div className="space-y-2">
        {dados.map((d, i) => (
          <div key={i}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-gray-700 dark:text-gray-300 truncate max-w-[60%]">{d.parte}</span>
              <span className="font-semibold text-gray-700 dark:text-gray-200">{fmtVal(d.valor)}</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-400 rounded-full"
                style={{ width: `${(d.valor / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TipoSplit({ custo_por_tipo }) {
  const tipos = Object.entries(custo_por_tipo)
  if (!tipos.length) return null
  const total = tipos.reduce((s, [, v]) => s + v, 0)
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
        Custo por Tipo de Serviço
      </h3>
      <div className="space-y-2">
        {tipos.map(([tipo, valor]) => (
          <div key={tipo}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${TIPO_BADGE[tipo] || 'bg-gray-100 text-gray-600'}`}>{tipo}</span>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                {fmtVal(valor)} &nbsp;
                <span className="text-gray-400">({total > 0 ? Math.round((valor / total) * 100) : 0}%)</span>
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${tipo === 'Corretiva' ? 'bg-orange-400' : 'bg-sky-400'}`}
                style={{ width: `${total > 0 ? (valor / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ManutencaoRow({ man }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <tr
        className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 cursor-pointer transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <td className="px-3 py-2 w-6">
          {open
            ? <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
            : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
        </td>
        <td className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">#{man.id}</td>
        <td className="px-3 py-2">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[man.status] || 'bg-gray-100 text-gray-600'}`}>
            {man.status || '-'}
          </span>
        </td>
        <td className="px-3 py-2">
          {man.tipo && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${TIPO_BADGE[man.tipo] || 'bg-gray-100 text-gray-600'}`}>
              {man.tipo}
            </span>
          )}
        </td>
        <td className={`px-3 py-2 text-xs ${PRIO_BADGE[man.prioridade] || 'text-gray-500'}`}>{man.prioridade || '-'}</td>
        <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">{fmtDt(man.dt_inicio)}</td>
        <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">{fmtDt(man.dt_termino)}</td>
        <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">{fmtKm(man.km_entrada)}</td>
        <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-300">{man.responsavel_manutencao || '-'}</td>
        <td className="px-3 py-2 text-xs text-right font-semibold text-gray-700 dark:text-gray-200">{fmtVal(man.total_custo)}</td>
        <td className="px-3 py-2 text-xs text-center text-gray-500 dark:text-gray-400">{man.servicos.length}</td>
      </tr>

      {open && (
        <tr className="bg-blue-50/60 dark:bg-blue-950/20">
          <td colSpan={11} className="px-6 py-3">
            {man.servicos_solicitados && (
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                <span className="font-semibold">Solicitado:</span> {man.servicos_solicitados}
              </p>
            )}
            {man.observacao && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 italic">
                <span className="font-semibold not-italic">Obs:</span> {man.observacao}
              </p>
            )}
            {man.servicos.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nenhum serviço registrado.</p>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200">
                    <th className="px-3 py-1.5 text-left">Parte</th>
                    <th className="px-3 py-1.5 text-left">Serviço</th>
                    <th className="px-3 py-1.5 text-left">Tipo</th>
                    <th className="px-3 py-1.5 text-left">Responsável</th>
                    <th className="px-3 py-1.5 text-left">Descrição</th>
                    <th className="px-3 py-1.5 text-left">Dt. Serviço</th>
                    <th className="px-3 py-1.5 text-center">Status</th>
                    <th className="px-3 py-1.5 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {man.servicos.map((s, i) => (
                    <tr key={s.id} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-blue-50 dark:bg-blue-900/10'}>
                      <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">{s.parte_veiculo || '-'}</td>
                      <td className="px-3 py-1.5 font-semibold text-gray-800 dark:text-gray-200">{s.servico || '-'}</td>
                      <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">{s.tipo_uso || '-'}</td>
                      <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">{s.pessoa_responsavel || '-'}</td>
                      <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">{s.descricao || '-'}</td>
                      <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">{fmtDt(s.dt_servico)}</td>
                      <td className="px-3 py-1.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_SRV[s.status] || 'bg-gray-200 text-gray-600'}`}>
                          {s.status || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold text-gray-700 dark:text-gray-300">{fmtVal(s.valor)}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-700">
                    <td colSpan={7} className="px-3 py-1.5 text-right font-bold text-blue-800 dark:text-blue-300">Total:</td>
                    <td className="px-3 py-1.5 text-right font-bold text-blue-800 dark:text-blue-300">{fmtVal(man.total_custo)}</td>
                  </tr>
                </tbody>
              </table>
            )}
            <div className="mt-2 flex gap-4 text-xs text-gray-500 dark:text-gray-400">
              <Link
                to={`/manutencoes/${man.id}/editar`}
                className="hover:text-blue-600 dark:hover:text-blue-400 underline"
                onClick={e => e.stopPropagation()}
              >
                Editar manutenção
              </Link>
              {man.arquivos_count > 0 && (
                <Link
                  to={`/manutencoes/${man.id}/arquivos`}
                  className="hover:text-blue-600 dark:hover:text-blue-400 underline"
                  onClick={e => e.stopPropagation()}
                >
                  Ver arquivos ({man.arquivos_count})
                </Link>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function HistoricoVeiculo() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')

  useEffect(() => {
    setLoading(true)
    axios.get(`${API}/veiculos/${id}/historico`)
      .then(r => setData(r.data))
      .catch(() => setErro('Erro ao carregar histórico do veículo.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (erro) return (
    <div className="p-6 text-red-500 flex items-center gap-2">
      <AlertTriangle className="w-5 h-5" /> {erro}
    </div>
  )

  const { veiculo, kpis, custo_por_mes, top_partes, manutencoes } = data

  const mansFiltradas = manutencoes.filter(m => {
    if (filtroStatus && m.status !== filtroStatus) return false
    if (filtroTipo && m.tipo !== filtroTipo) return false
    return true
  })

  const statusIcons = {
    'Finalizada': <CheckCircle className="w-4 h-4 text-green-500" />,
    'Em Andamento': <Clock className="w-4 h-4 text-blue-500" />,
    'Cancelada': <XCircle className="w-4 h-4 text-red-500" />,
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/veiculos')}
          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-500" />
            Histórico — {veiculo.placa}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {[veiculo.marca, veiculo.modelo, veiculo.ano].filter(Boolean).join(' · ')}
            {veiculo.tipo && ` · ${veiculo.tipo}`}
            {veiculo.grupo && ` · ${veiculo.grupo}`}
            {veiculo.chassi && ` · Chassi: ${veiculo.chassi}`}
            {veiculo.ultimo_km && ` · KM Atual: ${fmtKm(veiculo.ultimo_km)}`}
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Wrench} label="Total de Manutenções" value={kpis.total_manutencoes} color="bg-blue-500" />
        <KpiCard icon={DollarSign} label="Custo Total" value={fmtVal(kpis.total_custo)} color="bg-green-500" />
        <KpiCard icon={CheckCircle} label="Serviços Realizados" value={kpis.total_servicos} color="bg-purple-500" />
        <KpiCard
          icon={Clock}
          label="Em Andamento"
          value={kpis.status_count['Em Andamento'] || 0}
          color="bg-orange-500"
        />
      </div>

      {/* Status summary pills */}
      {Object.entries(kpis.status_count).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(kpis.status_count).map(([s, count]) => (
            <div key={s} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${STATUS_BADGE[s] || 'bg-gray-100 text-gray-600'}`}>
              {statusIcons[s]} {s}: {count}
            </div>
          ))}
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <BarChartCusto dados={custo_por_mes} />
        </div>
        <div className="space-y-3">
          <TopPartes dados={top_partes} />
          <TipoSplit custo_por_tipo={kpis.custo_por_tipo} />
        </div>
      </div>

      {/* Tabela de manutenções */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Manutenções ({mansFiltradas.length})
          </h3>
          <div className="flex items-center gap-2">
            <select
              className="text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option>Em Andamento</option>
              <option>Finalizada</option>
              <option>Cancelada</option>
            </select>
            <select
              className="text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
            >
              <option value="">Todos os tipos</option>
              <option>Corretiva</option>
              <option>Preventiva</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 font-semibold">
                <th className="px-3 py-2 w-6" />
                <th className="px-3 py-2 text-left">#</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Prioridade</th>
                <th className="px-3 py-2 text-left">Dt. Início</th>
                <th className="px-3 py-2 text-left">Dt. Término</th>
                <th className="px-3 py-2 text-left">KM</th>
                <th className="px-3 py-2 text-left">Oficina/Prestador</th>
                <th className="px-3 py-2 text-right">Custo</th>
                <th className="px-3 py-2 text-center">Serviços</th>
              </tr>
            </thead>
            <tbody>
              {mansFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                    Nenhuma manutenção encontrada.
                  </td>
                </tr>
              ) : (
                mansFiltradas.map(m => <ManutencaoRow key={m.id} man={m} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
