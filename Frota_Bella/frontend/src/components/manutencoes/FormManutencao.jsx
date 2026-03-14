import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import {
  Search, Trash2, Save, ChevronLeft,
  AlertCircle, CheckCircle, Loader2,
  Car, User, Wrench, Calendar, ClipboardList, Pencil, X,
} from 'lucide-react'
import LookupField from '../shared/LookupField.jsx'

const API = 'http://localhost:8000/api'

const emptyForm = {
  veiculo_id: '', motorista_id: '',
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

const inp = "border border-gray-300 rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:border-blue-400 bg-white"
const sel = "border border-gray-300 rounded px-2 py-1.5 text-xs w-full focus:outline-none focus:border-blue-400 bg-white"

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
  return <label className="block text-xs font-semibold text-blue-800 mb-1">{children}</label>
}

export default function FormManutencao() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState(emptyForm)
  const [veiculos, setVeiculos] = useState([])
  const [motoristas, setMotoristas] = useState([])
  const [veiculoDesc, setVeiculoDesc] = useState('')
  const [motoristaDesc, setMotoristaDesc] = useState('')
  const [veiculoSearch, setVeiculoSearch] = useState('')
  const [motoristaSearch, setMotoristaSearch] = useState('')
  const [showVeiculoDrop, setShowVeiculoDrop] = useState(false)
  const [showMotoristaDrop, setShowMotoristaDrop] = useState(false)
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

  useEffect(() => {
    axios.get(`${API}/veiculos`).then(r => setVeiculos(r.data))
    axios.get(`${API}/motoristas`).then(r => setMotoristas(r.data))
  }, [])

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    axios.get(`${API}/manutencoes/${id}`)
      .then(r => {
        const m = r.data
        setForm({
          veiculo_id: m.veiculo_id || '',
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
        if (m.motorista) { setMotoristaSearch(m.motorista.codigo); setMotoristaDesc(m.motorista.nome) }
        setServicos(m.servicos || [])
      })
      .catch(() => setError('Erro ao carregar manutenção'))
      .finally(() => setLoading(false))
  }, [id, isEdit])

  const filteredVeiculos = veiculos.filter(v =>
    v.placa.toLowerCase().includes(veiculoSearch.toLowerCase()) ||
    v.descricao.toLowerCase().includes(veiculoSearch.toLowerCase())
  )
  const filteredMotoristas = motoristas.filter(m =>
    m.codigo.toLowerCase().includes(motoristaSearch.toLowerCase()) ||
    m.nome.toLowerCase().includes(motoristaSearch.toLowerCase())
  )

  const selectVeiculo = (v) => {
    setForm(f => ({ ...f, veiculo_id: v.id }))
    setVeiculoSearch(v.placa)
    setVeiculoDesc(v.descricao)
    setShowVeiculoDrop(false)
    setSolicitacoesRemovidas([])
    axios.get(`${API}/solicitacoes`, { params: { veiculo_id: v.id, status: 'Aberta', per_page: 100 } })
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
    if (!form.veiculo_id) { setError('Selecione um veículo'); return }
    setSaving(true); setError(''); setSuccess('')
    try {
      const payload = { ...form, veiculo_id: Number(form.veiculo_id), motorista_id: form.motorista_id ? Number(form.motorista_id) : null, km_entrada: form.km_entrada ? Number(form.km_entrada) : null, horimetro_entrada: form.horimetro_entrada || null, dt_inicio: form.dt_inicio || null, dt_previsao: form.dt_previsao || null, dt_termino: form.dt_termino || null, prioridade: form.prioridade || null, tipo: form.tipo || null }
      let res
      if (isEdit) {
        res = await axios.put(`${API}/manutencoes/${id}`, payload)
      } else {
        res = await axios.post(`${API}/manutencoes`, payload)
        for (const s of servicos.filter(x => x._new)) {
          const { id: _, _new, ...sRaw } = s
          await axios.post(`${API}/manutencoes/${res.data.id}/servicos`, { ...sRaw, tipo_uso: sRaw.tipo_uso || null, status: sRaw.status || 'Em Andamento', valor: sRaw.valor ? Number(sRaw.valor) : null, proximo_km_validade: sRaw.proximo_km_validade ? Number(sRaw.proximo_km_validade) : null, dt_servico: sRaw.dt_servico || null, proxima_dt_validade: sRaw.proxima_dt_validade || null })
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

  const handleDeleteManutencao = async () => {
    if (!window.confirm(`Excluir a Manutenção #${id} permanentemente? Esta ação não pode ser desfeita.`)) return
    try {
      await axios.delete(`${API}/manutencoes/${id}`)
      navigate('/manutencoes')
    } catch { setError('Erro ao excluir manutenção') }
  }

  const totalValor = servicos.reduce((acc, s) => acc + (parseFloat(s.valor) || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando...
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">

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

      {/* ── ALERTAS ── */}
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm shadow-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm shadow-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" /> {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── SEÇÃO MANUTENÇÃO ── */}
        <div className="rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <SectionHeader icon={ClipboardList} title="Manutenção" />

          <div className="p-4 space-y-4 bg-white">

            {/* Veículo + Motorista */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Veículo */}
              <div className="relative">
                <Lbl><span className="text-red-500 mr-0.5">*</span> Veículo</Lbl>
                <div className="flex gap-1">
                  <input className={inp} placeholder="Placa ou descrição..." value={veiculoSearch}
                    onChange={e => { setVeiculoSearch(e.target.value); setShowVeiculoDrop(true) }}
                    onFocus={() => setShowVeiculoDrop(true)}
                    onBlur={() => setTimeout(() => setShowVeiculoDrop(false), 200)} />
                  <button type="button" onClick={() => setShowVeiculoDrop(!showVeiculoDrop)}
                    className="border border-gray-300 rounded px-2 bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
                {veiculoDesc && <p className="text-xs text-blue-600 mt-0.5 pl-1 font-medium">{veiculoDesc}</p>}
                {showVeiculoDrop && filteredVeiculos.length > 0 && (
                  <ul className="absolute z-30 bg-white border border-gray-200 rounded-lg shadow-lg mt-0.5 w-full max-h-40 overflow-y-auto text-xs">
                    {filteredVeiculos.map(v => (
                      <li key={v.id} className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-center gap-2"
                        onMouseDown={() => selectVeiculo(v)}>
                        <Car className="w-3 h-3 text-blue-400" />
                        <span className="font-semibold">{v.placa}</span>
                        <span className="text-gray-400">{v.descricao}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Motorista */}
              <div className="relative">
                <Lbl>Motorista</Lbl>
                <div className="flex gap-1">
                  <input className={inp} placeholder="Código ou nome..." value={motoristaSearch}
                    onChange={e => { setMotoristaSearch(e.target.value); setShowMotoristaDrop(true) }}
                    onFocus={() => setShowMotoristaDrop(true)}
                    onBlur={() => setTimeout(() => setShowMotoristaDrop(false), 200)} />
                  <button type="button" onClick={() => setShowMotoristaDrop(!showMotoristaDrop)}
                    className="border border-gray-300 rounded px-2 bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
                {motoristaDesc && <p className="text-xs text-blue-600 mt-0.5 pl-1 font-medium">{motoristaDesc}</p>}
                {showMotoristaDrop && filteredMotoristas.length > 0 && (
                  <ul className="absolute z-30 bg-white border border-gray-200 rounded-lg shadow-lg mt-0.5 w-full max-h-40 overflow-y-auto text-xs">
                    {filteredMotoristas.map(m => (
                      <li key={m.id} className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-center gap-2"
                        onMouseDown={() => selectMotorista(m)}>
                        <User className="w-3 h-3 text-blue-400" />
                        <span className="font-semibold">{m.codigo}</span>
                        <span className="text-gray-400">{m.nome}</span>
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
              <div><Lbl>Resp. Manutenção</Lbl><input className={inp} value={form.responsavel_manutencao} onChange={setF('responsavel_manutencao')} /></div>
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
                <div className="mt-1">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                    form.status === 'Finalizada' ? 'bg-green-500 text-white' :
                    form.status === 'Cancelada' ? 'bg-red-500 text-white' :
                    'bg-blue-500 text-white'}`}>{form.status}</span>
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
                <div className="border border-gray-300 rounded bg-white focus-within:border-blue-400 min-h-[80px]">
                  {solicitacoesVeiculo.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 border-b border-gray-100">
                      {solicitacoesVeiculo.map(sol => (
                        <span key={sol.id} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-full px-2.5 py-1 font-medium max-w-xs">
                          <span className="truncate" title={sol.descricao}>#{sol.id} {sol.descricao}</span>
                          <button type="button" onClick={() => removeSolicitacao(sol)}
                            className="ml-0.5 text-blue-400 hover:text-red-500 flex-shrink-0 transition-colors" title="Remover desta manutenção">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <textarea className="w-full px-2 py-1.5 text-xs outline-none bg-transparent resize-none" rows={3} value={form.servicos_solicitados} onChange={setF('servicos_solicitados')} placeholder="Descreva os serviços solicitados..." />
                </div>
              </div>
              <div>
                <Lbl>Observação</Lbl>
                <textarea className={`${inp} resize-none`} rows={3} value={form.observacao} onChange={setF('observacao')} />
              </div>
            </div>

            {!form.veiculo_id && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                Informe o Veículo para habilitar os Serviços do Veículo.
              </div>
            )}
          </div>
        </div>

        {/* ── SEÇÃO SERVIÇOS ── */}
        <div className="rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <SectionHeader icon={Wrench} title="Serviços Veículo" right={`${servicos.length} serviço(s)`} />

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-50 border-b border-blue-100">
                  <th className="px-2 py-2 text-left text-blue-800 font-semibold">Status</th>
                  <th className="px-2 py-2 text-left text-blue-800 font-semibold">Parte Veículo</th>
                  <th className="px-2 py-2 text-left text-blue-800 font-semibold">Serviço</th>
                  <th className="px-2 py-2 text-left text-blue-800 font-semibold">Tipo</th>
                  <th className="px-2 py-2 text-left text-blue-800 font-semibold">Dt. Serviço</th>
                  <th className="px-2 py-2 text-left text-blue-800 font-semibold">Próx. Dt. Val.</th>
                  <th className="px-2 py-2 text-right text-blue-800 font-semibold">Próx. Km</th>
                  <th className="px-2 py-2 text-left text-blue-800 font-semibold">Responsável</th>
                  <th className="px-2 py-2 text-left text-blue-800 font-semibold">Descrição</th>
                  <th className="px-2 py-2 text-right text-blue-800 font-semibold">Valor R$</th>
                  <th className="px-2 py-2 text-left text-blue-800 font-semibold">Horas</th>
                  <th className="px-2 py-2 text-center text-blue-800 font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {servicos.map((s, idx) => {
                  const isEditing = editingId === s.id
                  const rowCls = `border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`
                  const miniSel = "border border-gray-300 rounded px-1 py-0.5 text-xs bg-white focus:outline-none w-full"
                  const miniInp = "border border-gray-300 rounded px-1 py-0.5 text-xs w-full focus:outline-none"

                  if (isEditing) return (
                    <tr key={s.id} className="border-b border-blue-200 bg-blue-50">
                      <td className="px-1 py-1.5">
                        <select className={miniSel} value={editForm.status} onChange={setEf('status')}>
                          <option>Em Andamento</option><option>Finalizado</option><option>Cancelado</option>
                        </select>
                      </td>
                      <td className="px-1 py-1.5"><LookupField endpoint="partes-veiculo" value={editForm.parte_veiculo} onChange={v => setEditForm(f => ({ ...f, parte_veiculo: v }))} placeholder="Parte" /></td>
                      <td className="px-1 py-1.5"><LookupField endpoint="tipos-servico" value={editForm.servico} onChange={v => setEditForm(f => ({ ...f, servico: v }))} placeholder="Serviço" /></td>
                      <td className="px-1 py-1.5">
                        <select className={miniSel} value={editForm.tipo_uso} onChange={setEf('tipo_uso')}>
                          <option value="">-</option><option>Corretiva</option><option>Preventiva</option>
                        </select>
                      </td>
                      <td className="px-1 py-1.5"><input className={miniInp} type="date" value={editForm.dt_servico} onChange={setEf('dt_servico')} /></td>
                      <td className="px-1 py-1.5"><input className={miniInp} type="date" value={editForm.proxima_dt_validade} onChange={setEf('proxima_dt_validade')} /></td>
                      <td className="px-1 py-1.5"><input className={`${miniInp} w-20 text-right`} type="number" value={editForm.proximo_km_validade} onChange={setEf('proximo_km_validade')} /></td>
                      <td className="px-1 py-1.5"><input className={miniInp} value={editForm.pessoa_responsavel} onChange={setEf('pessoa_responsavel')} placeholder="Resp." /></td>
                      <td className="px-1 py-1.5"><input className={miniInp} value={editForm.descricao} onChange={setEf('descricao')} placeholder="Desc." /></td>
                      <td className="px-1 py-1.5"><input className={`${miniInp} w-20 text-right`} type="number" step="0.01" value={editForm.valor} onChange={setEf('valor')} /></td>
                      <td className="px-1 py-1.5"><input className={`${miniInp} w-16`} value={editForm.horas_trabalhadas} onChange={setEf('horas_trabalhadas')} placeholder="h:mm" /></td>
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
                    <tr key={s.id} className={`${rowCls} hover:bg-blue-50 transition-colors`}>
                      <td className="px-2 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${statusBadge[s.status] || 'bg-gray-100 text-gray-700'}`}>{s.status}</span>
                      </td>
                      <td className="px-2 py-2 font-medium">{s.parte_veiculo || '-'}</td>
                      <td className="px-2 py-2">{s.servico || '-'}</td>
                      <td className="px-2 py-2 text-gray-500">{s.tipo_uso || '-'}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-gray-600">{s.dt_servico || '-'}</td>
                      <td className="px-2 py-2 whitespace-nowrap text-gray-600">{s.proxima_dt_validade || '-'}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-gray-600">{s.proximo_km_validade || '-'}</td>
                      <td className="px-2 py-2 text-gray-600">{s.pessoa_responsavel || '-'}</td>
                      <td className="px-2 py-2 text-gray-500">{s.descricao || '-'}</td>
                      <td className="px-2 py-2 text-right tabular-nums font-semibold text-gray-700">{s.valor ? `R$ ${fmtMoney(s.valor)}` : '-'}</td>
                      <td className="px-2 py-2 text-gray-600">{s.horas_trabalhadas || '-'}</td>
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
                <tr className="bg-yellow-50 border-t-2 border-yellow-300">
                  <td className="px-1 py-1.5">
                    <select className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white focus:outline-none w-full" value={newServico.status} onChange={setSf('status')}>
                      <option>Em Andamento</option><option>Finalizado</option><option>Cancelado</option>
                    </select>
                  </td>
                  <td className="px-1 py-1.5"><LookupField endpoint="partes-veiculo" value={newServico.parte_veiculo} onChange={v => setNewServico(s => ({ ...s, parte_veiculo: v }))} placeholder="Parte" /></td>
                  <td className="px-1 py-1.5"><LookupField endpoint="tipos-servico" value={newServico.servico} onChange={v => setNewServico(s => ({ ...s, servico: v }))} placeholder="Serviço" /></td>
                  <td className="px-1 py-1.5">
                    <select className="border border-gray-300 rounded px-1 py-0.5 text-xs bg-white focus:outline-none w-full" value={newServico.tipo_uso} onChange={setSf('tipo_uso')}>
                      <option value="">-</option><option>Corretiva</option><option>Preventiva</option>
                    </select>
                  </td>
                  <td className="px-1 py-1.5"><input className="border border-gray-300 rounded px-1 py-0.5 text-xs w-full" type="date" value={newServico.dt_servico} onChange={setSf('dt_servico')} /></td>
                  <td className="px-1 py-1.5"><input className="border border-gray-300 rounded px-1 py-0.5 text-xs w-full" type="date" value={newServico.proxima_dt_validade} onChange={setSf('proxima_dt_validade')} /></td>
                  <td className="px-1 py-1.5"><input className="border border-gray-300 rounded px-1 py-0.5 text-xs w-20 text-right" type="number" value={newServico.proximo_km_validade} onChange={setSf('proximo_km_validade')} /></td>
                  <td className="px-1 py-1.5"><input className="border border-gray-300 rounded px-1 py-0.5 text-xs w-full" value={newServico.pessoa_responsavel} onChange={setSf('pessoa_responsavel')} placeholder="Resp." /></td>
                  <td className="px-1 py-1.5"><input className="border border-gray-300 rounded px-1 py-0.5 text-xs w-full" value={newServico.descricao} onChange={setSf('descricao')} placeholder="Desc." /></td>
                  <td className="px-1 py-1.5"><input className="border border-gray-300 rounded px-1 py-0.5 text-xs w-20 text-right" type="number" step="0.01" value={newServico.valor} onChange={setSf('valor')} placeholder="0,00" /></td>
                  <td className="px-1 py-1.5"><input className="border border-gray-300 rounded px-1 py-0.5 text-xs w-16" value={newServico.horas_trabalhadas} onChange={setSf('horas_trabalhadas')} placeholder="h:mm" /></td>
                  <td className="px-1 py-1.5 text-center">
                    <button type="button" onClick={handleAddServico} title="Adicionar serviço"
                      className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 border border-green-400 rounded transition-colors">
                      <Save className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>

                {/* Total */}
                {servicos.length > 0 && (
                  <tr className="bg-gray-100 border-t-2 border-gray-300">
                    <td colSpan={9} className="px-3 py-2 text-right text-xs font-bold text-gray-700">Total:</td>
                    <td className="px-2 py-2 text-right text-sm font-extrabold text-blue-700 tabular-nums">R$ {fmtMoney(totalValor)}</td>
                    <td colSpan={2} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── BARRA DE AÇÃO ── */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 flex items-center justify-end">
          <div className="flex gap-2">
            {isEdit && (
              <button type="button" onClick={handleDeleteManutencao}
                className="px-4 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
                Excluir
              </button>
            )}
            <Link to="/manutencoes"
              className="px-4 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 font-medium transition-colors">
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
    </div>
  )
}
