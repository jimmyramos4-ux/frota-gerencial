import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  Wrench, Car, RefreshCw, ChevronDown, ChevronUp, ChevronsUpDown,
  AlertTriangle, CheckCircle2, Eye, Bell, TrendingUp, DollarSign,
  ClipboardList, Clock, CheckCheck, BarChart2,
} from 'lucide-react'

const API = 'http://localhost:8000/api'

// ── Formatadores ──────────────────────────────────────────────────────────────

function fmt(dt) {
  if (!dt) return '-'
  return new Date(dt).toLocaleDateString('pt-BR')
}

function fmtCurrency(v) {
  if (!v) return 'R$ 0,00'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// ── Badges ────────────────────────────────────────────────────────────────────

const prioridadeBadge = {
  Alta: 'bg-red-100 text-red-700',
  Média: 'bg-orange-100 text-orange-700',
  Baixa: 'bg-green-100 text-green-700',
}

// ── Gráfico de barras mensais (CSS flex — 100% responsivo) ───────────────────

function BarChartMensal({ data }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => Math.max(d.corretiva, d.preventiva)), 1)

  return (
    <div className="w-full flex flex-col flex-1" style={{ minHeight: 140 }}>
      {/* Área das barras — flex-1 para preencher o espaço disponível */}
      <div className="flex items-end gap-1 w-full flex-1">
        {data.map((d, i) => {
          const isCurrent = i === data.length - 1
          const pC = d.corretiva > 0 ? Math.max((d.corretiva / max) * 100, 4) : 0
          const pP = d.preventiva > 0 ? Math.max((d.preventiva / max) * 100, 4) : 0
          return (
            <div key={d.mes} className="flex-1 flex flex-col justify-end items-center"
              style={{ height: '100%', padding: '0 2px' }}>
              <div className="flex items-end justify-center gap-px w-full" style={{ height: '100%' }}>
                {/* Corretiva */}
                <div className="flex-1 flex flex-col items-center justify-end" style={{ height: '100%' }}>
                  {d.corretiva > 0 && (
                    <span style={{ fontSize: 10, color: '#ea580c', fontWeight: 700, lineHeight: 1.2 }}>{d.corretiva}</span>
                  )}
                  <div style={{
                    width: '100%', height: `${pC}%`,
                    background: isCurrent ? '#ea580c' : '#f97316',
                    borderRadius: '2px 2px 0 0', opacity: 0.9,
                  }} />
                </div>
                {/* Preventiva */}
                <div className="flex-1 flex flex-col items-center justify-end" style={{ height: '100%' }}>
                  {d.preventiva > 0 && (
                    <span style={{ fontSize: 10, color: '#2563eb', fontWeight: 700, lineHeight: 1.2 }}>{d.preventiva}</span>
                  )}
                  <div style={{
                    width: '100%', height: `${pP}%`,
                    background: isCurrent ? '#2563eb' : '#60a5fa',
                    borderRadius: '2px 2px 0 0', opacity: 0.9,
                  }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {/* Linha base */}
      <div className="w-full border-t border-gray-200 dark:border-gray-600 shrink-0" />
      {/* Labels dos meses */}
      <div className="flex gap-1 w-full mt-1 shrink-0">
        {data.map((d, i) => (
          <div key={d.mes} className="flex-1 text-center truncate"
            style={{ fontSize: 7, color: i === data.length - 1 ? 'var(--chart-label)' : 'var(--chart-label-muted)', fontWeight: i === data.length - 1 ? 600 : 400 }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Ranking de veículos ───────────────────────────────────────────────────────

function RankingVeiculos({ data }) {
  if (!data?.length) return <p className="text-xs text-gray-400 py-4 text-center">Sem dados</p>
  const max = data[0]?.total || 1
  return (
    <div className="space-y-2">
      {data.map((v, i) => (
        <div key={v.veiculo_id} className="flex items-center gap-2">
          <span className={`text-xs font-bold w-5 text-center shrink-0 ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-300'}`}>
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{v.placa}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0 ml-2">{v.total}</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${(v.total / max) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Custo por veículo ─────────────────────────────────────────────────────────

function CustoVeiculos({ data }) {
  if (!data?.length) return <p className="text-xs text-gray-400 py-4 text-center">Sem custos registrados</p>
  const max = data[0]?.total_custo || 1
  return (
    <div className="space-y-2">
      {data.map((v, i) => (
        <div key={v.veiculo_id} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500 w-5 text-center shrink-0">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{v.placa}</span>
              <span className="text-xs font-medium text-green-700 shrink-0 ml-2">{fmtCurrency(v.total_custo)}</span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${(v.total_custo / max) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Alertas de vencimentos ────────────────────────────────────────────────────

function VencimentosAlerta({ items }) {
  const criticos = items.filter(i => i.status === 'Vencido' || i.status === 'Próximo')
  if (!criticos.length) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
        <p className="text-xs text-gray-500 font-medium">Todos os serviços em dia</p>
      </div>
    )
  }
  return (
    <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
      {criticos.map((item, idx) => {
        const isVencido = item.status === 'Vencido'
        return (
          <div key={idx} className={`rounded-lg px-3 py-2 border text-xs ${isVencido ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertTriangle className={`w-3 h-3 shrink-0 ${isVencido ? 'text-red-500' : 'text-orange-400'}`} />
                <span className={`font-bold shrink-0 ${isVencido ? 'text-red-600' : 'text-orange-600'}`}>{item.veiculo_placa}</span>
                <span className="text-gray-500 truncate">{item.servico}</span>
              </div>
              <Link to="/vencimentos"
                className={`shrink-0 font-semibold underline text-[10px] ${isVencido ? 'text-red-500' : 'text-orange-500'}`}>
                ver
              </Link>
            </div>
            <div className={`mt-0.5 ${isVencido ? 'text-red-500' : 'text-orange-500'} font-medium`}>
              {item.km_restante != null && (
                <span>{item.km_restante <= 0 ? `${Math.abs(item.km_restante).toLocaleString('pt-BR')} km vencido` : `${item.km_restante.toLocaleString('pt-BR')} km restantes`}</span>
              )}
              {item.km_restante != null && item.dt_restante_dias != null && <span className="mx-1">·</span>}
              {item.dt_restante_dias != null && (
                <span>{item.dt_restante_dias < 0 ? `${Math.abs(item.dt_restante_dias)}d vencido` : `${item.dt_restante_dias}d restantes`}</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Gráfico barras solicitações por mês ──────────────────────────────────────

function BarChartSolicitacoes({ data }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d.total), 1)
  return (
    <div className="w-full flex flex-col flex-1" style={{ minHeight: 80 }}>
      {/* Legenda */}
      <div className="flex items-center gap-3 mb-1 shrink-0">
        <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
          <span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:'#a78bfa' }} /> Total
        </span>
        <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
          <span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:'#22c55e' }} /> Finalizadas
        </span>
      </div>
      <div className="flex items-end gap-1 w-full flex-1">
        {data.map((d, i) => {
          const isCurrent = i === data.length - 1
          const pT = d.total > 0 ? Math.max((d.total / max) * 100, 4) : 0
          const pF = d.finalizadas > 0 ? Math.max((d.finalizadas / max) * 100, 4) : 0
          return (
            <div key={d.mes} className="flex-1 flex items-end gap-0.5" style={{ height: '100%', padding: '0 1px' }}>
              {/* Barra total */}
              <div className="flex-1 flex flex-col justify-end items-center" style={{ height: '100%' }}>
                {d.total > 0 && <span style={{ fontSize: 9, color: isCurrent ? '#7c3aed' : '#8b5cf6', fontWeight: 700, lineHeight: 1.2 }}>{d.total}</span>}
                <div style={{ width: '100%', height: `${pT}%`, background: isCurrent ? '#7c3aed' : '#a78bfa', borderRadius: '2px 2px 0 0', opacity: 0.9 }} />
              </div>
              {/* Barra finalizadas */}
              <div className="flex-1 flex flex-col justify-end items-center" style={{ height: '100%' }}>
                {d.finalizadas > 0 && <span style={{ fontSize: 9, color: '#16a34a', fontWeight: 700, lineHeight: 1.2 }}>{d.finalizadas}</span>}
                <div style={{ width: '100%', height: `${pF}%`, background: '#22c55e', borderRadius: '2px 2px 0 0', opacity: 0.9 }} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="w-full border-t border-gray-200 dark:border-gray-600 shrink-0" />
      <div className="flex gap-1 w-full mt-1 shrink-0">
        {data.map((d, i) => (
          <div key={d.mes} className="flex-1 text-center truncate"
            style={{ fontSize: 7, color: i === data.length - 1 ? 'var(--chart-label)' : 'var(--chart-label-muted)', fontWeight: i === data.length - 1 ? 600 : 400 }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Ranking veículos solicitações ─────────────────────────────────────────────

function RankingSolicitacoes({ data }) {
  if (!data?.length) return <p className="text-xs text-gray-400 py-4 text-center">Sem dados</p>
  const max = data[0]?.total || 1
  const priorColor = { Crítico: 'bg-red-500', Alta: 'bg-orange-400', Média: 'bg-yellow-400', Baixa: 'bg-green-400' }
  return (
    <div className="space-y-2">
      {data.map((v, i) => (
        <div key={v.placa} className="flex items-center gap-2">
          <span className={`text-xs font-bold w-5 text-center shrink-0 ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-300'}`}>{i + 1}</span>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{v.placa}</span>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {v.abertas > 0 && <span className="text-[10px] text-orange-600 font-bold">{v.abertas} aberta{v.abertas > 1 ? 's' : ''}</span>}
                <span className="text-xs text-gray-500 dark:text-gray-400">/ {v.total}</span>
              </div>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${(v.total / max) * 100}%` }} />
            </div>
          </div>
          {v.topPrior && <span className={`w-2 h-2 rounded-full shrink-0 ${priorColor[v.topPrior] || 'bg-gray-300'}`} title={v.topPrior} />}
        </div>
      ))}
    </div>
  )
}

// ── Linha da frota ────────────────────────────────────────────────────────────

function VeiculoRow({ v }) {
  const [open, setOpen] = useState(false)
  const manut = v.manutencao

  return (
    <>
      <tr
        onClick={() => v.em_manutencao && setOpen(o => !o)}
        className={`border-b text-xs transition-colors ${
          v.em_manutencao
            ? 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 cursor-pointer'
            : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/20'
        }`}
      >
        <td className="py-2 pl-0 pr-3 whitespace-nowrap">
          <div className="flex items-center gap-0">
            <div className={`w-1 self-stretch rounded-l ${v.em_manutencao ? 'bg-orange-400' : 'bg-green-400'}`} />
            <div className="pl-3 flex items-center gap-2">
              {v.em_manutencao
                ? <ChevronDown className={`w-3.5 h-3.5 text-orange-500 transition-transform ${open ? '' : '-rotate-90'}`} />
                : <span className="w-3.5 h-3.5" />}
              <span className="font-bold text-blue-700 dark:text-blue-400 tracking-wide">{v.placa}</span>
            </div>
          </div>
        </td>
        <td className="px-3 py-2">
          <div className="font-semibold text-gray-800 dark:text-gray-200">{v.descricao}</div>
          <div className="text-gray-400 dark:text-gray-500">{v.tipo}{v.ano ? ` · ${v.ano}` : ''}</div>
        </td>
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
        <td className="px-3 py-2 whitespace-nowrap">
          {manut
            ? <span className="font-semibold text-orange-700 bg-orange-100 px-1.5 py-0.5 rounded">#{manut.id}</span>
            : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-3 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
          {manut?.dt_inicio ? fmt(manut.dt_inicio) : <span className="text-gray-300 dark:text-gray-600">—</span>}
        </td>
        <td className="px-3 py-2 whitespace-nowrap">
          {manut?.dt_previsao
            ? <span className="text-orange-700 font-medium">{fmt(manut.dt_previsao)}</span>
            : <span className="text-gray-300 dark:text-gray-600">—</span>}
        </td>
        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
          {manut?.responsavel || <span className="text-gray-300 dark:text-gray-600">—</span>}
        </td>
        <td className="px-3 py-2">
          {manut?.prioridade
            ? <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${prioridadeBadge[manut.prioridade] || ''}`}>{manut.prioridade}</span>
            : <span className="text-gray-300">—</span>}
        </td>
        <td className="px-3 py-2">
          {manut?.servicos?.length > 0
            ? (
              <span className="inline-flex items-center gap-1 font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                <Wrench className="w-3 h-3" /> {manut.servicos.length}
              </span>
            )
            : <span className="text-gray-300">—</span>}
        </td>
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

      {open && manut && (
        <tr>
          <td colSpan={10} className="px-0 pb-0 pt-0 bg-orange-50 dark:bg-orange-900/10 border-b-2 border-orange-300">
            <div className="mx-4 mb-3 mt-1 rounded-lg border border-orange-300 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-2 text-xs text-white flex flex-wrap gap-x-5 gap-y-0.5 font-medium">
                <span><strong className="font-bold">Tipo:</strong> {manut.tipo || '-'}</span>
                <span><strong className="font-bold">Motorista:</strong> {manut.motorista || '-'}</span>
                <span><strong className="font-bold">Km:</strong> {manut.km_entrada?.toLocaleString('pt-BR') || '-'}</span>
                {manut.servicos_solicitados && (
                  <span><strong className="font-bold">Solicitado:</strong> {manut.servicos_solicitados}</span>
                )}
              </div>
              {manut.servicos.length === 0 ? (
                <div className="text-xs text-gray-400 px-4 py-3 bg-white dark:bg-gray-800">Nenhum serviço registrado.</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-orange-100 dark:bg-orange-900/30 text-orange-900 dark:text-orange-200 border-b border-orange-200">
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
                      <tr key={i} className={`border-t border-orange-100 ${i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-orange-50 dark:bg-orange-900/10'}`}>
                        <td className="px-4 py-1.5 text-gray-600 dark:text-gray-400">{s.parte_veiculo || '-'}</td>
                        <td className="px-4 py-1.5 font-semibold text-gray-800 dark:text-gray-200">{s.servico || '-'}</td>
                        <td className="px-4 py-1.5 text-gray-600 dark:text-gray-400">{s.tipo_uso || '-'}</td>
                        <td className="px-4 py-1.5 text-gray-600 dark:text-gray-400">{s.pessoa_responsavel || '-'}</td>
                        <td className="px-4 py-1.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            s.status === 'Finalizado' ? 'bg-green-500 text-white' :
                            s.status === 'Cancelado' ? 'bg-red-500 text-white' :
                            'bg-blue-500 text-white'}`}>
                            {s.status || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-1.5 text-right font-semibold text-gray-700 dark:text-gray-300">
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

// ── Dashboard principal ───────────────────────────────────────────────────────

// ── Helpers de data ───────────────────────────────────────────────────────────

function buildSolStats(items) {
  if (!items?.length) return null

  // Meses (últimos 12)
  const now = new Date()
  const meses = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    meses.push({
      mes: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      total: 0,
      finalizadas: 0,
    })
  }
  items.forEach(s => {
    if (!s.dt_solicitacao) return
    const mes = s.dt_solicitacao.slice(0, 7)
    const slot = meses.find(m => m.mes === mes)
    if (slot) {
      slot.total++
      if (s.status === 'Finalizada') slot.finalizadas++
    }
  })

  // Ranking por veículo
  const byVeiculo = {}
  items.forEach(s => {
    const placa = s.veiculo?.placa || '—'
    if (!byVeiculo[placa]) byVeiculo[placa] = { placa, total: 0, abertas: 0, prioridades: {} }
    byVeiculo[placa].total++
    if (['Aberta', 'Em Análise'].includes(s.status)) byVeiculo[placa].abertas++
    byVeiculo[placa].prioridades[s.prioridade] = (byVeiculo[placa].prioridades[s.prioridade] || 0) + 1
  })
  const priorOrd = { Crítico: 0, Alta: 1, Média: 2, Baixa: 3 }
  const rankingVeiculos = Object.values(byVeiculo)
    .map(v => ({ ...v, topPrior: Object.keys(v.prioridades).sort((a, b) => (priorOrd[a] ?? 9) - (priorOrd[b] ?? 9))[0] }))
    .sort((a, b) => b.total - a.total).slice(0, 8)

  // Totais
  const total = items.length
  const abertas = items.filter(s => ['Aberta', 'Em Análise'].includes(s.status)).length
  const finalizadas = items.filter(s => s.status === 'Finalizada').length
  const criticas = items.filter(s => s.prioridade === 'Crítico' && ['Aberta', 'Em Análise'].includes(s.status)).length

  // Tempo médio de resolução (dias) — apenas finalizadas
  const tempos = items
    .filter(s => s.status === 'Finalizada' && s.dt_solicitacao && s.updated_at)
    .map(s => {
      const d0 = new Date(s.dt_solicitacao); d0.setHours(0, 0, 0, 0)
      const d1 = new Date(s.updated_at); d1.setHours(0, 0, 0, 0)
      return Math.max(0, Math.floor((d1 - d0) / 86400000))
    })
  const tempoMedio = tempos.length ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : null

  // Por prioridade (abertas)
  const porPrior = ['Crítico', 'Alta', 'Média', 'Baixa'].map(p => ({
    label: p,
    total: items.filter(s => s.prioridade === p && ['Aberta', 'Em Análise'].includes(s.status)).length,
  })).filter(p => p.total > 0)

  return { meses, rankingVeiculos, total, abertas, finalizadas, criticas, tempoMedio, porPrior }
}

// ── Dashboard principal ───────────────────────────────────────────────────────

export default function Dashboard() {
  const [frota, setFrota] = useState([])
  const [stats, setStats] = useState(null)
  const [vencimentos, setVencimentos] = useState([])
  const [solicitacoes, setSolicitacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortCol, setSortCol] = useState('status')
  const [sortDir, setSortDir] = useState('desc')

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [frotaRes, statsRes, vencRes, solRes] = await Promise.all([
        axios.get(`${API}/frota-status`),
        axios.get(`${API}/dashboard-stats`),
        axios.get(`${API}/vencimentos`),
        axios.get(`${API}/solicitacoes`, { params: { per_page: 10000 } }),
      ])
      setFrota(frotaRes.data)
      setStats(statsRes.data)
      setVencimentos(vencRes.data)
      setSolicitacoes(solRes.data.items || [])
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

  const solStats = buildSolStats(solicitacoes)

  const sorted = sortFrota(frota, sortCol, sortDir)
  const emManutencao = frota.filter(v => v.em_manutencao).length
  const emOperacao = frota.filter(v => !v.em_manutencao).length
  const vencidos = vencimentos.filter(v => v.status === 'Vencido').length
  const proximos = vencimentos.filter(v => v.status === 'Próximo').length

  const totalCusto = stats?.custo_por_veiculo?.reduce((s, v) => s + v.total_custo, 0) || 0
  const totalMesAtual = stats?.manutencoes_por_mes?.slice(-1)[0]?.total || 0

  return (
    <div className="space-y-4">

      {/* ── Cards de resumo ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="p-2 rounded-full bg-blue-100">
            <Car className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Frota Total</p>
            <p className="text-2xl font-extrabold text-gray-800 dark:text-gray-100 leading-tight">{frota.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-gray-700 shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="p-2 rounded-full bg-orange-100">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </div>
          <div>
            <p className="text-[10px] text-orange-600 font-medium uppercase tracking-wide">Em Manutenção</p>
            <p className="text-2xl font-extrabold text-orange-600 leading-tight">{emManutencao}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-gray-700 shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="p-2 rounded-full bg-green-100">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <p className="text-[10px] text-green-600 font-medium uppercase tracking-wide">Em Operação</p>
            <p className="text-2xl font-extrabold text-green-600 leading-tight">{emOperacao}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-gray-700 shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="p-2 rounded-full bg-red-100">
            <Bell className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <p className="text-[10px] text-red-600 font-medium uppercase tracking-wide">Serviços Vencidos</p>
            <p className="text-2xl font-extrabold text-red-600 leading-tight">{vencidos}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-gray-700 shadow-sm px-4 py-3 flex items-center gap-3">
          <div className="p-2 rounded-full bg-yellow-100">
            <Bell className="w-4 h-4 text-yellow-500" />
          </div>
          <div>
            <p className="text-[10px] text-yellow-600 font-medium uppercase tracking-wide">Serviços a Vencer</p>
            <p className="text-2xl font-extrabold text-yellow-600 leading-tight">{proximos}</p>
          </div>
        </div>
      </div>

      {/* ── Gráfico + Alertas ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Gráfico manutenções por mês */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Manutenções por Mês</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">(últimos 12 meses)</span>
            </div>
            <div className="flex items-center gap-4 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange-400 inline-block" />Corretiva</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 inline-block" />Preventiva</span>
              <span className="text-gray-400 dark:text-gray-500">|</span>
              <span className="text-gray-500 dark:text-gray-400">Mês atual: <strong className="text-gray-700 dark:text-gray-200">{totalMesAtual}</strong></span>
              <span className="text-gray-500 dark:text-gray-400">Total: <strong className="text-gray-700 dark:text-gray-200">{stats?.manutencoes_por_mes?.reduce((s, m) => s + m.total, 0) || 0}</strong></span>
            </div>
          </div>
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />Carregando...
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <BarChartMensal data={stats?.manutencoes_por_mes || []} />
            </div>
          )}
        </div>

        {/* Alertas de vencimentos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-500" />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Alertas de Vencimento</span>
            </div>
            {(vencidos + proximos) > 0 && (
              <Link to="/vencimentos" className="text-[10px] text-blue-500 hover:text-blue-700 font-medium">
                ver todos →
              </Link>
            )}
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-28 text-gray-400 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />Carregando...
            </div>
          ) : (
            <VencimentosAlerta items={vencimentos} />
          )}
        </div>
      </div>

      {/* ── Ranking + Custo ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">

        {/* Ranking de veículos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Car className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Mais Manutenções por Veículo</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-20 text-gray-400 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />Carregando...
            </div>
          ) : (
            <RankingVeiculos data={stats?.ranking_manutencoes || []} />
          )}
        </div>

        {/* Custo por veículo */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Custo de Manutenção por Veículo</span>
            </div>
            {totalCusto > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Total: <strong className="text-green-700">{fmtCurrency(totalCusto)}</strong>
              </span>
            )}
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-20 text-gray-400 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />Carregando...
            </div>
          ) : (
            <CustoVeiculos data={stats?.custo_por_veiculo || []} />
          )}
        </div>
      </div>

      {/* ── Solicitações ── */}
      <div className="rounded-lg shadow-sm border border-purple-200 dark:border-purple-800/50 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-purple-500 px-4 py-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-white font-bold text-sm">
            <ClipboardList className="w-5 h-5" /> Solicitações de Manutenção
          </span>
          <Link to="/solicitacoes" className="text-purple-200 hover:text-white text-xs font-medium">ver todas →</Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-gray-400 text-xs bg-white dark:bg-gray-800">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />Carregando...
          </div>
        ) : !solStats ? (
          <div className="py-8 text-center text-gray-400 text-sm bg-white dark:bg-gray-800">Nenhuma solicitação registrada.</div>
        ) : (
          <div className="bg-white dark:bg-gray-800 p-4 space-y-4">

            {/* Mini-cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded-lg border border-purple-100 dark:border-purple-800/40 bg-purple-50 dark:bg-purple-900/20 px-4 py-3 flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-800/40">
                  <ClipboardList className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium uppercase tracking-wide">Total</p>
                  <p className="text-2xl font-extrabold text-purple-700 dark:text-purple-300 leading-tight">{solStats.total}</p>
                </div>
              </div>

              <div className="rounded-lg border border-orange-100 dark:border-orange-800/40 bg-orange-50 dark:bg-orange-900/20 px-4 py-3 flex items-center gap-3">
                <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-800/40">
                  <Clock className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium uppercase tracking-wide">Em Aberto</p>
                  <p className="text-2xl font-extrabold text-orange-600 dark:text-orange-400 leading-tight">{solStats.abertas}</p>
                </div>
              </div>

              <div className="rounded-lg border border-red-100 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 px-4 py-3 flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-800/40">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-[10px] text-red-600 dark:text-red-400 font-medium uppercase tracking-wide">Críticas Abertas</p>
                  <p className="text-2xl font-extrabold text-red-600 dark:text-red-400 leading-tight">{solStats.criticas}</p>
                </div>
              </div>

              <div className="rounded-lg border border-green-100 dark:border-green-800/40 bg-green-50 dark:bg-green-900/20 px-4 py-3 flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-800/40">
                  <CheckCheck className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] text-green-600 dark:text-green-400 font-medium uppercase tracking-wide">Finalizadas</p>
                  <p className="text-2xl font-extrabold text-green-700 dark:text-green-400 leading-tight">{solStats.finalizadas}</p>
                </div>
              </div>

              <div className="rounded-lg border border-blue-100 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-800/40">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide">Tempo Médio</p>
                  <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-300 leading-tight">
                    {solStats.tempoMedio !== null ? `${solStats.tempoMedio}d` : '—'}
                  </p>
                  {solStats.tempoMedio !== null && <p className="text-[10px] text-blue-400">para resolver</p>}
                </div>
              </div>
            </div>

            {/* Gráfico + Ranking */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Gráfico por mês */}
              <div className="md:col-span-2 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col" style={{ minHeight: 160 }}>
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Solicitações por Mês</span>
                    <span className="text-xs text-gray-400">(últimos 12 meses)</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
                    <span>Mês atual: <strong className="text-purple-600">{solStats.meses.slice(-1)[0]?.total || 0}</strong></span>
                    <span>Finalizadas mês: <strong className="text-green-600">{solStats.meses.slice(-1)[0]?.finalizadas || 0}</strong></span>
                    <span>Total: <strong className="text-gray-700 dark:text-gray-200">{solStats.total}</strong></span>
                  </div>
                </div>
                <div className="flex-1 flex flex-col">
                  <BarChartSolicitacoes data={solStats.meses} />
                </div>
              </div>

              {/* Ranking + Prioridades */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Car className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Veículos com mais solicitações</span>
                  </div>
                  <RankingSolicitacoes data={solStats.rankingVeiculos} />
                </div>

                {solStats.porPrior.length > 0 && (
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Em aberto por prioridade</p>
                    {(() => {
                      const colors = { Crítico: 'bg-red-500', Alta: 'bg-orange-400', Média: 'bg-yellow-400', Baixa: 'bg-green-400' }
                      const maxP = Math.max(...solStats.porPrior.map(p => p.total), 1)
                      return solStats.porPrior.map(p => (
                        <div key={p.label} className="flex items-center gap-2 mb-1">
                          <span className="text-xs w-12 text-gray-600 dark:text-gray-400 shrink-0">{p.label}</span>
                          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${colors[p.label] || 'bg-gray-400'}`}
                              style={{ width: `${(p.total / maxP) * 100}%` }} />
                          </div>
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-300 w-4 text-right">{p.total}</span>
                        </div>
                      ))
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Tabela status da frota ── */}
      <div className="rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-white font-bold text-sm">
            <Car className="w-5 h-5" /> Status da Frota
          </span>
          <div className="flex items-center gap-3">
            {frota.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-20 rounded-full overflow-hidden h-1.5 bg-blue-900">
                  <div className="h-full bg-green-400 transition-all duration-500"
                    style={{ width: `${(emOperacao / frota.length) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-green-300">
                  {Math.round((emOperacao / frota.length) * 100)}% disponível
                </span>
              </div>
            )}
            <button onClick={fetchAll} className="text-blue-200 hover:text-white transition-colors" title="Atualizar">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-gray-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                {[
                  { col: 'placa',       label: 'Placa',       cls: 'py-2 pl-4 pr-3 text-left' },
                  { col: 'descricao',   label: 'Veículo',     cls: 'px-3 py-2 text-left' },
                  { col: 'status',      label: 'Status',      cls: 'px-3 py-2 text-center' },
                  { col: 'os',          label: 'OS',          cls: 'px-3 py-2 text-left' },
                  { col: 'dt_inicio',   label: 'Dt. Início',  cls: 'px-3 py-2 text-left' },
                  { col: 'dt_previsao', label: 'Previsão',    cls: 'px-3 py-2 text-left' },
                  { col: 'responsavel', label: 'Responsável', cls: 'px-3 py-2 text-left' },
                  { col: 'prioridade',  label: 'Prioridade',  cls: 'px-3 py-2 text-left' },
                  { col: 'servicos',    label: 'Serviços',    cls: 'px-3 py-2 text-left' },
                  { col: '_ver',        label: '',            cls: 'px-3 py-2 text-center w-8' },
                ].map(({ col, label, cls }) => (
                  <th key={col}
                    onClick={() => col !== '_ver' && handleSort(col)}
                    className={`${cls} text-gray-600 dark:text-gray-300 font-semibold select-none transition-colors ${col !== '_ver' ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600' : ''}`}
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
