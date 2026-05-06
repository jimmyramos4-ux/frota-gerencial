import React, { useState, useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { Loader2, Printer, ChevronLeft } from 'lucide-react'
import novalogo from '../../assets/novalogo.png'
import { API } from '../../lib/config'


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

const printStyles = `
  @media print {
    @page { size: A4 portrait; margin: 1.2cm 1.5cm; }
    body { background: white !important; color: black !important; }
    .print-hidden { display: none !important; }
    .print-section { break-inside: avoid; page-break-inside: avoid; }
    .print-root { background: white !important; color: #111 !important; }
    .print-root * { color: inherit; }
    .print-card { background: white !important; border: 1px solid #e5e7eb !important; }
    .print-header { background: #1d4ed8 !important; color: white !important; }
    .print-label { color: #6b7280 !important; }
    .print-value { color: #111827 !important; }
    .print-table th { background: #eff6ff !important; color: #1e40af !important; }
    .print-table tr:nth-child(odd) td { background: white !important; }
    .print-table tr:nth-child(even) td { background: #f9fafb !important; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`

function InfoBox({ label, value, sub }) {
  return (
    <div>
      <p className="print-label text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-0.5">{label}</p>
      <p className="print-value text-xs font-semibold text-gray-900 dark:text-gray-100">{value || '-'}</p>
      {sub && <p className="text-[10px] text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  )
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
      setTimeout(() => window.print(), 400)
    }
  }, [loading, man, searchParams])

  if (loading) return (
    <div className="flex items-center justify-center h-40 text-gray-400">
      <Loader2 className="w-6 h-6 animate-spin mr-2" />Carregando extrato...
    </div>
  )

  if (error || !man) return (
    <div className="text-red-600 text-center py-8">{error || 'Manutenção não encontrada'}</div>
  )

  const totalServicos = (man.servicos || []).reduce((acc, s) => acc + (parseFloat(s.valor) || 0), 0)
  const custoPecas = parseFloat(man.custo_pecas || 0)
  const totalValor = totalServicos + custoPecas

  return (
    <>
      <style>{printStyles}</style>

      {/* Barra de navegação (somente tela) */}
      <div className="flex items-center justify-between mb-4 print-hidden">
        <div className="flex items-center gap-3">
          <Link to="/manutencoes" className="text-gray-500 hover:text-blue-600">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            Extrato de Manutenção #{man.id}
          </h1>
        </div>
        <button onClick={() => window.print()} className="btn-secondary flex items-center gap-1.5 btn-sm">
          <Printer className="w-3.5 h-3.5" />Imprimir
        </button>
      </div>

      {/* Conteúdo */}
      <div className="print-root space-y-3">

        {/* Cabeçalho do documento */}
        <div className="print-section print-card bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-3 mb-1">
            <div className="flex items-center gap-3">
              <img src={novalogo} alt="Logo" className="h-9 object-contain" />
              <div>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-400">Frota Bello — Gestão de Frotas</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Extrato de Manutenção de Veículo</p>
              </div>
            </div>
            <div className="text-right text-[10px] text-gray-400 dark:text-gray-500">
              <p>Gerado em: {new Date().toLocaleString('pt-BR')}</p>
              <p>Manutenção #{man.id}</p>
            </div>
          </div>
        </div>

        {/* Dados da manutenção */}
        <div className="print-section print-card bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="print-header bg-blue-700 text-white px-4 py-2 text-xs font-bold">
            Dados da Manutenção
          </div>
          <div className="p-4 space-y-4">
            {/* Linha 1 */}
            <div className="grid grid-cols-4 gap-4">
              <InfoBox label="Veículo" value={man.veiculo?.placa} sub={man.veiculo?.descricao} />
              <InfoBox label="Marca / Modelo" value={`${man.veiculo?.marca || ''} ${man.veiculo?.modelo || ''}`.trim() || null} />
              <InfoBox label="Motorista" value={man.motorista?.nome} sub={man.motorista ? `Cód: ${man.motorista.codigo}` : null} />
              <InfoBox label="Oficina / Prestador" value={man.responsavel_manutencao} />
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700" />
            {/* Linha 2 */}
            <div className="grid grid-cols-4 gap-4">
              <InfoBox label="Km Entrada" value={man.km_entrada ? man.km_entrada.toLocaleString('pt-BR') + ' km' : null} />
              <InfoBox label="Horímetro" value={man.horimetro_entrada} />
              <InfoBox label="Tipo" value={man.tipo} />
              <InfoBox label="Requisitante" value={man.requisitante} />
            </div>
            <div className="border-t border-gray-100 dark:border-gray-700" />
            {/* Linha 3 */}
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="print-label text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Status</p>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  man.status === 'Finalizada' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                  man.status === 'Cancelada'  ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                  'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                }`}>{man.status}</span>
              </div>
              <div>
                <p className="print-label text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-0.5">Prioridade</p>
                <p className={`text-xs font-bold ${
                  man.prioridade === 'Alta'  ? 'text-red-600 dark:text-red-400' :
                  man.prioridade === 'Média' ? 'text-orange-500 dark:text-orange-400' :
                  'text-green-600 dark:text-green-400'
                }`}>{man.prioridade || '-'}</p>
              </div>
              <InfoBox label="Dt. Início" value={fmt(man.dt_inicio)} />
              <InfoBox label="Dt. Término" value={fmt(man.dt_termino)} />
            </div>

            {man.servicos_solicitados && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-700" />
                <div>
                  <p className="print-label text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">Serviços Solicitados</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300">{man.servicos_solicitados}</p>
                </div>
              </>
            )}
            {man.observacao && (
              <div>
                <p className="print-label text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-semibold mb-1">Observação</p>
                <p className="text-xs text-gray-700 dark:text-gray-300">{man.observacao}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabela de serviços */}
        <div className="print-section print-card bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="print-header bg-blue-700 text-white px-4 py-2 text-xs font-bold">
            Serviços Realizados ({man.servicos?.length || 0})
          </div>
          <div className="overflow-x-auto">
            <table className="print-table w-full text-xs">
              <thead>
                <tr className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/40">
                  {['#','Status','Parte','Serviço','Tipo','Dt. Serviço','Próx. Val.','Próx. KM','Responsável','Descrição','Valor','Horas'].map(h => (
                    <th key={h} className="px-2 py-2 text-left text-blue-800 dark:text-blue-300 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(man.servicos || []).length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-4 text-gray-400 dark:text-gray-500">Nenhum serviço registrado.</td></tr>
                ) : (man.servicos || []).map((s, idx) => (
                  <tr key={s.id} className={`border-b border-gray-100 dark:border-gray-700 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
                    <td className="px-2 py-1.5 text-gray-400 dark:text-gray-500">{idx + 1}</td>
                    <td className="px-2 py-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        s.status === 'Finalizado' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                        s.status === 'Cancelado'  ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                      }`}>{s.status}</span>
                    </td>
                    <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300">{s.parte_veiculo || '-'}</td>
                    <td className="px-2 py-1.5 font-semibold text-gray-800 dark:text-gray-200">{s.servico || '-'}</td>
                    <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{s.tipo_uso || '-'}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-gray-600 dark:text-gray-400">{fmtDate(s.dt_servico)}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-gray-600 dark:text-gray-400">{fmtDate(s.proxima_dt_validade)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-gray-600 dark:text-gray-400">{s.proximo_km_validade || '-'}</td>
                    <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{s.pessoa_responsavel || '-'}</td>
                    <td className="px-2 py-1.5 max-w-[160px] truncate text-gray-600 dark:text-gray-400" title={s.descricao}>{s.descricao || '-'}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-gray-700 dark:text-gray-300">{fmtMoney(s.valor)}</td>
                    <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{s.horas_trabalhadas || '-'}</td>
                  </tr>
                ))}
                {(man.servicos || []).length > 0 && (
                  <tr className="bg-gray-100 dark:bg-gray-700 border-t-2 border-gray-300 dark:border-gray-600">
                    <td colSpan={10} className="px-2 py-1.5 text-right text-xs font-bold text-gray-700 dark:text-gray-300">{custoPecas > 0 ? 'Subtotal serviços:' : 'Total:'}</td>
                    <td className="px-2 py-1.5 text-right text-xs font-bold tabular-nums text-gray-800 dark:text-gray-200">{fmtMoney(totalServicos)}</td>
                    <td />
                  </tr>
                )}
                {custoPecas > 0 && (
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <td colSpan={10} className="px-2 py-1.5 text-right text-xs font-bold text-purple-700 dark:text-purple-400">Peças do estoque:</td>
                    <td className="px-2 py-1.5 text-right text-xs font-bold tabular-nums text-purple-700 dark:text-purple-400">{fmtMoney(custoPecas)}</td>
                    <td />
                  </tr>
                )}
                {custoPecas > 0 && (
                  <tr className="bg-blue-50 dark:bg-blue-900/20 border-t-2 border-blue-300 dark:border-blue-700">
                    <td colSpan={10} className="px-2 py-1.5 text-right text-xs font-bold text-blue-800 dark:text-blue-300">Total geral:</td>
                    <td className="px-2 py-1.5 text-right text-xs font-bold tabular-nums text-blue-900 dark:text-blue-200">{fmtMoney(totalValor)}</td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Arquivos */}
        {(man.arquivos || []).length > 0 && (
          <div className="print-section print-card bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="print-header bg-blue-700 text-white px-4 py-2 text-xs font-bold">
              Arquivos Anexados ({man.arquivos.length})
            </div>
            <div className="p-3 flex flex-wrap gap-2">
              {man.arquivos.map((a) => (
                <a key={a.id} href={a.conteudo || (a.caminho ? `${API}/uploads/${a.caminho}` : '#')} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded px-2 py-1 text-xs text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                  📎 {a.nome_arquivo}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-2">
          <span>Frota Bello — Gestão de Frotas</span>
          <span>{new Date().toLocaleString('pt-BR')}</span>
        </div>
      </div>

      {/* Link voltar (somente tela) */}
      <div className="text-center print-hidden mt-4">
        <Link to="/manutencoes" className="text-blue-600 hover:underline text-xs">
          &laquo; Listagem de Manutenções
        </Link>
      </div>
    </>
  )
}
