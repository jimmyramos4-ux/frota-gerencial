import { useState, useMemo } from 'react';
import { calcDiasUteisAuto, calcDiasUteisPassados } from '../utils/feriados';

const fmt = (val) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val ?? 0);

const fmtDias = (v) =>
    Number.isInteger(v) ? `${v}` : v.toFixed(1);

export default function InsightMeta({ metaManual = 0, dailyData = [], receitaGlobal = 0, mes, ano }) {
    // Cálculo automático de dias úteis
    const autoResult = useMemo(() => calcDiasUteisAuto(ano, mes), [ano, mes]);
    const autoTotal = autoResult.total; // ex: 23.5

    const [modoAuto, setModoAuto] = useState(true);
    const [diasManuais, setDiasManuais] = useState(22);
    const [isEditing, setIsEditing] = useState(false);
    const [tempDias, setTempDias] = useState(22);

    // Dias úteis totais do mês (auto ou manual)
    const diasUteis = modoAuto ? autoTotal : diasManuais;

    // ── Cálculos ──────────────────────────────────────────────────
    const faturamentoAcumulado = receitaGlobal || 0;

    // Dias úteis passados com pesos reais (Seg=1, Sab=0.5, Dom=0, Feriado=0)
    const diasUteisPassados = useMemo(
        () => calcDiasUteisPassados(ano, mes, dailyData),
        [ano, mes, dailyData]
    );

    const diasRestantes = diasUteis - diasUteisPassados;
    const diasRestantesDisplay = Math.max(diasRestantes, 0);
    const diasEsgotados = diasRestantes <= 0;

    const mediaAtual = diasUteisPassados > 0 ? faturamentoAcumulado / diasUteisPassados : 0;
    const faltaFaturar = Math.max(metaManual - faturamentoAcumulado, 0);
    const mediaNecessaria = faltaFaturar / Math.max(diasRestantes, 1);

    const onTrack = diasUteisPassados > 0 && mediaAtual >= mediaNecessaria;
    const metaBatida = faturamentoAcumulado >= metaManual;

    const handleSalvar = () => {
        const val = Math.max(0.5, Math.min(31, parseFloat(tempDias) || 22));
        setDiasManuais(val);
        setModoAuto(false);
        setIsEditing(false);
    };

    const handleAuto = () => {
        setModoAuto(true);
        setIsEditing(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

            {/* Faixa de status */}
            <div className={`h-1.5 w-full ${metaBatida ? 'bg-[#147a61]' : onTrack ? 'bg-yellow-400' : 'bg-red-400'}`} />

            <div className="p-4">
                {/* Linha superior: subtítulo + botão dias úteis */}
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest">
                        Projeção de Meta
                    </p>

                    {/* Controle de Dias Úteis */}
                    <div className="flex items-center gap-1.5">
                        {isEditing ? (
                            <>
                                <span className="text-[11px] text-gray-500 font-bold">Dias úteis:</span>
                                <input
                                    type="number"
                                    value={tempDias}
                                    onChange={e => setTempDias(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSalvar()}
                                    step="0.5" min="0.5" max="31"
                                    className="border border-gray-300 rounded px-2 py-0.5 text-xs w-16 outline-none focus:border-[#147a61]"
                                    autoFocus
                                />
                                <button onClick={handleSalvar}
                                    className="text-[#147a61] font-bold text-xs hover:underline">OK</button>
                                <button onClick={() => setIsEditing(false)}
                                    className="text-gray-400 text-xs hover:text-gray-600">✕</button>
                                <button onClick={handleAuto}
                                    className="text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-0.5 rounded transition">
                                    AUTO
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => { setTempDias(modoAuto ? autoTotal : diasManuais); setIsEditing(true); }}
                                    className={`text-[10px] font-bold border px-2 py-0.5 rounded transition ${modoAuto
                                        ? 'bg-gray-50 border-gray-200 text-gray-500 hover:text-[#147a61] hover:border-[#147a61]'
                                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:text-[#147a61] hover:border-[#147a61]'
                                        }`}
                                >
                                    Dias úteis: {fmtDias(diasUteis)}
                                </button>
                                {!modoAuto && (
                                    <button onClick={handleAuto}
                                        className="text-[10px] font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-0.5 rounded transition">
                                        AUTO
                                    </button>
                                )}
                                {modoAuto && (
                                    <span className="text-[9px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                                        AUTO
                                    </span>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Texto principal do insight */}
                <div className={`rounded-lg px-4 py-3 mb-3 ${metaBatida ? 'bg-[#f0f7f4]' : onTrack ? 'bg-yellow-50' : 'bg-red-50'}`}>
                    {metaBatida ? (
                        <p className="text-sm font-semibold text-[#147a61] text-center leading-relaxed">
                            Meta atingida! Faturamos <strong>{fmt(faturamentoAcumulado)}</strong> de{' '}
                            <strong>{fmt(metaManual)}</strong> neste mês. ✓
                        </p>
                    ) : (
                        <p className={`text-sm font-semibold text-center leading-relaxed ${onTrack ? 'text-yellow-800' : 'text-red-700'}`}>
                            Para atingirmos a meta, devemos faturar em média{' '}
                            <strong>{fmt(mediaNecessaria)}/dia</strong>
                            {' — '}hoje estamos faturando{' '}
                            <strong>{diasUteisPassados > 0 ? fmt(mediaAtual) : '—'}/dia</strong>.
                        </p>
                    )}
                </div>

                {/* Cards de métricas */}
                <div className="grid grid-cols-3 gap-3">
                    {/* Acumulado */}
                    <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">Acumulado</p>
                        <p className="text-sm font-bold text-gray-800">{fmt(faturamentoAcumulado)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{fmtDias(diasUteisPassados)} dia(s) úteis</p>
                    </div>

                    {/* Média necessária */}
                    <div className={`rounded-lg p-2.5 text-center ${onTrack || metaBatida ? 'bg-[#f0f7f4]' : 'bg-red-50'}`}>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">Média necessária</p>
                        <p className={`text-sm font-bold ${metaBatida ? 'text-[#147a61]' : onTrack ? 'text-[#147a61]' : 'text-red-600'}`}>
                            {metaBatida ? '—' : fmt(mediaNecessaria)}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                            {metaBatida
                                ? 'Meta batida'
                                : diasEsgotados
                                    ? 'Dias esgotados'
                                    : `${fmtDias(diasRestantesDisplay)} dia(s) restantes`
                            }
                        </p>
                    </div>

                    {/* Média atual */}
                    <div className={`rounded-lg p-2.5 text-center ${onTrack || metaBatida ? 'bg-[#f0f7f4]' : 'bg-orange-50'}`}>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">Média atual</p>
                        <p className={`text-sm font-bold ${onTrack || metaBatida ? 'text-[#147a61]' : 'text-orange-600'}`}>
                            {diasUteisPassados > 0 ? fmt(mediaAtual) : '—'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Sáb=½ · Dom=0</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
