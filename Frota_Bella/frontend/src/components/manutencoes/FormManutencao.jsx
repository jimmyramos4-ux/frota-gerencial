import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import axios from 'axios'
import {
  Search, Trash2, Save, ChevronLeft,
  AlertCircle, CheckCircle, Loader2,
  Car, User, Wrench, Calendar, ClipboardList, Pencil, X,
  Paperclip, ImagePlus, FileText, Download, ChevronLeft as ChevronLeftLb, ChevronRight,
  Package, ArrowUpCircle,
} from 'lucide-react'
import LookupField from '../shared/LookupField.jsx'
import { TipoServicoModal } from '../tiposservico/CadastroTipoServico.jsx'
import { ParteVeiculoModal } from '../partesveiculo/CadastroParteVeiculo.jsx'
import { OficinaPrestadorModal } from '../oficinasprestadores/CadastroOficinaPrestador.jsx'
import { AtivoModal } from '../ativos/CadastroAtivos.jsx'
import { API } from '../../lib/config'


const emptyForm = {
  veiculo_id: '', ativo_id: '', motorista_id: '',
  km_entrada: '', horimetro_entrada: '',
  dt_inicio: '', dt_previsao: '', dt_termino: '',
  responsavel_manutencao: '', requisitante: '',
  status: 'Em Andamento', prioridade: '', tipo: '',
  servicos_solicitados: '', observacao: '',
}

const emptyServico = {
  status: 'Em Andamento', parte_veiculo: '', servico: '',
  tipo_uso: '', dt_servico: '', proxima_dt_validade: '',
  proximo_km_validade: '', pessoa_responsavel: '',
  descricao: '', valor: '', horas_trabalhadas: '',
  _nr_dias_validade: '',
}

function calcProxDt(dtServico, nrDias) {
  if (!dtServico || !nrDias) return ''
  const dt = new Date(dtServico)
  dt.setDate(dt.getDate() + Number(nrDias))
  return dt.toISOString().split('T')[0]
}

function fmtDate(d) {
  if (!d) return '-'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function dtToInput(dt) {
  if (!dt) return ''
  const d = new Date(dt)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function fmtMoney(v) {
  if (v == null || v === '') return ''
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

function CurrencyInput({ value, onChange, className }) {
  const [editing, setEditing] = React.useState(false)
  const [raw, setRaw] = React.useState('')
  const fmt = (v) => {
    const n = parseFloat(v)
    if (!v || isNaN(n)) return ''
    return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  const handleFocus = (e) => {
    const n = parseFloat(value)
    setRaw(!value || isNaN(n) ? '' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    setEditing(true)
    setTimeout(() => e.target.select(), 0)
  }
  const handleBlur = () => {
    setEditing(false)
    const clean = raw.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim()
    const n = parseFloat(clean)
    onChange(isNaN(n) ? '' : String(n))
  }
  return (
    <input type="text" className={className}
      value={editing ? raw : fmt(value)}
      onChange={e => setRaw(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder="R$ 0,00"
    />
  )
}

const inp = "border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-700 dark:text-gray-100"
const sel = "border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-700 dark:text-gray-100"

const statusBadge = {
  'Em Andamento': 'bg-blue-500 text-white',
  'Finalizado':   'bg-green-500 text-white',
  'Cancelado':    'bg-red-500 text-white',
}
const priorBadge = {
  Alta:  'bg-red-100 text-red-700 font-bold',
  Média: 'bg-orange-100 text-orange-700 font-bold',
  Baixa: 'bg-green-100 text-green-700 font-bold',
}

function SectionHeader({ icon: Icon, title, right }) {
  return (
    <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-2.5 flex items-center justify-between">
      <span className="flex items-center gap-2 text-white font-bold text-sm">
        {Icon && <Icon className="w-4 h-4" />}
        {title}
      </span>
      {right && <span className="text-blue-200 text-xs">{right}</span>}
    </div>
  )
}

function Lbl({ children }) {
  return <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">{children}</label>
}

// ── Modal Usar Peça ───────────────────────────────────────────────────────────
function ModalUsarPeca({ manutencaoId, onClose, pendingPecas = [], onAddPending, onRemovePending }) {
  const isLocalMode = !manutencaoId
  const [pecaSearch, setPecaSearch] = React.useState('')
  const [sugestoes, setSugestoes] = React.useState([])
  const [pecaSelecionada, setPecaSelecionada] = React.useState(null)
  const [showDrop, setShowDrop] = React.useState(false)
  const [quantidade, setQuantidade] = React.useState('')
  const [observacao, setObservacao] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [err, setErr] = React.useState('')
  const [pecasUsadas, setPecasUsadas] = React.useState([])
  const [loadingUsadas, setLoadingUsadas] = React.useState(false)

  const miniInp = "border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:border-blue-400 bg-white dark:bg-gray-700 dark:text-gray-100"

  const loadPecasUsadas = React.useCallback(() => {
    if (isLocalMode) return
    setLoadingUsadas(true)
    axios.get(`${API}/movimentos-estoque`, { params: { manutencao_id: manutencaoId } })
      .then(r => setPecasUsadas(r.data))
      .catch(() => {})
      .finally(() => setLoadingUsadas(false))
  }, [manutencaoId, isLocalMode])

  React.useEffect(() => { loadPecasUsadas() }, [loadPecasUsadas])

  React.useEffect(() => {
    if (pecaSearch.length < 1) { setSugestoes([]); return }
    axios.get(`${API}/pecas`, { params: { q: pecaSearch, per_page: 15 } })
      .then(r => setSugestoes(r.data.items))
      .catch(() => {})
  }, [pecaSearch])

  const selectPeca = (p) => { setPecaSelecionada(p); setPecaSearch(p.nome); setShowDrop(false) }

  const handleConfirmar = async () => {
    if (!pecaSelecionada) { setErr('Selecione uma peça'); return }
    if (!quantidade || Number(quantidade) <= 0) { setErr('Informe a quantidade'); return }
    setErr('')
    if (isLocalMode) {
      onAddPending({ _tempId: Date.now(), peca_id: pecaSelecionada.id, peca_nome: pecaSelecionada.nome, peca_unidade: pecaSelecionada.unidade, quantidade: Number(quantidade), observacao: observacao || null })
      setPecaSelecionada(null); setPecaSearch(''); setQuantidade(''); setObservacao('')
      return
    }
    setSaving(true)
    try {
      await axios.post(`${API}/movimentos-estoque`, {
        peca_id: pecaSelecionada.id, tipo: 'saida', quantidade: Number(quantidade),
        manutencao_id: Number(manutencaoId), observacao: observacao || null, usuario: 'Manutenção',
      })
      setPecaSelecionada(null); setPecaSearch(''); setQuantidade(''); setObservacao('')
      loadPecasUsadas()
    } catch (ex) {
      setErr(ex.response?.data?.detail || 'Erro ao registrar saída')
    } finally { setSaving(false) }
  }

  const handleRemover = async (mv) => {
    if (!window.confirm('Remover o uso desta peça?')) return
    if (isLocalMode) { onRemovePending(mv._tempId); return }
    try {
      await axios.delete(`${API}/movimentos-estoque/${mv.id}`)
      loadPecasUsadas()
    } catch {}
  }

  const displayedPecas = isLocalMode ? pendingPecas : pecasUsadas

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 to-purple-500 px-5 py-3 rounded-t-xl flex items-center justify-between flex-shrink-0">
          <span className="text-white font-bold text-sm flex items-center gap-2">
            <Package className="w-4 h-4" />
            Usar Peça do Estoque {manutencaoId ? `— OS #${manutencaoId}` : ''}
          </span>
          <button onClick={onClose} className="text-purple-200 hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Formulário */}
          {err && (
            <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{err}
            </div>
          )}

          {/* Busca de peça */}
          <div className="relative">
            <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">
              Peça <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-1">
              <input className={miniInp} value={pecaSearch}
                onChange={e => { setPecaSearch(e.target.value); setShowDrop(true); setPecaSelecionada(null) }}
                onFocus={() => setShowDrop(true)}
                onBlur={() => setTimeout(() => setShowDrop(false), 200)}
                placeholder="Buscar peça por nome ou código..." />
              <button type="button" onClick={() => setShowDrop(d => !d)}
                className="border border-gray-300 dark:border-gray-600 rounded px-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 text-purple-600 dark:text-purple-400 transition-colors">
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>
            {showDrop && sugestoes.length > 0 && (
              <ul className="absolute z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg mt-0.5 w-full max-h-36 overflow-y-auto text-xs">
                {sugestoes.map(p => (
                  <li key={p.id} onMouseDown={() => selectPeca(p)}
                    className="px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-900/30 cursor-pointer border-b border-gray-50 dark:border-gray-700 last:border-0 flex items-center justify-between">
                    <span className="font-semibold dark:text-gray-200">{p.nome}</span>
                    <span className="text-gray-400 dark:text-gray-500">
                      {p.codigo ? `${p.codigo} · ` : ''}Estoque: {Number(p.estoque_atual ?? 0).toLocaleString('pt-BR')} {p.unidade}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {pecaSelecionada && (
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                Estoque disponível: <strong>{Number(pecaSelecionada.estoque_atual ?? 0).toLocaleString('pt-BR')} {pecaSelecionada.unidade}</strong>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Quantidade <span className="text-red-500">*</span></label>
              <input className={miniInp} type="number" step="0.001" min="0.001"
                value={quantidade} onChange={e => setQuantidade(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Observação</label>
              <input className={miniInp} value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Observação..." />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={handleConfirmar} disabled={saving}
              className="px-5 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-colors">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpCircle className="w-3.5 h-3.5" />}
              {saving ? 'Registrando...' : 'Confirmar Saída'}
            </button>
          </div>

          {/* Lista de peças já usadas nessa OS */}
          <div>
            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2 border-t border-gray-200 dark:border-gray-700 pt-3">
              Peças já utilizadas nesta OS
            </p>
            {loadingUsadas ? (
              <div className="flex items-center gap-2 text-xs text-gray-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando...</div>
            ) : displayedPecas.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">Nenhuma peça registrada nesta OS.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-800/40">
                    <th className="px-2 py-1.5 text-left text-purple-800 dark:text-purple-300 font-semibold">Peça</th>
                    <th className="px-2 py-1.5 text-right text-purple-800 dark:text-purple-300 font-semibold">Qtd</th>
                    <th className="px-2 py-1.5 text-left text-purple-800 dark:text-purple-300 font-semibold">Obs</th>
                    <th className="px-2 py-1.5 text-center text-purple-800 dark:text-purple-300 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {displayedPecas.map((mv, i) => (
                    <tr key={mv._tempId || mv.id}
                      className={`border-b border-gray-100 dark:border-gray-700 ${i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                      <td className="px-2 py-1.5 font-semibold dark:text-gray-200">{mv.peca_nome}</td>
                      <td className="px-2 py-1.5 text-right tabular-nums dark:text-gray-300">{Number(mv.quantidade).toLocaleString('pt-BR')} {mv.peca_unidade}</td>
                      <td className="px-2 py-1.5 text-gray-500 dark:text-gray-400">{mv.observacao || '-'}</td>
                      <td className="px-2 py-1.5 text-center">
                        <button onClick={() => handleRemover(mv)} title="Remover"
                          className="p-0.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FormManutencao() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(emptyForm)
  const [tipoEntidade, setTipoEntidade] = useState('veiculo') // 'veiculo' | 'ativo'
  const [veiculos, setVeiculos] = useState([])
  const [ativos, setAtivos] = useState([])
  const [motoristas, setMotoristas] = useState([])
  const [veiculoDesc, setVeiculoDesc] = useState('')
  const [ativoDesc, setAtivoDesc] = useState('')
  const [motoristaDesc, setMotoristaDesc] = useState('')
  const [veiculoSearch, setVeiculoSearch] = useState('')
  const [ativoSearch, setAtivoSearch] = useState('')
  const [motoristaSearch, setMotoristaSearch] = useState('')
  const [showVeiculoDrop, setShowVeiculoDrop] = useState(false)
  const [showAtivoDrop, setShowAtivoDrop] = useState(false)
  const [showMotoristaDrop, setShowMotoristaDrop] = useState(false)
  const [ativoModalOpen, setAtivoModalOpen] = useState(false)
  const [servicos, setServicos] = useState([])
  const [newServico, setNewServico] = useState(emptyServico)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [solicitacoesVeiculo, setSolicitacoesVeiculo] = useState([])
  const [solicitacoesRemovidas, setSolicitacoesRemovidas] = useState([])
  const [tipoServicoModalCb, setTipoServicoModalCb] = useState(null)
  const [parteVeiculoModalCb, setParteVeiculoModalCb] = useState(null)
  const [oficinaModalCb, setOficinaModalCb] = useState(null)
  const [arquivos, setArquivos] = useState([])
  const [pendingFiles, setPendingFiles] = useState([]) // {file, preview} para nova manutenção
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState(null) // { images: [], idx: 0 }
  const [usarPecaOpen, setUsarPecaOpen] = useState(false)
  const [pendingPecas, setPendingPecas] = useState([])
  const [pecasUsadasOS, setPecasUsadasOS] = useState([])
  const fileInputRef = useRef()

  const loadAtivos = () => axios.get(`${API}/ativos`, { params: { per_page: 200 } }).then(r => setAtivos(r.data.items))

  useEffect(() => {
    axios.get(`${API}/veiculos`).then(r => setVeiculos(r.data))
    axios.get(`${API}/motoristas`).then(r => setMotoristas(r.data))
    loadAtivos()
  }, [])

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    axios.get(`${API}/manutencoes/${id}`)
      .then(r => {
        const m = r.data
        if (m.ativo_id && !m.veiculo_id) {
          setTipoEntidade('ativo')
          setAtivoSearch(m.ativo?.nome || '')
          setAtivoDesc(m.ativo?.tipo || '')
        }
        setForm({
          veiculo_id: m.veiculo_id || '',
          ativo_id: m.ativo_id || '',
          motorista_id: m.motorista_id || '',
          km_entrada: m.km_entrada || '',
          horimetro_entrada: m.horimetro_entrada || '',
          dt_inicio: dtToInput(m.dt_inicio),
          dt_previsao: dtToInput(m.dt_previsao),
          dt_termino: dtToInput(m.dt_termino),
          responsavel_manutencao: m.responsavel_manutencao || '',
          requisitante: m.requisitante || '',
          status: m.status || 'Em Andamento',
          prioridade: m.prioridade || '',
          tipo: m.tipo || '',
          servicos_solicitados: m.servicos_solicitados || '',
          observacao: m.observacao || '',
        })
        if (m.veiculo) {
          setVeiculoSearch(m.veiculo.placa)
          setVeiculoDesc(m.veiculo.descricao)
          axios.get(`${API}/solicitacoes`, { params: { manutencao_id: Number(id), per_page: 100 } })
            .then(r => setSolicitacoesVeiculo(r.data.items))
            .catch(() => {})
        }
        if (m.ativo) {
          axios.get(`${API}/solicitacoes`, { params: { manutencao_id: Number(id), per_page: 100 } })
            .then(r => setSolicitacoesVeiculo(r.data.items))
            .catch(() => {})
        }
        if (m.motorista) { setMotoristaSearch(m.motorista.codigo); setMotoristaDesc(m.motorista.nome) }
        setServicos(m.servicos || [])
        setArquivos(m.arquivos || [])
        axios.get(`${API}/movimentos-estoque`, { params: { manutencao_id: Number(id) } })
          .then(r => setPecasUsadasOS(r.data))
          .catch(() => {})
      })
      .catch(() => setError('Erro ao carregar manutenção'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const filteredVeiculos = veiculos.filter(v =>
    v.placa.toLowerCase().includes(veiculoSearch.toLowerCase()) ||
    (v.descricao || '').toLowerCase().includes(veiculoSearch.toLowerCase())
  )
  const filteredAtivos = ativos.filter(a =>
    a.nome.toLowerCase().includes(ativoSearch.toLowerCase()) ||
    (a.codigo || '').toLowerCase().includes(ativoSearch.toLowerCase())
  )
  const filteredMotoristas = motoristas.filter(m =>
    m.codigo.toLowerCase().includes(motoristaSearch.toLowerCase()) ||
    m.nome.toLowerCase().includes(motoristaSearch.toLowerCase())
  )

  const selectVeiculo = (v) => {
    setForm(f => ({ ...f, veiculo_id: v.id, km_entrada: v.ultimo_km ? String(v.ultimo_km) : f.km_entrada }))
    setVeiculoSearch(v.placa)
    setVeiculoDesc(v.descricao)
    setShowVeiculoDrop(false)
    setSolicitacoesRemovidas([])
    axios.get(`${API}/solicitacoes`, { params: { veiculo_id: v.id, status: 'Aberta', per_page: 100 } })
      .then(r => setSolicitacoesVeiculo(r.data.items))
      .catch(() => setSolicitacoesVeiculo([]))
  }

  const selectAtivo = (a) => {
    setForm(f => ({ ...f, ativo_id: a.id, veiculo_id: '' }))
    setAtivoSearch(a.nome)
    setAtivoDesc(a.tipo || '')
    setShowAtivoDrop(false)
    setSolicitacoesRemovidas([])
    axios.get(`${API}/solicitacoes`, { params: { ativo_id: a.id, status: 'Aberta', per_page: 100 } })
      .then(r => setSolicitacoesVeiculo(r.data.items))
      .catch(() => setSolicitacoesVeiculo([]))
  }

  const removeSolicitacao = (sol) => {
    setSolicitacoesVeiculo(s => s.filter(x => x.id !== sol.id))
    setSolicitacoesRemovidas(s => [...s, sol])
  }
  const selectMotorista = (m) => { setForm(f => ({ ...f, motorista_id: m.id })); setMotoristaSearch(m.codigo); setMotoristaDesc(m.nome); setShowMotoristaDrop(false) }

  const setF = key => e => setForm(f => ({ ...f, [key]: e.target.value }))
  const setSf = key => e => setNewServico(s => ({ ...s, [key]: e.target.value }))

  const handleAddServico = async () => {
    if (!isEdit) { setServicos(s => [...s, { ...newServico, id: Date.now(), _new: true }]); setNewServico(emptyServico); return }
    try {
      const payload = { ...newServico, tipo_uso: newServico.tipo_uso || null, status: newServico.status || 'Em Andamento', valor: newServico.valor ? Number(newServico.valor) : null, proximo_km_validade: newServico.proximo_km_validade ? Number(newServico.proximo_km_validade) : null, dt_servico: newServico.dt_servico || null, proxima_dt_validade: newServico.proxima_dt_validade || null }
      const res = await axios.post(`${API}/manutencoes/${id}/servicos`, payload)
      setServicos(s => [...s, res.data]); setNewServico(emptyServico)
    } catch { setError('Erro ao adicionar serviço') }
  }

  const handleDeleteServico = async (servico) => {
    if (servico._new || !isEdit) { setServicos(s => s.filter(x => x.id !== servico.id)); return }
    try { await axios.delete(`${API}/servicos/${servico.id}`); setServicos(s => s.filter(x => x.id !== servico.id)) }
    catch { setError('Erro ao remover serviço') }
  }

  const startEdit = (s) => {
    setEditingId(s.id)
    setEditForm({
      status: s.status || 'Em Andamento',
      parte_veiculo: s.parte_veiculo || '',
      servico: s.servico || '',
      tipo_uso: s.tipo_uso || '',
      dt_servico: s.dt_servico || '',
      proxima_dt_validade: s.proxima_dt_validade || '',
      proximo_km_validade: s.proximo_km_validade || '',
      pessoa_responsavel: s.pessoa_responsavel || '',
      descricao: s.descricao || '',
      valor: s.valor || '',
      horas_trabalhadas: s.horas_trabalhadas || '',
    })
  }

  const cancelEdit = () => { setEditingId(null); setEditForm({}) }

  const setEf = key => e => setEditForm(f => ({ ...f, [key]: e.target.value }))

  const handleSaveEdit = async (s) => {
    const payload = {
      ...editForm,
      tipo_uso: editForm.tipo_uso || null,
      valor: editForm.valor ? Number(editForm.valor) : null,
      proximo_km_validade: editForm.proximo_km_validade ? Number(editForm.proximo_km_validade) : null,
      dt_servico: editForm.dt_servico || null,
      proxima_dt_validade: editForm.proxima_dt_validade || null,
    }
    if (s._new || !isEdit) {
      setServicos(sv => sv.map(x => x.id === s.id ? { ...x, ...payload } : x))
      cancelEdit(); return
    }
    try {
      const res = await axios.put(`${API}/servicos/${s.id}`, payload)
      setServicos(sv => sv.map(x => x.id === s.id ? res.data : x))
      cancelEdit()
    } catch { setError('Erro ao salvar serviço') }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.veiculo_id && !form.ativo_id) { setError('Selecione um Veículo ou Ativo'); return }
    if (servicos.length === 0) { setError('Adicione ao menos um Serviço Veículo antes de confirmar'); return }
    if (['Finalizada', 'Cancelada'].includes(form.status) && !form.dt_termino) { setError('Informe a Data de Término antes de finalizar ou cancelar a manutenção'); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      const payload = { ...form, veiculo_id: form.veiculo_id ? Number(form.veiculo_id) : null, ativo_id: form.ativo_id ? Number(form.ativo_id) : null, motorista_id: form.motorista_id ? Number(form.motorista_id) : null, km_entrada: form.km_entrada ? Number(form.km_entrada) : null, horimetro_entrada: form.horimetro_entrada || null, dt_inicio: form.dt_inicio || null, dt_previsao: form.dt_previsao || null, dt_termino: form.dt_termino || null, prioridade: form.prioridade || null, tipo: form.tipo || null }
      let res
      if (isEdit) {
        res = await axios.put(`${API}/manutencoes/${id}`, payload)
      } else {
        res = await axios.post(`${API}/manutencoes`, payload)
        for (const s of servicos.filter(x => x._new)) {
          const { id: _, _new, ...sRaw } = s
          await axios.post(`${API}/manutencoes/${res.data.id}/servicos`, { ...sRaw, tipo_uso: sRaw.tipo_uso || null, status: sRaw.status || 'Em Andamento', valor: sRaw.valor ? Number(sRaw.valor) : null, proximo_km_validade: sRaw.proximo_km_validade ? Number(sRaw.proximo_km_validade) : null, dt_servico: sRaw.dt_servico || null, proxima_dt_validade: sRaw.proxima_dt_validade || null })
        }
        for (const { file } of pendingFiles) {
          const conteudo = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = e => resolve(e.target.result); r.onerror = reject; r.readAsDataURL(file) })
          await axios.post(`${API}/manutencoes/${res.data.id}/arquivos`, { nome_arquivo: file.name, conteudo, usuario: 'Sistema' })
        }
        for (const p of pendingPecas) {
          await axios.post(`${API}/movimentos-estoque`, { peca_id: p.peca_id, tipo: 'saida', quantidade: p.quantidade, manutencao_id: res.data.id, observacao: p.observacao || null, usuario: 'Manutenção' })
        }
      }
      // Sync linked solicitations status based on maintenance status
      const manutId = res.data.id
      const solStatus = payload.status === 'Finalizada' ? 'Finalizada'
                      : payload.status === 'Cancelada'  ? 'Rejeitada'
                      : 'Em Análise'
      await Promise.allSettled([
        ...solicitacoesVeiculo.map(sol => axios.put(`${API}/solicitacoes/${sol.id}`, { status: solStatus, manutencao_id: manutId })),
        ...solicitacoesRemovidas.map(sol => axios.put(`${API}/solicitacoes/${sol.id}`, { status: 'Aberta', manutencao_id: null })),
      ])
      setSuccess(isEdit ? 'Manutenção atualizada com sucesso!' : 'Manutenção criada com sucesso!')
      setTimeout(() => navigate('/manutencoes'), 1200)
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar manutenção')
    } finally { setSaving(false) }
  }

  const addFilesWithPreview = (files, setter) => {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = ev => setter(p => [...p, { file, preview: ev.target.result }])
        reader.readAsDataURL(file)
      } else {
        setter(p => [...p, { file, preview: null }])
      }
    })
  }

  const handleUploadArquivo = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    e.target.value = ''
    if (!isEdit) {
      addFilesWithPreview(files, setPendingFiles)
      return
    }
    setUploading(true)
    try {
      for (const file of files) {
        if (file.size > 8 * 1024 * 1024) { setError(`Arquivo "${file.name}" muito grande (máx. 8MB)`); continue }
        const conteudo = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = e => resolve(e.target.result); r.onerror = reject; r.readAsDataURL(file) })
        const res = await axios.post(`${API}/manutencoes/${id}/arquivos`, { nome_arquivo: file.name, conteudo, usuario: 'Sistema' })
        setArquivos(a => [...a, res.data])
      }
    } catch (err) { setError(err.response?.data?.detail || `Erro ao fazer upload: ${err.message}`) }
    finally { setUploading(false) }
  }

  const handlePasteArquivo = (e) => {
    const items = Array.from(e.clipboardData.items)
    const imageFiles = items.filter(i => i.type.startsWith('image/')).map(i => i.getAsFile())
    if (!imageFiles.length) return
    if (!isEdit) {
      addFilesWithPreview(imageFiles, setPendingFiles)
      return
    }
    setUploading(true)
    Promise.all(imageFiles.filter(file => {
      if (file.size > 8 * 1024 * 1024) { setError(`Arquivo muito grande (máx. 8MB)`); return false }
      return true
    }).map(file =>
      new Promise((resolve, reject) => { const r = new FileReader(); r.onload = e => resolve(e.target.result); r.onerror = reject; r.readAsDataURL(file) })
        .then(conteudo => axios.post(`${API}/manutencoes/${id}/arquivos`, { nome_arquivo: file.name, conteudo, usuario: 'Sistema' }))
        .then(res => res.data)
    ))
      .then(saved => setArquivos(a => [...a, ...saved]))
      .catch(err => setError(err.response?.data?.detail || `Erro ao fazer upload: ${err.message}`))
      .finally(() => setUploading(false))
  }

  const handleDeleteArquivo = async (arq) => {
    if (!window.confirm(`Remover o arquivo "${arq.nome_arquivo}"?`)) return
    try {
      await axios.delete(`${API}/arquivos/${arq.id}`)
      setArquivos(a => a.filter(x => x.id !== arq.id))
    } catch { setError('Erro ao remover arquivo') }
  }

  const handleDeleteManutencao = async () => {
    if (!window.confirm(`Excluir a Manutenção #${id} permanentemente? Esta ação não pode ser desfeita.`)) return
    try {
      await axios.delete(`${API}/manutencoes/${id}`)
      navigate('/manutencoes')
    } catch { setError('Erro ao excluir manutenção') }
  }

  useEffect(() => {
    if (!error && !success) return
    const t = setTimeout(() => { setError(''); setSuccess('') }, 4000)
    return () => clearTimeout(t)
  }, [error, success])

  const totalValor = servicos.reduce((acc, s) => acc + (parseFloat(s.valor) || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando...
      </div>
    )
  }

  return (
    <div className="space-y-4 w-full">

      {/* ── TÍTULO ── */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-600 rounded-lg shadow px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/manutencoes" className="text-blue-200 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">
              {isEdit ? `Manutenção #${id} — Editar` : 'Nova Manutenção de Veículo'}
            </h1>
            <p className="text-blue-200 text-xs">{isEdit ? 'Edite os dados e confirme para salvar' : 'Preencha os dados da nova manutenção'}</p>
          </div>
        </div>
        <Wrench className="w-6 h-6 text-blue-300" />
      </div>

      {/* ── TOAST ── */}
      {(error || success) && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border text-sm font-medium animate-fade-in max-w-sm
          ${error ? 'bg-red-600 border-red-700 text-white' : 'bg-green-600 border-green-700 text-white'}`}>
          {error ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
          <span className="flex-1">{error || success}</span>
          <button onClick={() => { setError(''); setSuccess('') }} className="ml-1 opacity-70 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── SEÇÃO MANUTENÇÃO ── */}
        <div className="rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <SectionHeader icon={ClipboardList} title="Manutenção" />

          <div className="p-4 space-y-4 bg-white dark:bg-gray-800">

            {/* Veículo / Ativo + Motorista */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Toggle + Seletor */}
              <div className="relative pb-4">
                <div className="h-6 flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                    <span className="text-red-500 mr-0.5">*</span> Veículo / Ativo
                  </span>
                  <span className="inline-flex rounded overflow-hidden border border-gray-300 dark:border-gray-600">
                    <button type="button"
                      onClick={() => { setTipoEntidade('veiculo'); setForm(f => ({ ...f, ativo_id: '' })); setAtivoSearch(''); setAtivoDesc('') }}
                      className={`px-2 py-0 text-[10px] font-semibold transition-colors leading-5 ${tipoEntidade === 'veiculo' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-50'}`}>
                      Veículo
                    </button>
                    <button type="button"
                      onClick={() => { setTipoEntidade('ativo'); setForm(f => ({ ...f, veiculo_id: '' })); setVeiculoSearch(''); setVeiculoDesc(''); setSolicitacoesVeiculo([]) }}
                      className={`px-2 py-0 text-[10px] font-semibold transition-colors leading-5 ${tipoEntidade === 'ativo' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-50'}`}>
                      Ativo
                    </button>
                  </span>
                </div>

                {tipoEntidade === 'veiculo' ? (
                  <>
                    <div className="flex gap-1">
                      <input className={inp} placeholder="Placa ou descrição..." value={veiculoSearch}
                        onChange={e => { setVeiculoSearch(e.target.value); setShowVeiculoDrop(true) }}
                        onFocus={() => setShowVeiculoDrop(true)}
                        onBlur={() => setTimeout(() => setShowVeiculoDrop(false), 200)} />
                      <button type="button" onClick={() => setShowVeiculoDrop(!showVeiculoDrop)}
                        className="border border-gray-300 dark:border-gray-600 rounded px-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors">
                        <Search className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {veiculoDesc && <p className="absolute left-1 bottom-0 text-xs text-blue-600 dark:text-blue-400 font-medium">{veiculoDesc}</p>}
                    {showVeiculoDrop && filteredVeiculos.length > 0 && (
                      <ul className="absolute z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg mt-0.5 w-full max-h-40 overflow-y-auto text-xs">
                        {filteredVeiculos.map(v => (
                          <li key={v.id} className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer border-b border-gray-50 dark:border-gray-700 last:border-0 flex items-center gap-2"
                            onMouseDown={() => selectVeiculo(v)}>
                            <Car className="w-3 h-3 text-blue-400" />
                            <span className="font-semibold dark:text-gray-200">{v.placa}</span>
                            <span className="text-gray-400 dark:text-gray-500">{v.descricao}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex gap-1">
                      <input className={inp} placeholder="Nome ou código do ativo..." value={ativoSearch}
                        onChange={e => { setAtivoSearch(e.target.value); setShowAtivoDrop(true) }}
                        onFocus={() => setShowAtivoDrop(true)}
                        onBlur={() => setTimeout(() => setShowAtivoDrop(false), 200)} />
                      <button type="button" onClick={() => setShowAtivoDrop(!showAtivoDrop)}
                        className="border border-gray-300 dark:border-gray-600 rounded px-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors">
                        <Search className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => setAtivoModalOpen(true)}
                        className="border border-gray-300 dark:border-gray-600 rounded px-2 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 text-green-700 dark:text-green-400 transition-colors text-[10px] font-bold whitespace-nowrap">
                        + Novo
                      </button>
                    </div>
                    {ativoDesc && <p className="absolute left-1 bottom-0 text-xs text-blue-600 dark:text-blue-400 font-medium">{ativoDesc}</p>}
                    {showAtivoDrop && filteredAtivos.length > 0 && (
                      <ul className="absolute z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg mt-0.5 w-full max-h-40 overflow-y-auto text-xs">
                        {filteredAtivos.map(a => (
                          <li key={a.id} className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer border-b border-gray-50 dark:border-gray-700 last:border-0 flex items-center gap-2"
                            onMouseDown={() => selectAtivo(a)}>
                            <Car className="w-3 h-3 text-purple-400" />
                            <span className="font-semibold dark:text-gray-200">{a.nome}</span>
                            {a.tipo && <span className="text-gray-400 dark:text-gray-500">{a.tipo}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>

              {/* Motorista */}
              <div className="relative pb-4">
                <div className="h-6 flex items-center mb-1">
                  <label className="text-xs font-semibold text-blue-800 dark:text-blue-300">Motorista</label>
                </div>
                <div className="flex gap-1">
                  <input className={inp} placeholder="Código ou nome..." value={motoristaSearch}
                    onChange={e => { setMotoristaSearch(e.target.value); setShowMotoristaDrop(true) }}
                    onFocus={() => setShowMotoristaDrop(true)}
                    onBlur={() => setTimeout(() => setShowMotoristaDrop(false), 200)} />
                  <button type="button" onClick={() => setShowMotoristaDrop(!showMotoristaDrop)}
                    className="border border-gray-300 dark:border-gray-600 rounded px-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors">
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
                {motoristaDesc && <p className="absolute left-1 bottom-0 text-xs text-blue-600 dark:text-blue-400 font-medium">{motoristaDesc}</p>}
                {showMotoristaDrop && filteredMotoristas.length > 0 && (
                  <ul className="absolute z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg mt-0.5 w-full max-h-40 overflow-y-auto text-xs">
                    {filteredMotoristas.map(m => (
                      <li key={m.id} className="px-3 py-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer border-b border-gray-50 dark:border-gray-700 last:border-0 flex items-center gap-2"
                        onMouseDown={() => selectMotorista(m)}>
                        <User className="w-3 h-3 text-blue-400" />
                        <span className="font-semibold dark:text-gray-200">{m.codigo}</span>
                        <span className="text-gray-400 dark:text-gray-500">{m.nome}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Km / Horímetro / Responsável / Requisitante */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><Lbl>Km Entrada</Lbl><input className={inp} type="number" value={form.km_entrada} onChange={setF('km_entrada')} /></div>
              <div><Lbl>Horímetro Entrada</Lbl><input className={inp} type="number" step="0.01" value={form.horimetro_entrada} onChange={setF('horimetro_entrada')} /></div>
              <div><Lbl>Oficina / Prestador</Lbl><LookupField endpoint="oficinas-prestadores" value={form.responsavel_manutencao} onChange={v => setForm(f => ({ ...f, responsavel_manutencao: v }))} placeholder="Oficina / Prestador" onCadastrarNovo={cb => setOficinaModalCb(() => cb)} /></div>
              <div><Lbl>Requisitante</Lbl><input className={inp} value={form.requisitante} onChange={setF('requisitante')} /></div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Lbl><Calendar className="w-3 h-3 inline mr-1 text-blue-500" />Dt. Início</Lbl>
                <input className={inp} type="datetime-local" value={form.dt_inicio} onChange={setF('dt_inicio')} />
              </div>
              <div>
                <Lbl><Calendar className="w-3 h-3 inline mr-1 text-orange-500" />Dt. Previsão</Lbl>
                <input className={inp} type="datetime-local" value={form.dt_previsao} onChange={setF('dt_previsao')} />
              </div>
              <div>
                <Lbl><Calendar className="w-3 h-3 inline mr-1 text-green-500" />Dt. Término</Lbl>
                <input className={inp} type="datetime-local" value={form.dt_termino} onChange={setF('dt_termino')} />
              </div>
            </div>

            {/* Status / Prioridade / Tipo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Lbl>Status</Lbl>
                <select className={sel} value={form.status} onChange={setF('status')}>
                  <option>Em Andamento</option>
                  <option>Finalizada</option>
                  <option>Cancelada</option>
                </select>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                    form.status === 'Finalizada' ? 'bg-green-500 text-white' :
                    form.status === 'Cancelada' ? 'bg-red-500 text-white' :
                    'bg-blue-500 text-white'}`}>{form.status}</span>
                  {['Finalizada', 'Cancelada'].includes(form.status) && !form.dt_termino && (
                    <span className="text-[10px] text-orange-500 font-semibold">⚠ Informe a Dt. Término</span>
                  )}
                </div>
              </div>
              <div>
                <Lbl>Prioridade</Lbl>
                <select className={sel} value={form.prioridade} onChange={setF('prioridade')}>
                  <option value="">-</option>
                  <option>Alta</option>
                  <option>Média</option>
                  <option>Baixa</option>
                </select>
                {form.prioridade && (
                  <div className="mt-1">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${priorBadge[form.prioridade] || ''}`}>{form.prioridade}</span>
                  </div>
                )}
              </div>
              <div>
                <Lbl>Tipo</Lbl>
                <select className={sel} value={form.tipo} onChange={setF('tipo')}>
                  <option value="">-</option>
                  <option>Corretiva</option>
                  <option>Preventiva</option>
                </select>
                {form.tipo && (
                  <div className="mt-1">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700 font-semibold">{form.tipo}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Serviços solicitados / Obs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Lbl>Serviços Solicitados</Lbl>
                <div className="border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus-within:border-blue-400 min-h-[80px]">
                  {solicitacoesVeiculo.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 border-b border-gray-100 dark:border-gray-600">
                      {solicitacoesVeiculo.map(sol => (
                        <span key={sol.id} className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/40 text-blue-800 dark:text-blue-300 text-xs rounded-full px-2.5 py-1 font-medium max-w-xs">
                          <span className="truncate" title={sol.descricao}>#{sol.id} {sol.descricao}</span>
                          <button type="button" onClick={() => removeSolicitacao(sol)}
                            className="ml-0.5 text-blue-400 hover:text-red-500 flex-shrink-0 transition-colors" title="Remover desta manutenção">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <textarea className="w-full px-2 py-1.5 text-xs outline-none bg-transparent dark:text-gray-100 dark:placeholder-gray-500 resize-none" rows={3} value={form.servicos_solicitados} onChange={setF('servicos_solicitados')} placeholder="Descreva os serviços solicitados..." />
                </div>
              </div>
              <div>
                <Lbl>Observação</Lbl>
                <textarea className={`${inp} resize-none`} rows={3} value={form.observacao} onChange={setF('observacao')} />
              </div>
            </div>

            {!form.veiculo_id && (
              <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Informe o Veículo para habilitar os Serviços do Veículo.
              </div>
            )}
          </div>
        </div>

        {/* ── SEÇÃO SERVIÇOS ── */}
        <div className="rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-4 py-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2 text-white font-bold text-sm">
              <Wrench className="w-4 h-4" />
              Serviços Veículo
            </span>
            <div className="flex items-center gap-2">
              <span className="text-blue-200 text-xs">{servicos.length} serviço(s)</span>
              <button type="button" onClick={() => setUsarPecaOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded font-semibold transition-colors shadow-sm">
                <Package className="w-3.5 h-3.5" />
                Usar Peça{!isEdit && pendingPecas.length > 0 ? ` (${pendingPecas.length})` : ''}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/40">
                  <th className="px-2 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold">Status</th>
                  <th className="px-2 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold">Parte Veículo</th>
                  <th className="px-2 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold">Serviço</th>
                  <th className="px-2 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold">Tipo</th>
                  <th className="px-2 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold">Dt. Serviço</th>
                  <th className="px-2 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold">Próx. Dt. Val.</th>
                  <th className="px-2 py-2 text-right text-blue-800 dark:text-blue-300 font-semibold">Próx. Km</th>
                  <th className="px-2 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold">Responsável</th>
                  <th className="px-2 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold">Descrição</th>
                  <th className="px-2 py-2 text-right text-blue-800 dark:text-blue-300 font-semibold">Valor R$</th>
                  <th className="px-2 py-2 text-center text-blue-800 dark:text-blue-300 font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {servicos.map((s, idx) => {
                  const isEditing = editingId === s.id
                  const rowCls = `border-b border-gray-100 dark:border-gray-700 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}`
                  const miniSel = "border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none w-full"
                  const miniInp = "border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs w-full focus:outline-none dark:bg-gray-700 dark:text-gray-100"

                  if (isEditing) return (
                    <tr key={s.id} className="border-b border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-900/20 align-middle">
                      <td className="px-1 py-1.5">
                        <select className={miniSel} value={editForm.status} onChange={setEf('status')}>
                          <option>Em Andamento</option><option>Finalizado</option><option>Cancelado</option>
                        </select>
                      </td>
                      <td className="px-1 py-1.5"><LookupField endpoint="partes-veiculo" value={editForm.parte_veiculo} onChange={v => setEditForm(f => ({ ...f, parte_veiculo: v }))} placeholder="Parte" onCadastrarNovo={cb => setParteVeiculoModalCb(() => cb)} /></td>
                      <td className="px-1 py-1.5"><LookupField endpoint="tipos-servico" value={editForm.servico} onChange={v => setEditForm(f => ({ ...f, servico: v }))} placeholder="Serviço" onCadastrarNovo={cb => setTipoServicoModalCb(() => cb)} extraParams={editForm.parte_veiculo ? { parte_veiculo: editForm.parte_veiculo } : undefined} onItemSelected={item => { setEditForm(f => ({ ...f, _nr_dias_validade: item.nr_dias_validade || '', parte_veiculo: item.parte_veiculo || f.parte_veiculo, proximo_km_validade: item.hodometro_km_validade && form.km_entrada ? String(Number(form.km_entrada) + item.hodometro_km_validade) : f.proximo_km_validade, proxima_dt_validade: item.nr_dias_validade && f.dt_servico ? calcProxDt(f.dt_servico, item.nr_dias_validade) : f.proxima_dt_validade })) }} /></td>
                      <td className="px-1 py-1.5">
                        <select className={miniSel} value={editForm.tipo_uso} onChange={setEf('tipo_uso')}>
                          <option value="">-</option><option>Corretiva</option><option>Preventiva</option>
                        </select>
                      </td>
                      <td className="px-1 py-1.5"><input className={miniInp} type="date" value={editForm.dt_servico} onChange={e => setEditForm(f => { const dt = e.target.value; return { ...f, dt_servico: dt, proxima_dt_validade: f._nr_dias_validade && dt ? calcProxDt(dt, f._nr_dias_validade) : f.proxima_dt_validade } })} /></td>
                      <td className="px-1 py-1.5"><input className={miniInp} type="date" value={editForm.proxima_dt_validade} onChange={setEf('proxima_dt_validade')} /></td>
                      <td className="px-1 py-1.5"><input className={`${miniInp} w-20 text-right`} type="number" value={editForm.proximo_km_validade} onChange={setEf('proximo_km_validade')} /></td>
                      <td className="px-1 py-1.5"><input className={miniInp} value={editForm.pessoa_responsavel} onChange={setEf('pessoa_responsavel')} placeholder="Resp." /></td>
                      <td className="px-1 py-1.5"><textarea className={`${miniInp} resize`} style={{minHeight:'26px',height:'26px'}} value={editForm.descricao} onChange={setEf('descricao')} placeholder="Desc." /></td>
                      <td className="px-1 py-1.5"><CurrencyInput className={`${miniInp} w-28 text-right`} value={editForm.valor} onChange={v => setEditForm(f => ({ ...f, valor: v }))} /></td>
                      <td className="px-1 py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => handleSaveEdit(s)} title="Salvar"
                            className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 border border-green-400 rounded transition-colors">
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={cancelEdit} title="Cancelar"
                            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 border border-gray-300 rounded transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )

                  return (
                    <tr key={s.id} className={`${rowCls} hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors`}>
                      <td className="px-2 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${statusBadge[s.status] || 'bg-gray-100 text-gray-700'}`}>{s.status}</span>
                      </td>
                      <td className="px-2 py-2 font-medium dark:text-gray-200">{s.parte_veiculo || '-'}</td>
                      <td className="px-2 py-2 dark:text-gray-200">{s.servico || '-'}</td>
                      <td className="px-2 py-2 text-gray-500 dark:text-gray-400">{s.tipo_uso || '-'}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">{fmtDate(s.dt_servico)}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-gray-600 dark:text-gray-400">{fmtDate(s.proxima_dt_validade)}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-gray-600 dark:text-gray-400">{s.proximo_km_validade || '-'}</td>
                      <td className="px-2 py-2 text-gray-600 dark:text-gray-400">{s.pessoa_responsavel || '-'}</td>
                      <td className="px-2 py-2 text-gray-500 dark:text-gray-400">{s.descricao || '-'}</td>
                      <td className="px-2 py-2 text-right tabular-nums font-semibold text-gray-700 dark:text-gray-300">{s.valor ? `R$ ${fmtMoney(s.valor)}` : '-'}</td>
                      <td className="px-2 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button type="button" onClick={() => startEdit(s)} title="Editar"
                            className="p-1 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => handleDeleteServico(s)} title="Remover"
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {/* Linha nova */}
                <tr className="bg-yellow-50 dark:bg-yellow-900/10 border-t-2 border-yellow-300 dark:border-yellow-800/40 align-middle">
                  <td className="px-1 py-1.5">
                    <select className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none w-full" value={newServico.status} onChange={setSf('status')}>
                      <option>Em Andamento</option><option>Finalizado</option><option>Cancelado</option>
                    </select>
                  </td>
                  <td className="px-1 py-1.5"><LookupField endpoint="partes-veiculo" value={newServico.parte_veiculo} onChange={v => setNewServico(s => ({ ...s, parte_veiculo: v }))} placeholder="Parte" onCadastrarNovo={cb => setParteVeiculoModalCb(() => cb)} /></td>
                  <td className="px-1 py-1.5"><LookupField endpoint="tipos-servico" value={newServico.servico} onChange={v => setNewServico(s => ({ ...s, servico: v }))} placeholder="Serviço" onCadastrarNovo={cb => setTipoServicoModalCb(() => cb)} extraParams={newServico.parte_veiculo ? { parte_veiculo: newServico.parte_veiculo } : undefined} onItemSelected={item => { setNewServico(s => ({ ...s, _nr_dias_validade: item.nr_dias_validade || '', parte_veiculo: item.parte_veiculo || s.parte_veiculo, proximo_km_validade: item.hodometro_km_validade && form.km_entrada ? String(Number(form.km_entrada) + item.hodometro_km_validade) : s.proximo_km_validade, proxima_dt_validade: item.nr_dias_validade && s.dt_servico ? calcProxDt(s.dt_servico, item.nr_dias_validade) : s.proxima_dt_validade })) }} /></td>
                  <td className="px-1 py-1.5">
                    <select className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none w-full" value={newServico.tipo_uso} onChange={setSf('tipo_uso')}>
                      <option value="">-</option><option>Corretiva</option><option>Preventiva</option>
                    </select>
                  </td>
                  <td className="px-1 py-1.5"><input className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs w-full dark:bg-gray-700 dark:text-gray-100" type="date" value={newServico.dt_servico} onChange={e => setNewServico(s => { const dt = e.target.value; return { ...s, dt_servico: dt, proxima_dt_validade: s._nr_dias_validade && dt ? calcProxDt(dt, s._nr_dias_validade) : s.proxima_dt_validade } })} /></td>
                  <td className="px-1 py-1.5"><input className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs w-full dark:bg-gray-700 dark:text-gray-100" type="date" value={newServico.proxima_dt_validade} onChange={setSf('proxima_dt_validade')} /></td>
                  <td className="px-1 py-1.5"><input className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs w-20 text-right dark:bg-gray-700 dark:text-gray-100" type="number" value={newServico.proximo_km_validade} onChange={setSf('proximo_km_validade')} /></td>
                  <td className="px-1 py-1.5"><input className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs w-full dark:bg-gray-700 dark:text-gray-100" value={newServico.pessoa_responsavel} onChange={setSf('pessoa_responsavel')} placeholder="Resp." /></td>
                  <td className="px-1 py-1.5"><textarea className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs w-full dark:bg-gray-700 dark:text-gray-100 resize" style={{minHeight:'26px',height:'26px'}} value={newServico.descricao} onChange={setSf('descricao')} placeholder="Desc." /></td>
                  <td className="px-1 py-1.5"><CurrencyInput className="border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs w-28 text-right dark:bg-gray-700 dark:text-gray-100" value={newServico.valor} onChange={v => setNewServico(s => ({ ...s, valor: v }))} /></td>
                  <td className="px-1 py-1.5 text-center">
                    <button type="button" onClick={handleAddServico} title="Adicionar serviço"
                      className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 border border-green-400 rounded transition-colors">
                      <Save className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>

                {/* Total */}
                {servicos.length > 0 && (
                  <tr className="bg-gray-100 dark:bg-gray-700 border-t-2 border-gray-300 dark:border-gray-600">
                    <td colSpan={9} className="px-3 py-2 text-right text-xs font-bold text-gray-700 dark:text-gray-300">Total:</td>
                    <td className="px-2 py-2 text-right text-sm font-extrabold text-blue-700 dark:text-blue-400 tabular-nums">R$ {fmtMoney(totalValor)}</td>
                    <td colSpan={2} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── SEÇÃO PEÇAS UTILIZADAS (edit mode) ── */}
        {(isEdit && pecasUsadasOS.length > 0) || (!isEdit && pendingPecas.length > 0) ? (
          <div className="rounded-lg shadow-sm border border-purple-200 dark:border-purple-800/40 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-700 to-purple-500 px-4 py-2.5 flex items-center justify-between">
              <span className="flex items-center gap-2 text-white font-bold text-sm">
                <Package className="w-4 h-4" />
                Peças Utilizadas
              </span>
              <span className="text-purple-200 text-xs">
                {isEdit ? pecasUsadasOS.length : pendingPecas.length} peça(s)
              </span>
            </div>
            <div className="overflow-x-auto bg-white dark:bg-gray-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-800/40">
                    <th className="px-3 py-2 text-left text-purple-800 dark:text-purple-300 font-semibold">Peça</th>
                    <th className="px-3 py-2 text-right text-purple-800 dark:text-purple-300 font-semibold">Quantidade</th>
                    <th className="px-3 py-2 text-left text-purple-800 dark:text-purple-300 font-semibold">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {(isEdit ? pecasUsadasOS : pendingPecas).map((mv, i) => (
                    <tr key={mv.id || mv._tempId} className={`border-b border-gray-100 dark:border-gray-700 ${i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                      <td className="px-3 py-2 font-semibold dark:text-gray-200">{mv.peca_nome}</td>
                      <td className="px-3 py-2 text-right tabular-nums dark:text-gray-300">{Number(mv.quantidade).toLocaleString('pt-BR')} {mv.peca_unidade}</td>
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{mv.observacao || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* ── SEÇÃO ANEXOS ── */}
        <div className="rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <SectionHeader icon={Paperclip} title="Anexos" right={`${arquivos.length + pendingFiles.length} arquivo(s)`} />
          <div className="p-4 bg-white dark:bg-gray-800">
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUploadArquivo} disabled={uploading} />
            <div
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50 hover:border-blue-400 transition-colors cursor-pointer min-h-[80px]"
              onPaste={handlePasteArquivo}
              onClick={() => fileInputRef.current?.click()}
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              {arquivos.length === 0 && pendingFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1 text-gray-400 dark:text-gray-500 py-2">
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                  <span className="text-xs">{uploading ? 'Enviando...' : 'Cole (Ctrl+V) ou clique para adicionar arquivos/imagens'}</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {/* Arquivos já salvos no servidor */}
                  {arquivos.map(arq => {
                    const isImg = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(arq.nome_arquivo)
                    const url = arq.conteudo || (arq.caminho ? `${API}/uploads/${arq.caminho}` : null)
                    return (
                      <div key={arq.id} className="relative group" onClick={e => e.stopPropagation()}>
                        {isImg ? (
                          <img src={url} alt={arq.nome_arquivo}
                            className="h-16 w-16 object-cover rounded border border-gray-200 cursor-pointer"
                            onClick={() => {
                              const imgs = arquivos.filter(a => /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(a.nome_arquivo)).map(a => a.conteudo || (a.caminho ? `${API}/uploads/${a.caminho}` : null)).filter(Boolean)
                              const idx = imgs.indexOf(url)
                              setLightbox({ images: imgs, idx: idx >= 0 ? idx : 0 })
                            }} />
                        ) : (
                          <a href={url} target="_blank" rel="noreferrer"
                            className="h-16 w-16 flex flex-col items-center justify-center rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors gap-1">
                            <FileText className="w-5 h-5" />
                            <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate w-14 text-center px-1">{arq.nome_arquivo}</span>
                          </a>
                        )}
                        <button type="button" onClick={e => { e.stopPropagation(); handleDeleteArquivo(arq) }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="Remover">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )
                  })}
                  {/* Arquivos pendentes (nova manutenção) */}
                  {pendingFiles.map(({ file, preview }, i) => (
                    <div key={i} className="relative group" onClick={e => e.stopPropagation()}>
                      {preview ? (
                        <img src={preview} alt={file.name}
                          className="h-16 w-16 object-cover rounded border border-yellow-300 cursor-pointer opacity-80"
                          onClick={() => {
                            const imgs = pendingFiles.filter(p => p.preview).map(p => p.preview)
                            const idx = pendingFiles.filter(p => p.preview).findIndex((_, j) => j === pendingFiles.filter(p => p.preview).indexOf(pendingFiles.filter(p => p.preview)[i]))
                            setLightbox({ images: imgs, idx: Math.max(idx, 0) })
                          }} />
                      ) : (
                        <div className="h-16 w-16 flex flex-col items-center justify-center rounded border border-yellow-300 dark:border-yellow-700/50 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 gap-1">
                          <FileText className="w-5 h-5" />
                          <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate w-14 text-center px-1">{file.name}</span>
                        </div>
                      )}
                      <div className="absolute -bottom-1 -left-1 bg-yellow-400 text-white text-[8px] rounded px-0.5 font-bold leading-tight">Pend.</div>
                      <button type="button" onClick={e => { e.stopPropagation(); setPendingFiles(p => p.filter((_, j) => j !== i)) }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="Remover">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  {/* Botão adicionar mais */}
                  <div className="h-16 w-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded flex items-center justify-center text-gray-400 dark:text-gray-500 hover:border-blue-400 flex-shrink-0">
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── LIGHTBOX ── */}
        {lightbox && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setLightbox(null)}>
            <button className="absolute top-4 right-4 text-white hover:text-gray-300" onClick={() => setLightbox(null)}><X className="w-6 h-6" /></button>
            <button className="absolute left-4 text-white hover:text-gray-300 disabled:opacity-30" disabled={lightbox.idx === 0}
              onClick={e => { e.stopPropagation(); setLightbox(lb => ({ ...lb, idx: lb.idx - 1 })) }}>
              <ChevronLeftLb className="w-8 h-8" />
            </button>
            <img src={lightbox.images[lightbox.idx]} alt="" className="max-h-[85vh] max-w-[85vw] rounded shadow-2xl object-contain" onClick={e => e.stopPropagation()} />
            <button className="absolute right-4 text-white hover:text-gray-300 disabled:opacity-30" disabled={lightbox.idx === lightbox.images.length - 1}
              onClick={e => { e.stopPropagation(); setLightbox(lb => ({ ...lb, idx: lb.idx + 1 })) }}>
              <ChevronRight className="w-8 h-8" />
            </button>
            <div className="absolute bottom-4 text-white text-sm">{lightbox.idx + 1} / {lightbox.images.length}</div>
          </div>
        )}

        {/* ── BARRA DE AÇÃO ── */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-end">
          <div className="flex gap-2">
            {isEdit && (
              <button type="button" onClick={handleDeleteManutencao}
                className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
            )}
            <Link to="/manutencoes"
              className="px-4 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium transition-colors">
              Cancelar
            </Link>
            <button type="submit" disabled={saving}
              className="px-5 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-colors">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saving ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      </form>

      <div className="text-center">
        <Link to="/manutencoes" className="text-blue-600 hover:underline text-xs font-medium">
          « Listagem de Manutenções do Veículo
        </Link>
      </div>

      {tipoServicoModalCb && (
        <TipoServicoModal
          onClose={() => setTipoServicoModalCb(null)}
          onSelected={(nome) => { tipoServicoModalCb(nome); setTipoServicoModalCb(null) }}
        />
      )}
      {parteVeiculoModalCb && (
        <ParteVeiculoModal
          onClose={() => setParteVeiculoModalCb(null)}
          onSelected={(nome) => { parteVeiculoModalCb(nome); setParteVeiculoModalCb(null) }}
        />
      )}
      {oficinaModalCb && (
        <OficinaPrestadorModal
          onClose={() => setOficinaModalCb(null)}
          onSelected={(nome) => { oficinaModalCb(nome); setOficinaModalCb(null) }}
        />
      )}
      {ativoModalOpen && (
        <AtivoModal
          onClose={() => setAtivoModalOpen(false)}
          onSaved={() => { loadAtivos(); setAtivoModalOpen(false) }}
        />
      )}
      {usarPecaOpen && (
        <ModalUsarPeca
          manutencaoId={id}
          onClose={() => {
            setUsarPecaOpen(false)
            if (isEdit && id) {
              axios.get(`${API}/movimentos-estoque`, { params: { manutencao_id: Number(id) } })
                .then(r => setPecasUsadasOS(r.data))
                .catch(() => {})
            }
          }}
          pendingPecas={pendingPecas}
          onAddPending={p => setPendingPecas(prev => [...prev, p])}
          onRemovePending={tempId => setPendingPecas(prev => prev.filter(p => p._tempId !== tempId))}
        />
      )}
    </div>
  )
}
