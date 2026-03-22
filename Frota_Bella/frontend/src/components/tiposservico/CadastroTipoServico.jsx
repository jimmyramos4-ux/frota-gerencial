import React, { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import { Pencil, RefreshCw, AlertCircle, CheckCircle, Info, X, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />
  return sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
}

const API = 'http://localhost:8000/api'

const EMPTY = {
  nome: '', parte_veiculo: '', uso: 'Veículo', descricao: '',
  nr_dias_validade: '', nr_dias_notificacao: '',
  hodometro_km_validade: '', hodometro_km_notificacao: '',
  categoria_servico: '', valor_sugerido: '',
  alerta_servico_realizado: '', tempo_execucao: '',
  nr_dias_alerta_servico: '', ativo: true,
}

function InfoTooltip({ text }) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef(null)

  const show = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect()
      setPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX })
    }
    setVisible(true)
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={() => setVisible(false)}
        className="ml-1 inline-flex items-center justify-center w-5 h-5 bg-blue-500 rounded-sm cursor-pointer shrink-0"
      >
        <Info className="w-3 h-3 text-white" />
      </span>
      {visible && createPortal(
        <div
          style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999, maxWidth: 280 }}
          className="bg-gray-800 text-white text-xs rounded shadow-lg px-3 py-2 leading-relaxed pointer-events-none"
        >
          {text}
        </div>,
        document.body
      )}
    </>
  )
}

const inp = "border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 text-xs w-full focus:outline-none focus:border-blue-400 dark:bg-gray-700 dark:text-gray-100"
const sel = "border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-700 dark:text-gray-100"

const tdLbl = "px-3 py-1.5 text-right text-xs font-semibold text-blue-900 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 whitespace-nowrap w-44"
const tdVal = "px-2 py-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"

function Row({ label, children, colSpan = false }) {
  return (
    <tr>
      <td className={tdLbl}>{label}</td>
      {colSpan ? <td className={tdVal} colSpan={3}>{children}</td> : children}
    </tr>
  )
}

function Cell({ label, children }) {
  return (
    <>
      <td className={tdLbl}>{label}</td>
      <td className={tdVal}>{children}</td>
    </>
  )
}

// ─── FORMULÁRIO ──────────────────────────────────────────────────────────────
export function FormView({ editItem, partes, onSaved, onCancelEdit }) {
  const [form, setForm] = useState(EMPTY)
  const [acao, setAcao] = useState('alterar')
  const [status, setStatus] = useState({ msg: '', type: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setAcao('alterar')
    if (editItem) {
      setForm({
        nome: editItem.nome || '',
        parte_veiculo: editItem.parte_veiculo || '',
        uso: editItem.uso || 'Veículo',
        descricao: editItem.descricao || '',
        nr_dias_validade: editItem.nr_dias_validade ?? '',
        nr_dias_notificacao: editItem.nr_dias_notificacao ?? '',
        hodometro_km_validade: editItem.hodometro_km_validade ?? '',
        hodometro_km_notificacao: editItem.hodometro_km_notificacao ?? '',
        categoria_servico: editItem.categoria_servico || '',
        valor_sugerido: editItem.valor_sugerido ?? '',
        alerta_servico_realizado: editItem.alerta_servico_realizado || '',
        tempo_execucao: editItem.tempo_execucao || '',
        nr_dias_alerta_servico: editItem.nr_dias_alerta_servico ?? '',
        ativo: editItem.ativo ?? true,
      })
    } else {
      setForm(EMPTY)
    }
  }, [editItem])

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [field]: val }))
  }

  const showStatus = (msg, type = 'success') => {
    setStatus({ msg, type })
    setTimeout(() => setStatus({ msg: '', type: '' }), 3000)
  }

  const payload = () => ({
    ...form,
    nr_dias_validade: form.nr_dias_validade === '' ? null : Number(form.nr_dias_validade),
    nr_dias_notificacao: form.nr_dias_notificacao === '' ? null : Number(form.nr_dias_notificacao),
    hodometro_km_validade: form.hodometro_km_validade === '' ? null : Number(form.hodometro_km_validade),
    hodometro_km_notificacao: form.hodometro_km_notificacao === '' ? null : Number(form.hodometro_km_notificacao),
    valor_sugerido: form.valor_sugerido === '' ? null : Number(form.valor_sugerido),
    nr_dias_alerta_servico: form.nr_dias_alerta_servico === '' ? null : Number(form.nr_dias_alerta_servico),
    parte_veiculo: form.parte_veiculo || null,
    uso: form.uso || null,
    descricao: form.descricao || null,
    categoria_servico: form.categoria_servico || null,
    alerta_servico_realizado: form.alerta_servico_realizado || null,
    tempo_execucao: form.tempo_execucao || null,
  })

  const handleSubmit = async () => {
    setLoading(true)
    try {
      let createdNome = null
      if (editItem && acao === 'excluir') {
        await axios.delete(`${API}/tipos-servico/${editItem.id}`)
        showStatus('Excluído com sucesso!')
      } else {
        if (!form.nome.trim()) { showStatus('Informe o Tipo de Serviço.', 'error'); setLoading(false); return }
        if (editItem) {
          await axios.put(`${API}/tipos-servico/${editItem.id}`, payload())
          showStatus('Atualizado com sucesso!')
        } else {
          const res = await axios.post(`${API}/tipos-servico`, payload())
          showStatus('Cadastrado com sucesso!')
          createdNome = res.data.nome
          setForm(EMPTY)
        }
      }
      onSaved(createdNome)
    } catch (err) {
      showStatus(err.response?.data?.detail || 'Erro ao salvar.', 'error')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3 max-w-4xl mx-auto">
      <h1 className="text-center text-base font-bold text-blue-700">
        Manutenção de Tipo de Serviço
      </h1>

      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <tbody>
            <Row label="Tipo de Serviço" colSpan>
              <input className={`${inp} border-red-400`} value={form.nome} onChange={set('nome')} placeholder="Obrigatório" />
            </Row>

            <tr>
              <td className="px-3 py-1.5 text-right text-xs font-semibold text-blue-900 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 whitespace-nowrap w-44">Parte do Veículo</td>
              <td className="px-2 py-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <select className={sel} value={form.parte_veiculo} onChange={set('parte_veiculo')}>
                  <option value=""></option>
                  {partes.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                </select>
              </td>
              <td className="px-3 py-1.5 text-center text-xs font-semibold text-blue-900 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 whitespace-nowrap">Uso</td>
              <td className="px-2 py-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <select className={sel} value={form.uso} onChange={set('uso')}>
                  <option>Veículo</option>
                  <option>Equipamento</option>
                  <option>Frota</option>
                </select>
              </td>
            </tr>

            <Row label="Descrição" colSpan>
              <input className={inp} value={form.descricao} onChange={set('descricao')} />
            </Row>

            <tr>
              <Cell label="Nr. Dias Validade">
                <input type="number" className={`${inp} w-28`} value={form.nr_dias_validade} onChange={set('nr_dias_validade')} min={0} />
              </Cell>
              <Cell label="Nr. Dias Notificação Antes do Vencimento">
                <input type="number" className={`${inp} w-28`} value={form.nr_dias_notificacao} onChange={set('nr_dias_notificacao')} min={0} />
              </Cell>
            </tr>

            <tr>
              <Cell label="Hodômetro (Km) Validade">
                <input type="number" className={`${inp} w-28`} value={form.hodometro_km_validade} onChange={set('hodometro_km_validade')} min={0} />
              </Cell>
              <Cell label="Hodômetro (Km) Notificação Antes do Vencimento">
                <input type="number" className={`${inp} w-28`} value={form.hodometro_km_notificacao} onChange={set('hodometro_km_notificacao')} min={0} />
              </Cell>
            </tr>

            <tr>
              <Cell label="Categoria Serviço">
                <select className={sel} value={form.categoria_servico} onChange={set('categoria_servico')}>
                  <option value=""></option>
                  <option>Elétrica</option><option>Mecânica</option><option>Funilaria</option>
                  <option>Lubrificação</option><option>Pneus</option><option>Revisão</option><option>Outro</option>
                </select>
              </Cell>
              <Cell label="Valor Sugerido">
                <span className="flex items-center gap-1">
                  <input type="number" step="0.01" className={`${inp} w-28`} value={form.valor_sugerido} onChange={set('valor_sugerido')} min={0} />
                  <InfoTooltip text="Na manutenção de veículo, será sugerido esse valor quando utilizado esse serviço" />
                </span>
              </Cell>
            </tr>

            <tr>
              <Cell label="Alerta Serviço Realizado">
                <span className="flex items-center gap-1">
                  <select className={sel} value={form.alerta_servico_realizado} onChange={set('alerta_servico_realizado')}>
                    <option value=""></option>
                    <option>Nenhum</option><option>1 Dia</option><option>3 Dias</option>
                    <option>7 Dias</option><option>15 Dias</option><option>30 Dias</option>
                  </select>
                  <InfoTooltip text="Caso marcado Sim, nas manutenções de veículos será gerado um alerta caso tal serviço esteja sendo realizado antes do que está definido no campo nr. dias alerta de serviço realizado" />
                </span>
              </Cell>
              <Cell label="Tempo de Execução">
                <input className={`${inp} w-28`} value={form.tempo_execucao} onChange={set('tempo_execucao')} placeholder="Ex: 2h30m" />
              </Cell>
            </tr>

            <Row label="Nr. Dias Alerta Serviço Realizado" colSpan>
              <span className="flex items-center gap-1">
                <input type="number" className={`${inp} w-28`} value={form.nr_dias_alerta_servico} onChange={set('nr_dias_alerta_servico')} min={0} />
                <InfoTooltip text="Campo atua em conjunto com campo alerta serviço realizado" />
              </span>
            </Row>

            <Row label="Ativo" colSpan>
              <select className={sel} value={form.ativo ? 'Sim' : 'Não'} onChange={(e) => setForm(f => ({ ...f, ativo: e.target.value === 'Sim' }))}>
                <option>Sim</option><option>Não</option>
              </select>
            </Row>

            <Row label="Ação:" colSpan>
              <span className="flex items-center gap-4 text-xs">
                {editItem ? (
                  <>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" name="acao" checked={acao === 'alterar'} onChange={() => setAcao('alterar')} /> Alterar
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer text-red-600">
                      <input type="radio" name="acao" checked={acao === 'excluir'} onChange={() => setAcao('excluir')} /> Excluir
                    </label>
                  </>
                ) : (
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" checked readOnly /> Inserir
                  </label>
                )}
              </span>
            </Row>
          </tbody>
        </table>

        <div className="bg-gray-100 dark:bg-gray-700 border-t border-gray-300 dark:border-gray-600 flex items-center justify-center gap-3 py-2">
          <button onClick={handleSubmit} disabled={loading}
            className="px-6 py-1 text-xs bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-400 dark:border-gray-500 rounded hover:bg-gray-50 dark:hover:bg-gray-500 shadow-sm">
            {loading ? 'Salvando...' : 'Confirmar'}
          </button>
          {editItem && (
            <button onClick={onCancelEdit}
              className="px-4 py-1 text-xs bg-white dark:bg-gray-600 dark:text-gray-200 border border-gray-400 dark:border-gray-500 rounded hover:bg-gray-50 dark:hover:bg-gray-500 shadow-sm">
              Cancelar
            </button>
          )}
        </div>

        <div className={`px-3 py-1.5 text-xs flex items-center gap-2 border-t border-gray-300 dark:border-gray-600 ${
          status.type === 'error' ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400' :
          status.msg ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-400 dark:text-blue-500'}`}>
          <span className="font-semibold">Status:</span>
          {status.type === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
          {status.type === 'success' && <CheckCircle className="w-3.5 h-3.5" />}
          {status.msg}
        </div>
      </div>

      <div className="text-center">
        <button onClick={onCancelEdit} className="text-xs text-blue-600 hover:underline font-medium">
          ← Listagem de Tipo de Serviço
        </button>
      </div>
    </div>
  )
}

// ─── MODAL POPUP (usado pelo LookupField) ─────────────────────────────────────
export function TipoServicoModal({ onClose, onSelected }) {
  const [partes, setPartes] = useState([])

  useEffect(() => {
    axios.get(`${API}/partes-veiculo/lookup`).then(r => setPartes(r.data)).catch(() => {})
  }, [])

  const handleSaved = (nome) => {
    if (nome) { onSelected(nome); onClose() }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center overflow-y-auto py-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 my-auto" onMouseDown={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-3 flex items-center justify-between rounded-t-xl sticky top-0 z-10">
          <span className="text-white font-bold text-sm">Cadastro de Tipo de Serviço</span>
          <button type="button" onClick={onClose} className="text-blue-200 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">
          <FormView editItem={null} partes={partes} onSaved={handleSaved} onCancelEdit={onClose} />
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── LISTAGEM ─────────────────────────────────────────────────────────────────
export default function CadastroTipoServico() {
  const [view, setView] = useState('list') // 'list' | 'form'
  const [editItem, setEditItem] = useState(null)
  const [partes, setPartes] = useState([])

  // listagem
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const [sortField, setSortField] = useState('')
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  // filtros
  const [fNome, setFNome] = useState('')
  const [fDesc, setFDesc] = useState('')
  const [fParte, setFParte] = useState('')
  const [fUso, setFUso] = useState('')
  const [fAtivo, setFAtivo] = useState('')
  const [appliedFilters, setAppliedFilters] = useState({})

  const loadPartes = useCallback(async () => {
    try { const r = await axios.get(`${API}/partes-veiculo/lookup`); setPartes(r.data) } catch {}
  }, [])

  const loadList = useCallback(async (filters = appliedFilters, pg = page, pp = perPage) => {
    setLoading(true)
    try {
      const params = { page: pg, per_page: pp, ...filters }
      const r = await axios.get(`${API}/tipos-servico`, { params })
      setItems(r.data.items)
      setTotal(r.data.total)
      setTotalPages(r.data.total_pages)
    } catch {}
    finally { setLoading(false) }
  }, [appliedFilters, page, perPage])

  useEffect(() => { loadPartes(); loadList() }, [])

  useEffect(() => { loadList(appliedFilters, page, perPage) }, [page, perPage])

  const handleFiltrar = () => {
    const f = {}
    if (fNome) f.search = fNome
    if (fDesc) f.descricao = fDesc
    if (fParte) f.parte_veiculo = fParte
    if (fUso) f.uso = fUso
    if (fAtivo) f.ativo = fAtivo
    setAppliedFilters(f)
    setPage(1)
    loadList(f, 1, perPage)
  }

  const handleLimpar = () => {
    setFNome(''); setFDesc(''); setFParte(''); setFUso(''); setFAtivo('')
    setAppliedFilters({})
    setPage(1)
    loadList({}, 1, perPage)
  }

  const handleEdit = async (item) => {
    setEditItem(item)
    setView('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleNovo = () => { setEditItem(null); setView('form') }

  const handleSaved = () => {
    loadList()
    if (!editItem) {
      setStatusMsg('Cadastrado com sucesso!')
      setTimeout(() => setStatusMsg(''), 3000)
    } else {
      setView('list')
      setEditItem(null)
      setStatusMsg('Atualizado com sucesso!')
      setTimeout(() => setStatusMsg(''), 3000)
    }
  }

  const handleCancelEdit = () => { setView('list'); setEditItem(null) }

  // Paginação
  const pageNums = () => {
    const pages = []
    const max = 7
    let start = Math.max(1, page - Math.floor(max / 2))
    let end = Math.min(totalPages, start + max - 1)
    if (end - start < max - 1) start = Math.max(1, end - max + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }

  if (view === 'form') {
    return <FormView editItem={editItem} partes={partes} onSaved={handleSaved} onCancelEdit={handleCancelEdit} />
  }

  return (
    <div className="space-y-3 max-w-5xl mx-auto">
      <h1 className="text-center text-base font-bold text-blue-700">
        Listagem de Tipos de Serviço
      </h1>

      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm overflow-hidden">

        {/* Paginação superior */}
        <div className="bg-gray-100 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-1.5 py-0.5 text-xs border rounded disabled:opacity-40 bg-white dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500">«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-1.5 py-0.5 text-xs border rounded disabled:opacity-40 bg-white dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500">‹</button>
            {pageNums().map(n => (
              <button key={n} onClick={() => setPage(n)}
                className={`px-2 py-0.5 text-xs border rounded ${n === page ? 'bg-blue-700 text-white border-blue-700' : 'bg-white dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500'}`}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-1.5 py-0.5 text-xs border rounded disabled:opacity-40 bg-white dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500">›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="px-1.5 py-0.5 text-xs border rounded disabled:opacity-40 bg-white dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500">»</button>
          </div>
          <div className="flex items-center gap-2">
            <select className="border border-gray-300 rounded text-xs px-1 py-0.5 bg-blue-700 text-white"
              value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}>
              {[10, 20, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="text-center text-xs text-blue-600 py-1 border-b border-gray-200">
          {total === 0 ? 'Nenhum registro' : `${(page - 1) * perPage + 1} à ${Math.min(page * perPage, total)} de ${total}`}
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-100 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800/40">
                {[['nome','Tipo de Serviço','left'],['parte_veiculo','Parte do Veículo','left'],['nr_dias_validade','Dias Val.','center'],['nr_dias_notificacao','Dias Not.','center'],['hodometro_km_validade','Hodômetro Val. (Km)','center'],['hodometro_km_notificacao','Hodômetro Not. (Km)','center'],['ativo','Ativo','center']].map(([f,l,align]) => (
                  <th key={f} className={`px-2 py-1.5 text-${align} text-blue-800 dark:text-blue-300 font-semibold cursor-pointer select-none hover:bg-blue-200 dark:hover:bg-blue-900/30 whitespace-nowrap`} onClick={() => handleSort(f)}>
                    <span className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : ''}`}>{l} <SortIcon field={f} sortField={sortField} sortDir={sortDir} /></span>
                  </th>
                ))}
                <th className="px-2 py-1.5 text-center text-blue-800 dark:text-blue-300 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">
                  <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Carregando...
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Nenhum registro encontrado.</td></tr>
              ) : (sortField ? [...items].sort((a, b) => {
                  const va = a[sortField] ?? ''; const vb = b[sortField] ?? ''
                  return sortDir === 'asc' ? String(va).localeCompare(String(vb), 'pt-BR', { numeric: true }) : String(vb).localeCompare(String(va), 'pt-BR', { numeric: true })
                }) : items).map((item, idx) => (
                <tr key={item.id} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 ${idx % 2 === 0 ? 'dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                  <td className="px-2 py-1.5 font-medium dark:text-gray-200">{item.nome}</td>
                  <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{item.parte_veiculo || ''}</td>
                  <td className="px-2 py-1.5 text-center text-gray-600 dark:text-gray-400">{item.nr_dias_validade ?? ''}</td>
                  <td className="px-2 py-1.5 text-center text-gray-600 dark:text-gray-400">{item.nr_dias_notificacao ?? ''}</td>
                  <td className="px-2 py-1.5 text-center text-gray-600 dark:text-gray-400">{item.hodometro_km_validade ? item.hodometro_km_validade.toLocaleString('pt-BR') : ''}</td>
                  <td className="px-2 py-1.5 text-center text-gray-600 dark:text-gray-400">{item.hodometro_km_notificacao ? item.hodometro_km_notificacao.toLocaleString('pt-BR') : ''}</td>
                  <td className="px-2 py-1.5 text-center">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${item.ativo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {item.ativo ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-center">
                    <button onClick={() => handleEdit(item)} className="text-gray-400 hover:text-blue-600" title="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Filtros */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20 px-3 py-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900 dark:text-blue-300 w-28 text-right shrink-0">Tipo de Serviço</span>
              <input className="border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 flex-1 text-xs focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100" value={fNome} onChange={e => setFNome(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFiltrar()} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900 dark:text-blue-300 w-20 text-right shrink-0">Descrição</span>
              <input className="border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 flex-1 text-xs focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100" value={fDesc} onChange={e => setFDesc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFiltrar()} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900 dark:text-blue-300 w-28 text-right shrink-0">Parte do Veículo</span>
              <input className="border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 flex-1 text-xs focus:outline-none bg-white dark:bg-gray-700 dark:text-gray-100" value={fParte} onChange={e => setFParte(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFiltrar()} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900 dark:text-blue-300 w-20 text-right shrink-0">Uso</span>
              <select className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none flex-1" value={fUso} onChange={e => setFUso(e.target.value)}>
                <option value=""></option><option>Veículo</option><option>Equipamento</option><option>Frota</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900 dark:text-blue-300 w-28 text-right shrink-0">Ativo</span>
              <select className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none" value={fAtivo} onChange={e => setFAtivo(e.target.value)}>
                <option value=""></option><option value="true">Sim</option><option value="false">Não</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-center">
            <button onClick={handleFiltrar} className="px-5 py-1 text-xs bg-white dark:bg-gray-700 dark:text-gray-200 border border-gray-400 dark:border-gray-500 rounded hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm">Filtrar</button>
            <button onClick={handleLimpar} className="px-5 py-1 text-xs bg-white dark:bg-gray-700 dark:text-gray-200 border border-gray-400 dark:border-gray-500 rounded hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm">Limpar</button>
          </div>
        </div>

        {/* Status bar */}
        <div className={`px-3 py-1.5 text-xs flex items-center gap-2 border-t border-gray-300 dark:border-gray-600 ${statusMsg ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-400 dark:text-blue-500'}`}>
          <span className="font-semibold">Status:</span>
          {statusMsg && <CheckCircle className="w-3.5 h-3.5" />}
          {statusMsg}
        </div>
      </div>

      {/* Link adicionar */}
      <div className="text-center">
        <button onClick={handleNovo} className="text-xs text-blue-600 hover:underline font-medium">
          Adicionar Tipo de Serviço
        </button>
      </div>
    </div>
  )
}
