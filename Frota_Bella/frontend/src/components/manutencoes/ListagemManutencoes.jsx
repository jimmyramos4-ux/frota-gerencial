import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
  Search,
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

const emptyRelatorio = {
  dt_inicio_gte: '', dt_inicio_lte: '',
  dt_termino_gte: '', dt_termino_lte: '',
  dt_previsao_gte: '', dt_previsao_lte: '',
  veiculo: '', resp_manutencao: '',
  tipo: '', status: '',
  km_gte: '', km_lte: '',
  dt_servico_gte: '', dt_servico_lte: '',
  servicos_solicitados: '', tipo_servico: '',
  detalhar: 'Todos', ordenacao: 'Dt. Início', formato: 'PDF',
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

const fi = 'border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0 text-xs w-full focus:outline-none focus:border-blue-400 h-5 dark:bg-gray-700 dark:text-gray-100'
const fs = 'border border-gray-300 dark:border-gray-600 rounded px-1 py-0 text-xs bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:border-blue-400 w-full h-5'
function Lbl({ children, wide }) {
  return <td className={`px-1.5 py-1 text-right text-xs font-semibold text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 whitespace-nowrap ${wide ? 'w-28' : 'w-20'}`}>{children}</td>
}
function Td({ children, colSpan }) {
  return <td className="px-1 py-1 border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800" colSpan={colSpan}>{children}</td>
}

function gerarPDF(rows, config) {
  const fmtDt = (dt) => dt ? new Date(dt + (dt.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('pt-BR') : '-'
  const fmtKm = (km) => km ? Number(km).toLocaleString('pt-BR') + ' km' : '-'
  const fmtVal = (v) => v != null && v !== '' ? 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'
  let sorted = [...rows]
  if (config.ordenacao === 'Veículo') sorted.sort((a, b) => (a.veiculo_placa || '') > (b.veiculo_placa || '') ? 1 : -1)
  else if (config.ordenacao === 'Status') sorted.sort((a, b) => (a.status || '') > (b.status || '') ? 1 : -1)
  else if (config.ordenacao === 'Tipo') sorted.sort((a, b) => (a.tipo || '') > (b.tipo || '') ? 1 : -1)
  else sorted.sort((a, b) => (a.dt_inicio || '') > (b.dt_inicio || '') ? 1 : -1)

  const dataGeracao = new Date().toLocaleString('pt-BR')
  const detalhar = config.detalhar === 'Todos'
  const badgeStyle = { 'Em Andamento': 'background:#dbeafe;color:#1e40af', Finalizada: 'background:#dcfce7;color:#15803d', Cancelada: 'background:#fee2e2;color:#dc2626' }
  const stBadge = { Finalizado: 'background:#dcfce7;color:#15803d', Pendente: 'background:#fef9c3;color:#854d0e', Cancelado: 'background:#fee2e2;color:#dc2626' }

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Manutenção</title>
<style>
  body{font-family:Arial,sans-serif;font-size:10px;margin:16px;color:#222}
  h1{font-size:14px;text-align:center;color:#1e3a8a;margin-bottom:2px}
  .sub{text-align:center;font-size:9px;color:#666;margin-bottom:10px}
  table{width:100%;border-collapse:collapse;margin-bottom:0}
  .man-head th{background:#1e3a8a;color:#fff;padding:4px 5px;text-align:left;font-size:9px;white-space:nowrap}
  .man-row td{padding:4px 5px;border-bottom:1px solid #c7d2e7;vertical-align:top;background:#e8eef8;font-weight:bold;font-size:9px}
  .srv-head th{background:#4b6cb7;color:#fff;padding:2px 5px;font-size:8px;font-weight:normal;white-space:nowrap}
  .srv-row td{padding:2px 5px 2px 10px;border-bottom:1px solid #e5e7eb;font-size:8.5px;background:#f8faff;vertical-align:top}
  .srv-row:nth-child(even) td{background:#eff4ff}
  .no-srv td{padding:3px 5px 3px 14px;font-size:8px;color:#9ca3af;background:#f8faff;border-bottom:1px solid #e5e7eb}
  .badge{display:inline-block;padding:1px 5px;border-radius:8px;font-size:8px;font-weight:bold}
  .spacer td{height:6px;background:white;border:none}
  .footer{margin-top:12px;font-size:8px;color:#9ca3af;text-align:right}
  @media print{@page{margin:1cm size:landscape}button{display:none}}
</style></head><body>
<h1>Relatório de Manutenção de Veículo</h1>
<div class="sub">Gerado em ${dataGeracao} &nbsp;·&nbsp; ${rows.length} manutenção(ões)</div>
<table>
<thead class="man-head"><tr>
  <th>#</th><th>Veículo</th><th>Oficina / Prestador</th>
  <th>Km Entrada</th><th>Dt. Início</th><th>Dt. Término</th>
  <th>Tipo</th><th>Prioridade</th><th>Status</th>
</tr></thead>
<tbody>
${sorted.map(r => {
  const servicos = r._servicos || []
  return `
  <tr class="man-row">
    <td>#${r.id}</td>
    <td><strong>${r.veiculo_placa || ''}</strong> <span style="font-weight:normal;color:#555">${r.veiculo_descricao || ''}</span></td>
    <td>${r.responsavel_manutencao || '-'}</td>
    <td style="text-align:right">${fmtKm(r.km_entrada)}</td>
    <td>${fmtDt(r.dt_inicio)}</td>
    <td>${fmtDt(r.dt_termino)}</td>
    <td>${r.tipo || '-'}</td>
    <td>${r.prioridade || '-'}</td>
    <td><span class="badge" style="${badgeStyle[r.status] || ''}">${r.status || '-'}</span></td>
  </tr>
  ${detalhar ? `
  <tr class="srv-head"><th></th><th>Parte do Veículo</th><th>Serviço</th><th>Tipo</th><th>Status</th><th>Dt. Serviço</th><th>Próx. KM</th><th>Responsável</th><th>Valor</th></tr>
  ${servicos.length === 0
    ? `<tr class="no-srv"><td></td><td colspan="8">Nenhum serviço registrado</td></tr>`
    : servicos.map(s => `
  <tr class="srv-row">
    <td></td>
    <td>${s.parte_veiculo || '-'}</td>
    <td>${s.servico || '-'}</td>
    <td>${s.tipo_uso || '-'}</td>
    <td><span class="badge" style="${stBadge[s.status] || 'background:#f3f4f6;color:#374151'}">${s.status || '-'}</span></td>
    <td>${fmtDt(s.dt_servico)}</td>
    <td style="text-align:right">${s.proximo_km_validade ? fmtKm(s.proximo_km_validade) : '-'}</td>
    <td>${s.pessoa_responsavel || '-'}</td>
    <td style="text-align:right">${fmtVal(s.valor)}</td>
  </tr>`).join('')}
  ` : ''}
  <tr class="spacer"><td colspan="9"></td></tr>`
}).join('')}
</tbody>
</table>
<div class="footer">Frota Bello · Sistema de Gestão de Frotas · ${dataGeracao}</div>
<script>window.onload=()=>setTimeout(()=>window.print(),500)</script>
</body></html>`

  const w = window.open('', '_blank', 'width=1200,height=800')
  w.document.write(html)
  w.document.close()
}

function gerarXML(rows, _config) {
  const esc = (v) => String(v || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const fmtDt = (dt) => dt ? new Date(dt).toISOString().slice(0, 10) : ''
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<manutencoes gerado_em="${new Date().toISOString()}" total="${rows.length}">
${rows.map(r => `  <manutencao id="${r.id}">
    <veiculo_placa>${esc(r.veiculo_placa)}</veiculo_placa>
    <veiculo_descricao>${esc(r.veiculo_descricao)}</veiculo_descricao>
    <motorista>${esc(r.motorista_nome)}</motorista>
    <responsavel_manutencao>${esc(r.responsavel_manutencao)}</responsavel_manutencao>
    <km_entrada>${r.km_entrada || ''}</km_entrada>
    <dt_inicio>${fmtDt(r.dt_inicio)}</dt_inicio>
    <dt_previsao>${fmtDt(r.dt_previsao)}</dt_previsao>
    <dt_termino>${fmtDt(r.dt_termino)}</dt_termino>
    <tipo>${esc(r.tipo)}</tipo>
    <prioridade>${esc(r.prioridade)}</prioridade>
    <status>${esc(r.status)}</status>
    <servicos_solicitados>${esc(r.servicos_solicitados)}</servicos_solicitados>
    <observacoes>${esc(r.observacoes)}</observacoes>
  </manutencao>`).join('\n')}
</manutencoes>`
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `manutencoes_${new Date().toISOString().slice(0, 10)}.xml`
  a.click()
  URL.revokeObjectURL(url)
}

function AutocompleteInput({ value, onChange, fetchUrl, getLabel, getValue, getKey, placeholder, className, extraButton }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef(null)

  const doFetch = async (q = '') => {
    setLoading(true)
    try {
      const res = await axios.get(fetchUrl, { params: q ? { search: q } : {} })
      const data = res.data.items || res.data || []
      setItems(Array.isArray(data) ? data.slice(0, 15) : [])
    } catch {}
    finally { setLoading(false) }
  }

  const handleChange = (e) => {
    onChange(e.target.value)
    setOpen(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doFetch(e.target.value), 220)
  }

  const handleFocus = () => { setOpen(true); doFetch(value) }
  const handleBlur = () => setTimeout(() => setOpen(false), 180)

  return (
    <div className="relative flex-1">
      <div className="flex gap-1">
        <input className={className + ' flex-1'} value={value} onChange={handleChange} onFocus={handleFocus} onBlur={handleBlur} placeholder={placeholder} autoComplete="off" />
        {extraButton}
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full z-[300] bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg max-h-44 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">Carregando...</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400 dark:text-gray-500">Nenhum resultado.</div>
          ) : items.map((item, i) => (
            <div key={getKey ? getKey(item) : (item.id || i)}
              className="px-3 py-1.5 text-xs cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:text-gray-100"
              onMouseDown={(e) => { e.preventDefault(); onChange(getValue ? getValue(item) : getLabel(item)); setOpen(false) }}
            >
              {getLabel(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ConsultaTipoServicoModal({ onSelect, onClose }) {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ nome: '', uso: '' })
  const [applied, setApplied] = useState({})
  const perPage = 10

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const res = await axios.get(`${API}/tipos-servico`, {
          params: { page, per_page: perPage, ...(applied.nome && { search: applied.nome }), ...(applied.uso && { uso: applied.uso }) }
        })
        setItems(res.data.items || [])
        setTotal(res.data.total || 0)
      } catch {}
      finally { setLoading(false) }
    }
    fetch()
  }, [page, applied])

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const from = total > 0 ? (page - 1) * perPage + 1 : 0
  const to = Math.min(page * perPage, total)
  const th = 'px-2 py-1.5 text-left text-blue-900 dark:text-blue-200 font-semibold border border-blue-200 dark:border-blue-800 text-xs whitespace-nowrap bg-blue-100 dark:bg-blue-900/40'
  const td = 'px-2 py-1 border border-gray-200 dark:border-gray-600 text-xs'
  const btn = 'px-2 py-0.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 disabled:opacity-30 text-xs'

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded shadow-2xl w-full max-w-4xl overflow-hidden">
        <div className="text-center py-2 border-b border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700">
          <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">Consulta de Tipo de Serviço</span>
        </div>
        {/* Paginação */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-0.5">
            <button className={btn} onClick={() => setPage(1)} disabled={page <= 1}>«</button>
            <button className={btn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>‹</button>
            <span className="px-2.5 py-0.5 bg-blue-600 text-white border border-blue-600 rounded text-xs">{page}</span>
            {page < totalPages && <span className={btn}>{page + 1}</span>}
            <button className={btn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>›</button>
            <button className={btn} onClick={() => setPage(totalPages)} disabled={page >= totalPages}>»</button>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">{from} à {to} de {total}</span>
        </div>
        {/* Tabela */}
        <div className="overflow-x-auto overflow-y-auto max-h-72">
          <table className="w-full border-collapse">
            <thead className="sticky top-0">
              <tr>
                <th className={th}>Tipo de Serviço</th>
                <th className={th}>Parte do Veículo</th>
                <th className={th + ' text-center'}>Dias Val.</th>
                <th className={th + ' text-center'}>Dias Not.</th>
                <th className={th + ' text-right'}>Hodômetro Val. (Km)</th>
                <th className={th + ' text-right'}>Hodômetro Not. (Km)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-6 text-gray-400 text-xs">Carregando...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-6 text-gray-400 text-xs">Nenhum resultado.</td></tr>
              ) : items.map((item, i) => (
                <tr key={item.id}
                  className={`cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 ${i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}
                  onClick={() => { onSelect(item.nome); onClose() }}
                >
                  <td className={td}>{item.nome}</td>
                  <td className={td}>{item.parte_veiculo || '-'}</td>
                  <td className={td + ' text-center'}>{item.nr_dias_validade || ''}</td>
                  <td className={td + ' text-center'}>{item.nr_dias_notificacao || ''}</td>
                  <td className={td + ' text-right'}>{item.hodometro_km_validade ? item.hodometro_km_validade.toLocaleString('pt-BR') : ''}</td>
                  <td className={td + ' text-right'}>{item.hodometro_km_notificacao ? item.hodometro_km_notificacao.toLocaleString('pt-BR') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Filtro */}
        <div className="border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 p-3 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="font-semibold text-blue-900 dark:text-blue-200 whitespace-nowrap">Tipo de Serviço</label>
              <input className="border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 w-48 bg-white dark:bg-gray-700 dark:text-gray-100" value={filters.nome} onChange={e => setFilters(f => ({ ...f, nome: e.target.value }))} onKeyDown={e => e.key === 'Enter' && (setApplied({ ...filters }), setPage(1))} />
            </div>
            <div className="flex items-center gap-2">
              <label className="font-semibold text-blue-900 dark:text-blue-200">Uso</label>
              <select className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-700 dark:text-gray-100" value={filters.uso} onChange={e => setFilters(f => ({ ...f, uso: e.target.value }))}>
                <option value="">Todos</option><option>Veículo</option><option>Equipamento</option>
              </select>
            </div>
          </div>
          <div className="flex justify-center gap-3 mt-2">
            <button onClick={() => { setApplied({ ...filters }); setPage(1) }} className="px-6 py-0.5 bg-white dark:bg-gray-600 dark:text-gray-100 border border-gray-400 dark:border-gray-500 rounded hover:bg-gray-50 dark:hover:bg-gray-500">Filtrar</button>
            <button onClick={() => { setFilters({ nome: '', uso: '' }); setApplied({}); setPage(1) }} className="px-6 py-0.5 bg-white dark:bg-gray-600 dark:text-gray-100 border border-gray-400 dark:border-gray-500 rounded hover:bg-gray-50 dark:hover:bg-gray-500">Limpar</button>
          </div>
        </div>
        {/* Rodapé */}
        <div className="text-center py-2 border-t border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs">
          <button onClick={onClose} className="text-blue-600 dark:text-blue-400 hover:underline">Fechar Janela</button>
        </div>
      </div>
    </div>
  )
}

function RelatorioModal({ relatorio, setRelatorio, onGerar, onClose, gerando }) {
  const [showConsulta, setShowConsulta] = useState(false)
  const setR = (key) => (e) => setRelatorio(r => ({ ...r, [key]: e.target.value }))
  const lbl = 'bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 text-xs font-semibold text-right px-2 py-1 whitespace-nowrap'
  const cel = 'p-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600'
  const inp = 'border border-gray-300 dark:border-gray-600 text-xs px-1.5 py-0.5 w-full focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'
  const sel = 'border border-gray-300 dark:border-gray-600 text-xs px-1 py-0.5 w-full focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100'

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-blue-700 text-white">
          <span className="font-bold text-sm">Relatório de Manutenção de Veículo</span>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto max-h-[80vh]">
          <table className="w-full border-collapse text-xs">
            <tbody>
              <tr>
                <td className={lbl}>Dt. Início &gt;=</td><td className={cel}><input type="date" className={inp} value={relatorio.dt_inicio_gte} onChange={setR('dt_inicio_gte')} /></td>
                <td className={lbl}>Dt. Início &lt;=</td><td className={cel}><input type="date" className={inp} value={relatorio.dt_inicio_lte} onChange={setR('dt_inicio_lte')} /></td>
              </tr>
              <tr>
                <td className={lbl}>Dt. Término &gt;=</td><td className={cel}><input type="date" className={inp} value={relatorio.dt_termino_gte} onChange={setR('dt_termino_gte')} /></td>
                <td className={lbl}>Dt. Término &lt;=</td><td className={cel}><input type="date" className={inp} value={relatorio.dt_termino_lte} onChange={setR('dt_termino_lte')} /></td>
              </tr>
              <tr>
                <td className={lbl}>Data Previsão &gt;=</td><td className={cel}><input type="date" className={inp} value={relatorio.dt_previsao_gte} onChange={setR('dt_previsao_gte')} /></td>
                <td className={lbl}>Data Previsão &lt;=</td><td className={cel}><input type="date" className={inp} value={relatorio.dt_previsao_lte} onChange={setR('dt_previsao_lte')} /></td>
              </tr>
              <tr>
                <td className={lbl}>Veículo</td>
                <td className={cel} colSpan={3}>
                  <AutocompleteInput
                    value={relatorio.veiculo}
                    onChange={(v) => setRelatorio(r => ({ ...r, veiculo: v }))}
                    fetchUrl={`${API}/veiculos`}
                    getLabel={(item) => `${item.placa} — ${item.descricao || ''}`}
                    getValue={(item) => item.placa}
                    getKey={(item) => item.id}
                    placeholder="Placa ou descrição"
                    className={inp}
                  />
                </td>
              </tr>
              <tr>
                <td className={lbl}>Oficina / Prestador</td>
                <td className={cel} colSpan={3}><input className={inp} value={relatorio.resp_manutencao} onChange={setR('resp_manutencao')} /></td>
              </tr>
              <tr>
                <td className={lbl}>Tipo de Manutenção</td>
                <td className={cel}><select className={sel} value={relatorio.tipo} onChange={setR('tipo')}><option value=""></option><option>Corretiva</option><option>Preventiva</option></select></td>
                <td className={lbl}>Status</td>
                <td className={cel}><select className={sel} value={relatorio.status} onChange={setR('status')}><option value=""></option><option>Em Andamento</option><option>Finalizada</option><option>Cancelada</option></select></td>
              </tr>
              <tr>
                <td className={lbl}>Km. Entrada &gt;=</td><td className={cel}><input type="number" className={inp} value={relatorio.km_gte} onChange={setR('km_gte')} /></td>
                <td className={lbl}>Km. Entrada &lt;=</td><td className={cel}><input type="number" className={inp} value={relatorio.km_lte} onChange={setR('km_lte')} /></td>
              </tr>
              <tr><td colSpan={4} className="bg-blue-200 dark:bg-blue-900/50 text-blue-900 dark:text-blue-200 font-bold text-xs px-2 py-1 text-center border border-blue-300 dark:border-blue-700">Serviços</td></tr>
              <tr>
                <td className={lbl}>Data Serviço &gt;=</td><td className={cel}><input type="date" className={inp} value={relatorio.dt_servico_gte} onChange={setR('dt_servico_gte')} /></td>
                <td className={lbl}>Data Serviço &lt;=</td><td className={cel}><input type="date" className={inp} value={relatorio.dt_servico_lte} onChange={setR('dt_servico_lte')} /></td>
              </tr>
              <tr>
                <td className={lbl}>Serviços Solicitados</td>
                <td className={cel} colSpan={3}><input className={inp} value={relatorio.servicos_solicitados} onChange={setR('servicos_solicitados')} /></td>
              </tr>
              <tr>
                <td className={lbl}>Tipo de Serviço</td>
                <td className={cel} colSpan={3}>
                  <AutocompleteInput
                    value={relatorio.tipo_servico}
                    onChange={(v) => setRelatorio(r => ({ ...r, tipo_servico: v }))}
                    fetchUrl={`${API}/tipos-servico/lookup`}
                    getLabel={(item) => item.nome}
                    getKey={(item) => item.id}
                    placeholder="Digite para filtrar..."
                    className={inp}
                    extraButton={
                      <button type="button" onClick={() => setShowConsulta(true)}
                        className="border border-gray-300 dark:border-gray-600 rounded px-1.5 bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 hover:text-blue-600 transition-colors"
                        title="Pesquisar tipo de serviço">
                        <Search className="w-3 h-3" />
                      </button>
                    }
                  />
                </td>
              </tr>
              {showConsulta && (
                <ConsultaTipoServicoModal
                  onSelect={(nome) => setRelatorio(r => ({ ...r, tipo_servico: nome }))}
                  onClose={() => setShowConsulta(false)}
                />
              )}
              <tr>
                <td className={lbl}>Detalhar Serviços</td>
                <td className={cel}><select className={sel} value={relatorio.detalhar} onChange={setR('detalhar')}><option>Todos</option><option>Nenhum</option></select></td>
                <td className={lbl}>Ordenação</td>
                <td className={cel}><select className={sel} value={relatorio.ordenacao} onChange={setR('ordenacao')}><option>Dt. Início</option><option>Veículo</option><option>Status</option><option>Tipo</option></select></td>
              </tr>
              <tr>
                <td className={lbl}>Formato</td>
                <td className={cel} colSpan={3}>
                  <select className={sel} style={{ width: 'auto' }} value={relatorio.formato} onChange={setR('formato')}>
                    <option>PDF</option><option>XML</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="flex justify-center gap-4 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <button onClick={onGerar} disabled={gerando} className="px-8 py-1 text-xs bg-white dark:bg-gray-600 dark:text-gray-100 border border-gray-400 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 shadow-sm font-medium disabled:opacity-50">
              {gerando ? 'Gerando...' : 'Gerar'}
            </button>
            <button onClick={() => setRelatorio(emptyRelatorio)} className="px-8 py-1 text-xs bg-white dark:bg-gray-600 dark:text-gray-100 border border-gray-400 dark:border-gray-500 rounded hover:bg-gray-100 dark:hover:bg-gray-500 shadow-sm">
              Limpar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ListagemManutencoes() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Inicializa filtros a partir de query params (ex: vindos do clique no gráfico do Dashboard)
  const initFilters = () => {
    const tipo = searchParams.get('tipo') || ''
    const gte = searchParams.get('dt_inicio_gte') || ''
    const lte = searchParams.get('dt_inicio_lte') || ''
    if (tipo || gte || lte) {
      return { ...emptyFilters, tipo, dt_inicio_gte: gte, dt_inicio_lte: lte }
    }
    return emptyFilters
  }
  const initApplied = () => {
    const tipo = searchParams.get('tipo') || ''
    const gte = searchParams.get('dt_inicio_gte') || ''
    const lte = searchParams.get('dt_inicio_lte') || ''
    if (tipo || gte || lte) {
      return { ...emptyFilters, tipo, dt_inicio_gte: gte, dt_inicio_lte: lte }
    }
    return {}
  }

  const [data, setData] = useState({ items: [], total: 0, page: 1, per_page: 10, total_pages: 1 })
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [filters, setFilters] = useState(initFilters)
  const [appliedFilters, setAppliedFilters] = useState(initApplied)
  const [emailModal, setEmailModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [sortField, setSortField] = useState('')
  const [sortDir, setSortDir] = useState('asc')
  const [showFilters, setShowFilters] = useState(() => {
    const tipo = searchParams.get('tipo') || ''
    const gte = searchParams.get('dt_inicio_gte') || ''
    return !!(tipo || gte)
  })
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

  // ── Relatório ──────────────────────────────────────────────────────────────
  const [relatorioModal, setRelatorioModal] = useState(false)
  const [relatorio, setRelatorio] = useState(emptyRelatorio)
  const [gerando, setGerando] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [expandedData, setExpandedData] = useState({})

  const handleExpand = async (item) => {
    if (expandedId === item.id) { setExpandedId(null); return }
    setExpandedId(item.id)
    if (!expandedData[item.id]) {
      try {
        const r = await axios.get(`${API}/manutencoes/${item.id}`)
        setExpandedData(d => ({ ...d, [item.id]: r.data }))
      } catch {}
    }
  }

  const handleGerarRelatorio = async () => {
    setGerando(true)
    try {
      const r = relatorio
      const params = {
        page: 1, per_page: 10000,
        ...(r.status               && { status: r.status }),
        ...(r.tipo                 && { tipo: r.tipo }),
        ...(r.veiculo              && { veiculo: r.veiculo }),
        ...(r.resp_manutencao      && { resp_manutencao: r.resp_manutencao }),
        ...(r.servicos_solicitados && { servicos_solicitados: r.servicos_solicitados }),
        ...(r.km_gte               && { km_gte: r.km_gte }),
        ...(r.km_lte               && { km_lte: r.km_lte }),
        ...(r.dt_inicio_gte        && { dt_inicio_gte: r.dt_inicio_gte }),
        ...(r.dt_inicio_lte        && { dt_inicio_lte: r.dt_inicio_lte }),
        ...(r.dt_termino_gte       && { dt_termino_gte: r.dt_termino_gte }),
        ...(r.dt_termino_lte       && { dt_termino_lte: r.dt_termino_lte }),
        ...(r.dt_previsao_gte      && { dt_previsao_gte: r.dt_previsao_gte }),
        ...(r.dt_previsao_lte      && { dt_previsao_lte: r.dt_previsao_lte }),
        ...(r.dt_servico_gte       && { dt_servico_gte: r.dt_servico_gte }),
        ...(r.dt_servico_lte       && { dt_servico_lte: r.dt_servico_lte }),
        ...(r.tipo_servico         && { tipo_servico: r.tipo_servico }),
      }
      const res = await axios.get(`${API}/manutencoes`, { params })
      const rows = res.data.items || []

      // Busca serviços detalhados se solicitado
      if (r.detalhar === 'Todos' && rows.length > 0) {
        const detalhes = await Promise.all(rows.map(row => axios.get(`${API}/manutencoes/${row.id}`).catch(() => ({ data: { servicos: [] } }))))
        rows.forEach((row, i) => { row._servicos = detalhes[i].data.servicos || [] })
      }

      if (r.formato === 'PDF') gerarPDF(rows, r)
      else gerarXML(rows, r)
      setRelatorioModal(false)
    } catch {
      alert('Erro ao gerar relatório')
    } finally {
      setGerando(false)
    }
  }

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setRelatorioModal(true)}
            className="flex items-center gap-1.5 bg-white text-blue-700 font-medium text-xs px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            Relatório
          </button>
          <button
            onClick={fetchData}
            className="text-blue-200 hover:text-white transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Pagination bar TOP */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center gap-2">
            <Pagination page={page} totalPages={data.total_pages} onPageChange={setPage} />
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
              {data.total === 0 ? '0 registros' : `${from} à ${to} de ${data.total}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 dark:text-gray-400">Por página:</label>
            <select
              className="border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 text-xs bg-white dark:bg-gray-700 dark:text-gray-100"
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
              <tr className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/40">
                {[['id','Man.'],['veiculo_placa','Veículo'],['motorista_nome','Motorista'],['responsavel_manutencao','Responsável Man.'],['km_entrada','Km Entrada'],['dt_inicio','Dt. Início'],['dt_previsao','Dt. Previsão'],['dt_termino','Dt. Término'],['prioridade','Prioridade'],['tipo','Tipo'],['status','Status']].map(([f,l]) => (
                  <th key={f} className="px-2 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold whitespace-nowrap cursor-pointer select-none hover:bg-blue-100 dark:hover:bg-blue-900/30" onClick={() => handleSort(f)}>
                    <span className="flex items-center gap-1">{l} <SortIcon field={f} sortField={sortField} sortDir={sortDir} /></span>
                  </th>
                ))}
                <th className="px-2 py-2 text-center text-blue-800 dark:text-blue-300 font-semibold whitespace-nowrap">Ações</th>
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
                  <React.Fragment key={item.id}>
                  <tr
                    onClick={() => handleExpand(item)}
                    className={`border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer ${
                      expandedId === item.id ? 'bg-blue-50 dark:bg-blue-900/20' : idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    <td className="px-2 py-1.5 font-medium text-blue-700">
                      <div className="flex items-center gap-1">
                        <ChevronDown className={`w-3 h-3 text-blue-400 transition-transform ${expandedId === item.id ? '' : '-rotate-90'}`} />
                        #{item.id}
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      {item.veiculo_placa ? (
                        <>
                          <div className="font-medium">{item.veiculo_placa}</div>
                          <div className="text-gray-400 dark:text-gray-500 text-xs leading-none">{item.veiculo_descricao}</div>
                        </>
                      ) : item.ativo_nome ? (
                        <>
                          <div className="font-medium text-purple-700 dark:text-purple-400">{item.ativo_nome}</div>
                          <div className="text-gray-400 dark:text-gray-500 text-xs leading-none">{item.ativo_tipo || 'Ativo'}</div>
                        </>
                      ) : <span className="text-gray-400">—</span>}
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
                    <td className="px-2 py-1.5" onClick={e => e.stopPropagation()}>
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
                  {expandedId === item.id && (() => {
                    const det = expandedData[item.id]
                    const servicos = det?.servicos || []
                    const stBadge = { Finalizado: 'bg-green-500 text-white', Cancelado: 'bg-red-500 text-white', 'Em Andamento': 'bg-blue-500 text-white' }
                    return (
                      <tr>
                        <td colSpan={12} className="px-0 py-0 bg-blue-50 dark:bg-blue-900/10 border-b-2 border-blue-300 dark:border-blue-700">
                          <div className="mx-4 my-2 rounded-lg border border-blue-200 dark:border-blue-700 overflow-hidden shadow-sm">
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-2 text-xs text-white flex flex-wrap gap-x-5 gap-y-0.5 font-medium" onClick={e => e.stopPropagation()}>
                              <span><strong>Tipo:</strong> {item.tipo || '-'}</span>
                              <span><strong>Status:</strong> {item.status || '-'}</span>
                              <span><strong>Oficina/Prestador:</strong> {item.responsavel_manutencao || '-'}</span>
                              <span><strong>Motorista:</strong> {item.motorista_nome || '-'}</span>
                              <span><strong>KM Entrada:</strong> {item.km_entrada ? item.km_entrada.toLocaleString('pt-BR') : '-'}</span>
                              {det?.servicos_solicitados && <span><strong>Solicitado:</strong> {det.servicos_solicitados}</span>}
                              {det?.observacao && <span><strong>Obs:</strong> {det.observacao}</span>}
                            </div>
                            {/* Serviços */}
                            {!det ? (
                              <div className="text-xs text-gray-400 px-4 py-3 bg-white dark:bg-gray-800 flex items-center gap-2">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Carregando...
                              </div>
                            ) : servicos.length === 0 ? (
                              <div className="text-xs text-gray-400 px-4 py-3 bg-white dark:bg-gray-800">Nenhum serviço registrado.</div>
                            ) : (
                              <table className="w-full text-xs" onClick={e => e.stopPropagation()}>
                                <thead>
                                  <tr className="bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200 border-b border-blue-200 dark:border-blue-800">
                                    <th className="px-4 py-1.5 text-left font-semibold">Parte do Veículo</th>
                                    <th className="px-4 py-1.5 text-left font-semibold">Serviço</th>
                                    <th className="px-4 py-1.5 text-left font-semibold">Tipo</th>
                                    <th className="px-4 py-1.5 text-left font-semibold">Responsável</th>
                                    <th className="px-4 py-1.5 text-left font-semibold">Descrição</th>
                                    <th className="px-4 py-1.5 text-left font-semibold">Dt. Serviço</th>
                                    <th className="px-4 py-1.5 text-center font-semibold">Status</th>
                                    <th className="px-4 py-1.5 text-right font-semibold">Valor</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {servicos.map((s, i) => (
                                    <tr key={i} className={`border-t border-blue-100 dark:border-blue-800/30 ${i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-blue-50 dark:bg-blue-900/10'}`}>
                                      <td className="px-4 py-1.5 text-gray-600 dark:text-gray-400">{s.parte_veiculo || '-'}</td>
                                      <td className="px-4 py-1.5 font-semibold text-gray-800 dark:text-gray-200">{s.servico || '-'}</td>
                                      <td className="px-4 py-1.5 text-gray-600 dark:text-gray-400">{s.tipo_uso || '-'}</td>
                                      <td className="px-4 py-1.5 text-gray-600 dark:text-gray-400">{s.pessoa_responsavel || '-'}</td>
                                      <td className="px-4 py-1.5 text-gray-600 dark:text-gray-400">{s.descricao || '-'}</td>
                                      <td className="px-4 py-1.5 text-gray-600 dark:text-gray-400">{s.dt_servico ? new Date(s.dt_servico + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                                      <td className="px-4 py-1.5 text-center">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stBadge[s.status] || 'bg-gray-200 text-gray-600'}`}>{s.status || '-'}</span>
                                      </td>
                                      <td className="px-4 py-1.5 text-right font-semibold text-gray-700 dark:text-gray-300">
                                        {s.valor ? `R$ ${Number(s.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                  <tr className="border-t border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
                                    <td colSpan={7} className="px-4 py-1.5 text-right text-xs font-bold text-blue-800 dark:text-blue-300">Total:</td>
                                    <td className="px-4 py-1.5 text-right text-xs font-bold text-blue-800 dark:text-blue-300">
                                      R$ {servicos.reduce((s, r) => s + (Number(r.valor) || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })()}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Status bar */}
        <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
          <span>Total: {data.total} manutenção(ões)</span>
          <span>Página {page} de {data.total_pages}</span>
        </div>
      </div>

      {/* Filter Form — compacto */}
      <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setShowFilters(f => !f)}
          className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
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
                <Lbl wide>Oficina / Prestador</Lbl>
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
          <div className="bg-blue-50 dark:bg-blue-900/20 border-t border-gray-200 dark:border-gray-600 py-1.5 flex justify-center gap-3">
            <button type="submit" className="px-5 py-0.5 text-xs bg-white dark:bg-gray-700 border border-gray-400 dark:border-gray-500 dark:text-gray-200 rounded hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm">Filtrar</button>
            <button type="button" className="px-5 py-0.5 text-xs bg-white dark:bg-gray-700 border border-gray-400 dark:border-gray-500 dark:text-gray-200 rounded hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm" onClick={handleClear}>Limpar</button>
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
      {relatorioModal && (
        <RelatorioModal
          relatorio={relatorio}
          setRelatorio={setRelatorio}
          onGerar={handleGerarRelatorio}
          onClose={() => setRelatorioModal(false)}
          gerando={gerando}
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
