import React, { useState, useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { Loader2, Printer, ChevronLeft } from 'lucide-react'
import novalogo from '../../assets/novalogo.png'

const API = 'http://localhost:8000/api'

function fmt(dt) {
  if (!dt) return '-'
  const d = new Date(dt)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDate(d) {
  if (!d) return '-'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function fmtMoney(v) {
  if (v == null || v === '') return '-'
  return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

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

export default function ExtratoManutencao() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const [man, setMan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get(`${API}/manutencoes/${id}`)
      .then((r) => setMan(r.data))
      .catch(() => setError('Erro ao carregar extrato'))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!loading && man && searchParams.get('print') === '1') {
      setTimeout(() => window.print(), 300)
    }
  }, [loading, man, searchParams])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Carregando extrato...
      </div>
    )
  }

  if (error || !man) {
    return (
      <div className="text-red-600 text-center py-8">{error || 'Manutenção não encontrada'}</div>
    )
  }

  const totalValor = (man.servicos || []).reduce((acc, s) => acc + (parseFloat(s.valor) || 0), 0)

  return (
    <div className="space-y-3 print:max-w-full">
      {/* Header bar */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <Link to="/manutencoes" className="text-gray-500 hover:text-blue-600">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            Extrato de Manutenções do Veículo
          </h1>
        </div>
        <button
          onClick={() => window.print()}
          className="btn-secondary flex items-center gap-1.5 btn-sm"
        >
          <Printer className="w-3.5 h-3.5" />
          Imprimir
        </button>
      </div>

      {/* Print header */}
      <div className="hidden print:flex items-center gap-3 mb-4 border-b border-gray-300 pb-3">
        <img src={novalogo} alt="Logo" className="h-10 object-contain" />
        <p className="text-xs text-gray-500">Extrato de Manutenção de Veículo</p>
      </div>

      {/* Manutencao header info */}
      <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="section-header">
          Manutenção #{man.id}
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="form-label">Veículo</p>
              <p className="font-medium dark:text-gray-200">{man.veiculo?.placa}</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">{man.veiculo?.descricao}</p>
            </div>
            <div>
              <p className="form-label">Motorista</p>
              <p className="font-medium dark:text-gray-200">{man.motorista?.nome || '-'}</p>
              {man.motorista && <p className="text-gray-500 dark:text-gray-400 text-xs">Cód: {man.motorista.codigo}</p>}
            </div>
            <div>
              <p className="form-label">Oficina / Prestador</p>
              <p className="font-medium dark:text-gray-200">{man.responsavel_manutencao || '-'}</p>
            </div>
            <div>
              <p className="form-label">Requisitante</p>
              <p className="font-medium dark:text-gray-200">{man.requisitante || '-'}</p>
            </div>
            <div>
              <p className="form-label">Km Entrada</p>
              <p className="font-medium dark:text-gray-200">{man.km_entrada ? man.km_entrada.toLocaleString('pt-BR') : '-'}</p>
            </div>
            <div>
              <p className="form-label">Horímetro</p>
              <p className="font-medium dark:text-gray-200">{man.horimetro_entrada || '-'}</p>
            </div>
            <div>
              <p className="form-label">Status</p>
              <span className={`status-badge ${statusColor[man.status] || ''}`}>{man.status}</span>
            </div>
            <div>
              <p className="form-label">Prioridade</p>
              <p className={prioridadeColor[man.prioridade] || 'text-gray-600'}>
                {man.prioridade || '-'}
              </p>
            </div>
            <div>
              <p className="form-label">Tipo</p>
              <p className="font-medium dark:text-gray-200">{man.tipo || '-'}</p>
            </div>
            <div>
              <p className="form-label">Dt. Início</p>
              <p className="font-medium dark:text-gray-200">{fmt(man.dt_inicio)}</p>
            </div>
            <div>
              <p className="form-label">Dt. Previsão</p>
              <p className="font-medium dark:text-gray-200">{fmt(man.dt_previsao)}</p>
            </div>
            <div>
              <p className="form-label">Dt. Término</p>
              <p className="font-medium dark:text-gray-200">{fmt(man.dt_termino)}</p>
            </div>
          </div>

          {man.servicos_solicitados && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="form-label">Serviços Solicitados</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{man.servicos_solicitados}</p>
            </div>
          )}
          {man.observacao && (
            <div className="mt-2">
              <p className="form-label">Observação</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{man.observacao}</p>
            </div>
          )}
        </div>
      </div>

      {/* Servicos */}
      <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="section-header">
          Serviços Veículo ({man.servicos?.length || 0})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/40">
                <th className="px-2 py-1.5 text-left text-blue-800 dark:text-blue-300 font-semibold">#</th>
                <th className="px-2 py-1.5 text-left text-blue-800 dark:text-blue-300 font-semibold">Status</th>
                <th className="px-2 py-1.5 text-left text-blue-800 dark:text-blue-300 font-semibold">Parte Veículo</th>
                <th className="px-2 py-1.5 text-left text-blue-800 dark:text-blue-300 font-semibold">Serviço</th>
                <th className="px-2 py-1.5 text-left text-blue-800 dark:text-blue-300 font-semibold">Tipo</th>
                <th className="px-2 py-1.5 text-left text-blue-800 dark:text-blue-300 font-semibold">Dt. Serviço</th>
                <th className="px-2 py-1.5 text-left text-blue-800 dark:text-blue-300 font-semibold">Próx. Dt. Val.</th>
                <th className="px-2 py-1.5 text-right text-blue-800 dark:text-blue-300 font-semibold">Próx. Km</th>
                <th className="px-2 py-1.5 text-left text-blue-800 dark:text-blue-300 font-semibold">Responsável</th>
                <th className="px-2 py-1.5 text-left text-blue-800 dark:text-blue-300 font-semibold">Descrição</th>
                <th className="px-2 py-1.5 text-right text-blue-800 dark:text-blue-300 font-semibold">Valor R$</th>
                <th className="px-2 py-1.5 text-left text-blue-800 dark:text-blue-300 font-semibold">Horas</th>
              </tr>
            </thead>
            <tbody>
              {(man.servicos || []).length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-4 text-gray-400 dark:text-gray-500">
                    Nenhum serviço registrado.
                  </td>
                </tr>
              ) : (
                (man.servicos || []).map((s, idx) => (
                  <tr key={s.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}>
                    <td className="px-2 py-1.5 text-gray-400 dark:text-gray-500">{idx + 1}</td>
                    <td className="px-2 py-1.5">
                      <span className={`status-badge ${
                        s.status === 'Finalizado' ? 'bg-green-100 text-green-800' :
                        s.status === 'Cancelado' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>{s.status}</span>
                    </td>
                    <td className="px-2 py-1.5 dark:text-gray-300">{s.parte_veiculo || '-'}</td>
                    <td className="px-2 py-1.5 font-medium dark:text-gray-200">{s.servico || '-'}</td>
                    <td className="px-2 py-1.5 dark:text-gray-300">{s.tipo_uso || '-'}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap dark:text-gray-300">{fmtDate(s.dt_servico)}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap dark:text-gray-300">{fmtDate(s.proxima_dt_validade)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums dark:text-gray-300">{s.proximo_km_validade || '-'}</td>
                    <td className="px-2 py-1.5 dark:text-gray-300">{s.pessoa_responsavel || '-'}</td>
                    <td className="px-2 py-1.5 max-w-[140px] truncate dark:text-gray-300" title={s.descricao}>{s.descricao || '-'}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums dark:text-gray-300">{fmtMoney(s.valor)}</td>
                    <td className="px-2 py-1.5 dark:text-gray-300">{s.horas_trabalhadas || '-'}</td>
                  </tr>
                ))
              )}
              {(man.servicos || []).length > 0 && (
                <tr className="bg-gray-100 dark:bg-gray-700 border-t-2 border-gray-300 dark:border-gray-600 font-semibold">
                  <td colSpan={10} className="px-2 py-1.5 text-right text-xs text-gray-700 dark:text-gray-300">
                    Total:
                  </td>
                  <td className="px-2 py-1.5 text-right text-xs tabular-nums">
                    {fmtMoney(totalValor)}
                  </td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Arquivos */}
      {(man.arquivos || []).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="section-header">
            Arquivos Anexados ({man.arquivos.length})
          </div>
          <div className="p-3">
            <div className="flex flex-wrap gap-2">
              {man.arquivos.map((a) => (
                <a
                  key={a.id}
                  href={`http://localhost:8000/api/uploads/${a.caminho}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded px-2 py-1 text-xs text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                >
                  📎 {a.nome_arquivo}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center print:hidden">
        <Link to="/manutencoes" className="text-blue-600 hover:underline text-xs">
          &laquo; Listagem de Manutenções do Veículo
        </Link>
      </div>
    </div>
  )
}
