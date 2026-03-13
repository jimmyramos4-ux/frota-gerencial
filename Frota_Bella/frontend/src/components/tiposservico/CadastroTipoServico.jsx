import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Pencil, RefreshCw, AlertCircle, CheckCircle, Settings } from 'lucide-react'

const API = 'http://localhost:8000/api'

const EMPTY = {
  nome: '', parte_veiculo: '', uso: 'Veículo', descricao: '',
  nr_dias_validade: '', nr_dias_notificacao: '',
  hodometro_km_validade: '', hodometro_km_notificacao: '',
  categoria_servico: '', valor_sugerido: '',
  bloqueia_no_periodo: false, bloqueia_depois_vencimento: false,
  alerta_servico_realizado: '', tempo_execucao: '',
  nr_dias_alerta_servico: '', ativo: true,
}

function LupaIcon() {
  return (
    <span className="ml-1 inline-flex items-center justify-center w-5 h-5 bg-yellow-400 rounded-sm cursor-pointer" title="Ajuda">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
        <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    </span>
  )
}

const inp = "border border-gray-300 rounded px-2 py-0.5 text-xs w-full focus:outline-none focus:border-blue-400"
const sel = "border border-gray-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-blue-400 bg-white"

const tdLbl = "px-3 py-1.5 text-right text-xs font-semibold text-blue-900 bg-blue-100 border border-blue-200 whitespace-nowrap w-44"
const tdVal = "px-2 py-1 border border-gray-200 bg-white"

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
function FormView({ editItem, partes, onSaved, onCancelEdit }) {
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState({ msg: '', type: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
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
        bloqueia_no_periodo: editItem.bloqueia_no_periodo || false,
        bloqueia_depois_vencimento: editItem.bloqueia_depois_vencimento || false,
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
    if (!form.nome.trim()) { showStatus('Informe o Tipo de Serviço.', 'error'); return }
    setLoading(true)
    try {
      if (editItem) {
        await axios.put(`${API}/tipos-servico/${editItem.id}`, payload())
        showStatus('Atualizado com sucesso!')
      } else {
        await axios.post(`${API}/tipos-servico`, payload())
        showStatus('Cadastrado com sucesso!')
        setForm(EMPTY)
      }
      onSaved()
    } catch (err) {
      showStatus(err.response?.data?.detail || 'Erro ao salvar.', 'error')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3 max-w-4xl mx-auto">
      <h1 className="text-center text-base font-bold text-blue-700">
        Manutenção de Tipo de Serviço
      </h1>

      <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <tbody>
            <Row label="Tipo de Serviço" colSpan>
              <input className={`${inp} border-red-400`} value={form.nome} onChange={set('nome')} placeholder="Obrigatório" />
            </Row>

            <tr>
              <td className="px-3 py-1.5 text-right text-xs font-semibold text-blue-900 bg-blue-100 border border-blue-200 whitespace-nowrap w-44">Parte do Veículo</td>
              <td className="px-2 py-1 border border-gray-200 bg-white">
                <select className={sel} value={form.parte_veiculo} onChange={set('parte_veiculo')}>
                  <option value=""></option>
                  {partes.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                </select>
              </td>
              <td className="px-3 py-1.5 text-center text-xs font-semibold text-blue-900 bg-blue-100 border border-blue-200 whitespace-nowrap">Uso</td>
              <td className="px-2 py-1 border border-gray-200 bg-white">
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
                  <LupaIcon />
                </span>
              </Cell>
            </tr>

            <Row label="Bloqueia Uso" colSpan>
              <span className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={form.bloqueia_no_periodo} onChange={set('bloqueia_no_periodo')} /> No Período
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={form.bloqueia_depois_vencimento} onChange={set('bloqueia_depois_vencimento')} /> Depois do Vencimento
                </label>
              </span>
            </Row>

            <tr>
              <Cell label="Alerta Serviço Realizado">
                <span className="flex items-center gap-1">
                  <select className={sel} value={form.alerta_servico_realizado} onChange={set('alerta_servico_realizado')}>
                    <option value=""></option>
                    <option>Nenhum</option><option>1 Dia</option><option>3 Dias</option>
                    <option>7 Dias</option><option>15 Dias</option><option>30 Dias</option>
                  </select>
                  <LupaIcon />
                </span>
              </Cell>
              <Cell label="Tempo de Execução">
                <span className="flex items-center gap-1">
                  <input className={`${inp} w-28`} value={form.tempo_execucao} onChange={set('tempo_execucao')} placeholder="Ex: 2h30m" />
                  <LupaIcon />
                </span>
              </Cell>
            </tr>

            <Row label="Nr. Dias Alerta Serviço Realizado" colSpan>
              <span className="flex items-center gap-1">
                <input type="number" className={`${inp} w-28`} value={form.nr_dias_alerta_servico} onChange={set('nr_dias_alerta_servico')} min={0} />
                <LupaIcon />
              </span>
            </Row>

            <Row label="Ativo" colSpan>
              <select className={sel} value={form.ativo ? 'Sim' : 'Não'} onChange={(e) => setForm(f => ({ ...f, ativo: e.target.value === 'Sim' }))}>
                <option>Sim</option><option>Não</option>
              </select>
            </Row>

            <Row label="Ação:" colSpan>
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input type="radio" checked readOnly /> {editItem ? 'Alterar' : 'Inserir'}
              </label>
            </Row>
          </tbody>
        </table>

        <div className="bg-gray-100 border-t border-gray-300 flex items-center justify-center gap-3 py-2">
          <button onClick={handleSubmit} disabled={loading}
            className="px-6 py-1 text-xs bg-white border border-gray-400 rounded hover:bg-gray-50 shadow-sm">
            {loading ? 'Salvando...' : 'Confirmar'}
          </button>
          {editItem && (
            <button onClick={onCancelEdit}
              className="px-4 py-1 text-xs bg-white border border-gray-400 rounded hover:bg-gray-50 shadow-sm">
              Cancelar
            </button>
          )}
        </div>

        <div className={`px-3 py-1.5 text-xs flex items-center gap-2 border-t border-gray-300 ${
          status.type === 'error' ? 'bg-red-100 text-red-700' :
          status.msg ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-400'}`}>
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

      <div className="bg-white border border-gray-300 rounded shadow-sm overflow-hidden">

        {/* Paginação superior */}
        <div className="bg-gray-100 border-b border-gray-300 px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-1.5 py-0.5 text-xs border rounded disabled:opacity-40 bg-white hover:bg-gray-50">«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-1.5 py-0.5 text-xs border rounded disabled:opacity-40 bg-white hover:bg-gray-50">‹</button>
            {pageNums().map(n => (
              <button key={n} onClick={() => setPage(n)}
                className={`px-2 py-0.5 text-xs border rounded ${n === page ? 'bg-blue-700 text-white border-blue-700' : 'bg-white hover:bg-gray-50'}`}>
                {n}
              </button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-1.5 py-0.5 text-xs border rounded disabled:opacity-40 bg-white hover:bg-gray-50">›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="px-1.5 py-0.5 text-xs border rounded disabled:opacity-40 bg-white hover:bg-gray-50">»</button>
          </div>
          <div className="flex items-center gap-2">
            <select className="border border-gray-300 rounded text-xs px-1 py-0.5 bg-blue-700 text-white"
              value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}>
              {[10, 20, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <button onClick={() => loadList()} className="text-gray-500 hover:text-blue-600">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="text-center text-xs text-blue-600 py-1 border-b border-gray-200">
          {total === 0 ? 'Nenhum registro' : `${(page - 1) * perPage + 1} à ${Math.min(page * perPage, total)} de ${total}`}
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-100 border-b border-blue-200">
                <th className="px-2 py-1.5 text-left text-blue-800 font-semibold">Tipo de Serviço</th>
                <th className="px-2 py-1.5 text-left text-blue-800 font-semibold">Parte do Veículo</th>
                <th className="px-2 py-1.5 text-center text-blue-800 font-semibold">Dias Val.</th>
                <th className="px-2 py-1.5 text-center text-blue-800 font-semibold">Dias Not.</th>
                <th className="px-2 py-1.5 text-center text-blue-800 font-semibold">Hodômetro Val. (Km)</th>
                <th className="px-2 py-1.5 text-center text-blue-800 font-semibold">Hodômetro Not. (Km)</th>
                <th className="px-2 py-1.5 text-center text-blue-800 font-semibold">Bloqueia Uso</th>
                <th className="px-2 py-1.5 text-center text-blue-800 font-semibold">Ativo</th>
                <th className="px-2 py-1.5 text-center text-blue-800 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">
                  <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Carregando...
                </td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Nenhum registro encontrado.</td></tr>
              ) : items.map((item, idx) => (
                <tr key={item.id} className={`border-b border-gray-100 hover:bg-blue-50 ${idx % 2 === 0 ? '' : 'bg-gray-50'}`}>
                  <td className="px-2 py-1.5 font-medium">{item.nome}</td>
                  <td className="px-2 py-1.5 text-gray-600">{item.parte_veiculo || ''}</td>
                  <td className="px-2 py-1.5 text-center text-gray-600">{item.nr_dias_validade ?? ''}</td>
                  <td className="px-2 py-1.5 text-center text-gray-600">{item.nr_dias_notificacao ?? ''}</td>
                  <td className="px-2 py-1.5 text-center text-gray-600">{item.hodometro_km_validade ? item.hodometro_km_validade.toLocaleString('pt-BR') : ''}</td>
                  <td className="px-2 py-1.5 text-center text-gray-600">{item.hodometro_km_notificacao ? item.hodometro_km_notificacao.toLocaleString('pt-BR') : ''}</td>
                  <td className="px-2 py-1.5 text-center text-gray-500">
                    {(item.bloqueia_no_periodo || item.bloqueia_depois_vencimento)
                      ? (item.bloqueia_no_periodo && item.bloqueia_depois_vencimento ? 'Período/Venc.' : item.bloqueia_no_periodo ? 'No Período' : 'Depois Venc.')
                      : ''}
                  </td>
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
        <div className="border-t border-gray-200 bg-blue-50 px-3 py-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900 w-28 text-right shrink-0">Tipo de Serviço</span>
              <input className="border border-gray-300 rounded px-2 py-0.5 flex-1 text-xs focus:outline-none" value={fNome} onChange={e => setFNome(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFiltrar()} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900 w-20 text-right shrink-0">Descrição</span>
              <input className="border border-gray-300 rounded px-2 py-0.5 flex-1 text-xs focus:outline-none" value={fDesc} onChange={e => setFDesc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFiltrar()} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900 w-28 text-right shrink-0">Parte do Veículo</span>
              <input className="border border-gray-300 rounded px-2 py-0.5 flex-1 text-xs focus:outline-none" value={fParte} onChange={e => setFParte(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFiltrar()} />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900 w-20 text-right shrink-0">Uso</span>
              <select className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white focus:outline-none flex-1" value={fUso} onChange={e => setFUso(e.target.value)}>
                <option value=""></option><option>Veículo</option><option>Equipamento</option><option>Frota</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900 w-28 text-right shrink-0">Ativo</span>
              <select className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white focus:outline-none" value={fAtivo} onChange={e => setFAtivo(e.target.value)}>
                <option value=""></option><option value="true">Sim</option><option value="false">Não</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-center">
            <button onClick={handleFiltrar} className="px-5 py-1 text-xs bg-white border border-gray-400 rounded hover:bg-gray-50 shadow-sm">Filtrar</button>
            <button onClick={handleLimpar} className="px-5 py-1 text-xs bg-white border border-gray-400 rounded hover:bg-gray-50 shadow-sm">Limpar</button>
          </div>
        </div>

        {/* Status bar */}
        <div className={`px-3 py-1.5 text-xs flex items-center gap-2 border-t border-gray-300 ${statusMsg ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-400'}`}>
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
