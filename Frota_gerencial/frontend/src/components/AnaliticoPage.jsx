import { useState, useEffect, useMemo, useCallback } from 'react';
import {
    AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import {
    TrendingUp, TrendingDown, Trophy, Target,
    AlertTriangle, Calendar, Wallet, BarChart3, ArrowRight, Search, X
} from 'lucide-react';

const API = import.meta.env.VITE_API_BASE || '';
const MES_NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MES_NOMES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MES_ABREV_TO_FULL = Object.fromEntries(MES_NOMES.map((abrev, i) => [abrev, MES_NOMES_FULL[i]]));

// Paleta Moderna
const ANO_CORES = {
    2024: '#f59e0b', // Amber
    2025: '#3b82f6', // Blue
    2026: '#10b981'  // Emerald
};
const PLACA_CORES = ['#059669', '#2563eb', '#d97706', '#7c3aed', '#db2777', '#0d9488', '#ea580c', '#4f46e5'];

// Formatadores
function fmtBRL(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
}
function fmtBRLk(v) {
    if (v == null) return '—';
    if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
    return fmtBRL(v);
}
function fmtNum(v, dec = 0) {
    if (v == null) return '—';
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
}


// Tooltip Glassmorphism
function CustomTooltip({ active, payload, label, isBRL = true }) {
    if (!active || !payload?.length) return null;
    const sorted = [...payload].sort((a, b) => (b.value || 0) - (a.value || 0));
    return (
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 shadow-xl rounded-xl p-4 min-w-[220px]">
            <p className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" /> {MES_ABREV_TO_FULL[label] || label}
            </p>
            <div className="space-y-2.5">
                {sorted.map((p, i) => {
                    if (p.value == null) return null;
                    const prevKey = String(parseInt(p.dataKey) - 1);
                    const prevEntry = payload.find(x => x.dataKey === prevKey);
                    const delta = prevEntry?.value ? ((p.value - prevEntry.value) / Math.abs(prevEntry.value) * 100) : null;
                    return (
                        <div key={i} className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full shadow-inner" style={{ background: p.color }} />
                                <span className="text-xs font-semibold text-slate-600">{p.dataKey}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-800">
                                    {isBRL ? fmtBRL(p.value) : fmtNum(p.value)}
                                </span>
                                {delta != null && (
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${delta >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                        {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Badge de Variação
function VarBadge({ value, label }) {
    if (value == null) return null;
    const pos = value >= 0;
    return (
        <div className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md text-[11px] ${pos ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
            {pos ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
            {pos ? '+' : ''}{value.toFixed(1)}%
            {label && <span className="font-medium opacity-70 ml-0.5">{label}</span>}
        </div>
    );
}


export default function AnaliticoPage({ ano, setAno, mes, setMes }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch_ = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({ year: ano, month: mes });
                const r = await fetch(`${API}/api/analitico?${params}`);
                const j = await r.json();
                setData(j.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetch_();
    }, [ano, mes]);

    const { kpis, receita_historica, placas_ranking, placas_mensal, top_pagadores, filtros, insights } = data || {};
    const anos = filtros?.anos || [2024, 2025, 2026];
    const anosDRE = filtros?.anos_dre || [];

    const anosVisiveis = useMemo(() => {
        if (!receita_historica?.length) return anosDRE;
        return anosDRE.filter(yr => receita_historica.some(row => row[String(yr)] != null && row[String(yr)] > 0));
    }, [receita_historica, anosDRE]);

    const receitaAnual = useMemo(() => {
        if (!receita_historica || receita_historica.length === 0) return [];
        const sumByYear = {};
        anosVisiveis.forEach(yr => sumByYear[yr] = 0);
        receita_historica.forEach(row => {
            anosVisiveis.forEach(yr => {
                if (row[String(yr)]) sumByYear[yr] += row[String(yr)];
            });
        });
        return anosVisiveis.map(yr => ({ ano: String(yr), receita: sumByYear[yr] })).filter(x => x.receita > 0);
    }, [receita_historica, anosVisiveis]);

    const corAno = (yr) => ANO_CORES[yr] || '#94a3b8';

    const metaMonthValues = useMemo(() => {
        if (!insights?.meses_bateu_meta || !receita_historica) return {};
        const result = {};
        insights.meses_bateu_meta.forEach(mesLabel => {
            const row = receita_historica.find(r => r.mes_label === mesLabel);
            if (row) result[mesLabel] = row[String(ano)];
        });
        return result;
    }, [insights, receita_historica, ano]);

    const [grupoFilter, setGrupoFilter] = useState('TODOS');
    const [searchPlaca, setSearchPlaca] = useState('');
    const [selectedPlacas, setSelectedPlacas] = useState([]);

    const grupos = useMemo(() => filtros?.grupos || [], [filtros]);

    const placasFiltradas = useMemo(() => {
        let list = placas_ranking || [];
        if (grupoFilter !== 'TODOS') list = list.filter(p => p.grupo === grupoFilter);
        if (searchPlaca.trim()) list = list.filter(p => p.placa.includes(searchPlaca.trim().toUpperCase()));
        return list;
    }, [placas_ranking, grupoFilter, searchPlaca]);

    const placasParaChart = useMemo(() => {
        if (selectedPlacas.length > 0) {
            return selectedPlacas.filter(pl => placasFiltradas.some(p => p.placa === pl)).slice(0, 8);
        }
        return placasFiltradas.slice(0, 8).map(p => p.placa);
    }, [selectedPlacas, placasFiltradas]);

    const togglePlaca = useCallback((placa) => {
        setSelectedPlacas(prev => {
            if (prev.includes(placa)) return prev.filter(p => p !== placa);
            if (prev.length >= 8) return [...prev.slice(1), placa];
            return [...prev, placa];
        });
    }, []);

    return (
        <div className="min-h-screen bg-slate-50/50 pb-16">

            {/* ── Filtros (Pills Flutuantes) ── */}
            <div className="hidden md:block sticky top-0 z-50 pt-6 pb-6 px-6 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/50">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="bg-white p-1.5 sm:p-2 rounded-xl shadow-sm border border-slate-200/60 flex items-center overflow-x-auto max-w-full">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 shrink-0">Ano</span>
                            <div className="flex gap-0.5 sm:gap-1">
                                {anos.map(y => (
                                    <button key={y} onClick={() => { setAno(y); setMes(0); }}
                                        className={`px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 whitespace-nowrap ${ano === y
                                            ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20'
                                            : 'text-slate-500 hover:bg-slate-100'}`}>
                                        {y}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white p-1.5 sm:p-2 rounded-xl shadow-sm border border-slate-200/60 flex flex-wrap items-center overflow-x-auto max-w-full">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 shrink-0 hidden sm:block">Mês</span>
                            <div className="flex gap-0.5 sm:gap-1 flex-wrap">
                                <button onClick={() => setMes(0)}
                                    className={`px-2.5 py-1 sm:px-4 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 ${mes === 0
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                        : 'text-slate-500 hover:bg-slate-100'}`}>
                                    Anual
                                </button>
                                {MES_NOMES.map((nome, idx) => (
                                    <button key={idx} onClick={() => setMes(idx + 1)}
                                        className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all duration-200 ${mes === idx + 1
                                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                            : 'text-slate-500 hover:bg-slate-100'}`}>
                                        {nome}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                    <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    <p className="text-emerald-700 font-bold tracking-wide animate-pulse">Sintetizando Dados Financeiros...</p>
                </div>
            ) : (
                <div className="max-w-[1600px] mx-auto px-3 sm:px-6 mt-8 space-y-12">

                    {/* =========================================================
                        SEÇÃO 1: FATURAMENTO E DRE
                    ========================================================= */}
                    <section>
                        {/* FAIXA COMPACTA DE KPIs + INSIGHTS */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-6 overflow-hidden">
                            <div className="flex flex-wrap divide-x divide-slate-100">

                                {/* Faturamento principal */}
                                <div className="flex-1 min-w-[180px] px-6 py-4 flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                                        <Wallet size={18} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Faturamento {mes === 0 ? 'Anual' : MES_NOMES_FULL[mes - 1]}</p>
                                        <p className="text-xl font-black text-slate-800 tracking-tight">{fmtBRL(kpis?.receita)}</p>
                                    </div>
                                </div>

                                {/* vs Mês Anterior */}
                                <div className="px-6 py-4 flex items-center gap-3 min-w-[130px]">
                                    <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                        <ArrowRight size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">vs Mês Ant.</p>
                                        {kpis?.receita_mom != null
                                            ? <p className={`text-lg font-black ${kpis.receita_mom >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{kpis.receita_mom > 0 ? '+' : ''}{kpis.receita_mom.toFixed(1)}%</p>
                                            : <p className="text-lg font-bold text-slate-300">—</p>}
                                    </div>
                                </div>

                                {/* vs Ano Passado */}
                                <div className="px-6 py-4 flex items-center gap-3 min-w-[130px]">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-400 shrink-0">
                                        <Calendar size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">vs Ano Ant.</p>
                                        {kpis?.receita_yoy != null
                                            ? <p className={`text-lg font-black ${kpis.receita_yoy >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>{kpis.receita_yoy > 0 ? '+' : ''}{kpis.receita_yoy.toFixed(1)}%</p>
                                            : <p className="text-lg font-bold text-slate-300">—</p>}
                                    </div>
                                </div>

                                {/* Melhor Mês */}
                                {insights?.melhor_mes && mes === 0 && (
                                    <div className="px-6 py-4 flex items-center gap-3 min-w-[160px]">
                                        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                                            <Trophy size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Melhor Mês</p>
                                            <p className="text-base font-black text-slate-800">{MES_ABREV_TO_FULL[insights.melhor_mes.mes] || insights.melhor_mes.mes}</p>
                                            <p className="text-xs font-semibold text-emerald-600">{fmtBRL(insights.melhor_mes.valor)}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Pior Mês */}
                                {insights?.pior_mes && mes === 0 && (
                                    <div className="px-6 py-4 flex items-center gap-3 min-w-[160px]">
                                        <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-400 shrink-0">
                                            <AlertTriangle size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Menor Mês</p>
                                            <p className="text-base font-black text-slate-800">{MES_ABREV_TO_FULL[insights.pior_mes.mes] || insights.pior_mes.mes}</p>
                                            <p className="text-xs font-semibold text-rose-500">{fmtBRL(insights.pior_mes.valor)}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Metas Atingidas */}
                                {insights?.meses_bateu_meta && mes === 0 && (
                                    <div className="px-6 py-4 flex items-center gap-3 flex-1 min-w-[160px]">
                                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                                            <Target size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Meses c/ Meta</p>
                                            {insights.meses_bateu_meta.length > 0
                                                ? <div className="flex flex-wrap gap-1">
                                                    {insights.meses_bateu_meta.map(m => (
                                                        <div key={m} className="relative group/pill">
                                                            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-md cursor-default">
                                                                {MES_ABREV_TO_FULL[m] || m}
                                                            </span>
                                                            {metaMonthValues[m] != null && (
                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/pill:block z-50 pointer-events-none">
                                                                    <div className="bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
                                                                        {MES_ABREV_TO_FULL[m] || m}: {fmtBRL(metaMonthValues[m])}
                                                                    </div>
                                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                  </div>
                                                : <p className="text-xs text-slate-400">Nenhum</p>}
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>

                        {/* GRÁFICOS: EVOLUÇÃO E BARRA */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
                            {/* AreaChart Evolução Anual */}
                            <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-800">Trajetória de Faturamento Histórico</h3>
                                        <p className="text-xs font-medium text-slate-400 mt-1">Evolução mensal da receita DRE — {ano}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ background: corAno(ano) }} />
                                        <span className="text-xs font-bold text-slate-700">{ano}</span>
                                    </div>
                                </div>
                                <div className="flex-1 min-h-[320px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={receita_historica || []} margin={{ top: 50, right: 16, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id={`grad-${ano}`} x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={corAno(ano)} stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor={corAno(ano)} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                                            <XAxis dataKey="mes_label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600 }} dy={10} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} tickFormatter={fmtBRLk} width={60} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                            <Area
                                                type="monotone"
                                                dataKey={String(ano)}
                                                stroke={corAno(ano)}
                                                strokeWidth={3}
                                                fill={`url(#grad-${ano})`}
                                                activeDot={{ r: 7, strokeWidth: 2, stroke: 'white', fill: corAno(ano) }}
                                                dot={(dotProps) => {
                                                    const { cx, cy, index, payload } = dotProps;
                                                    const valor = payload?.[String(ano)];
                                                    const mesLabel = payload?.mes_label;
                                                    if (valor == null || cx == null || cy == null) return <g key={index} />;
                                                    const isMelhor = mesLabel === insights?.melhor_mes?.mes;
                                                    const isPior = mesLabel === insights?.pior_mes?.mes;
                                                    const dotColor = isMelhor ? '#059669' : isPior ? '#e11d48' : corAno(ano);
                                                    const r = (isMelhor || isPior) ? 7 : 4;
                                                    return (
                                                        <g key={index}>
                                                            <circle cx={cx} cy={cy} r={r} fill={dotColor} stroke="white" strokeWidth={2.5} />
                                                            <text x={cx} y={cy - r - 6} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={dotColor}>
                                                                {fmtBRLk(valor)}
                                                            </text>
                                                            {isMelhor && (
                                                                <text x={cx} y={cy - r - 18} textAnchor="middle" fontSize={8.5} fontWeight={800} fill={dotColor}>▲ Melhor mês</text>
                                                            )}
                                                            {isPior && (
                                                                <text x={cx} y={cy - r - 18} textAnchor="middle" fontSize={8.5} fontWeight={800} fill={dotColor}>▼ Menor mês</text>
                                                            )}
                                                        </g>
                                                    );
                                                }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* BarChart Crescimento Total do Ano */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
                                <div className="mb-6">
                                    <h3 className="text-base font-bold text-slate-800">Fechamento e Evolução Anual</h3>
                                    <p className="text-xs font-medium text-slate-400 mt-1">Saldo consolidado por exercício</p>
                                </div>
                                <div className="flex-1 min-h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={receitaAnual} layout="vertical" margin={{ top: 0, right: 155, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="4 4" horizontal={true} vertical={false} stroke="#e2e8f0" />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="ano" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#475569', fontWeight: 700 }} width={45} />
                                            <Tooltip cursor={{ fill: '#f8fafc' }} content={({ active, payload }) => {
                                                if (!active || !payload?.length) return null;
                                                return (
                                                    <div className="bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg">
                                                        {payload[0].payload.ano}: {fmtBRL(payload[0].value)}
                                                    </div>
                                                );
                                            }} />
                                            <Bar dataKey="receita" radius={[0, 6, 6, 0]} barSize={32}>
                                                {receitaAnual.map((entry, index) => (
                                                    <Cell key={index} fill={corAno(parseInt(entry.ano))} />
                                                ))}
                                                <LabelList
                                                    dataKey="receita"
                                                    position="right"
                                                    formatter={(v) => fmtBRL(v)}
                                                    style={{ fontSize: 12, fontWeight: 700, fill: '#334155' }}
                                                />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* FATURAMENTO POR PLACA — DOIS CARDS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                            {/* Card esquerdo: Lista de Placas */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-[400px] md:h-[520px] flex flex-col">
                                {/* Header */}
                                <div className="px-5 pt-4 pb-3 border-b border-slate-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <h3 className="text-base font-bold text-slate-800">Faturamento por Placa</h3>
                                            <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                                                {placasFiltradas.length} placa{placasFiltradas.length !== 1 ? 's' : ''}
                                                {selectedPlacas.length > 0 && <span className="text-indigo-500 ml-1">· {selectedPlacas.length} selecionada{selectedPlacas.length > 1 ? 's' : ''}</span>}
                                            </p>
                                        </div>
                                        <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-1 rounded-md font-bold shrink-0">DRE FROTA</span>
                                    </div>
                                    {/* Filtros */}
                                    <div className="flex gap-2">
                                        <select
                                            value={grupoFilter}
                                            onChange={e => { setGrupoFilter(e.target.value); setSelectedPlacas([]); }}
                                            className="flex-1 text-xs font-semibold px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer min-w-0"
                                        >
                                            <option value="TODOS">Todos os grupos</option>
                                            {grupos.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                        <div className="relative">
                                            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                placeholder="Placa..."
                                                value={searchPlaca}
                                                onChange={e => { setSearchPlaca(e.target.value); setSelectedPlacas([]); }}
                                                className="text-xs px-2 py-1.5 pl-6 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-24"
                                            />
                                        </div>
                                        {selectedPlacas.length > 0 && (
                                            <button
                                                onClick={() => setSelectedPlacas([])}
                                                className="flex items-center gap-0.5 text-[10px] text-slate-400 hover:text-slate-700 px-1.5 py-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                                            >
                                                <X size={10} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Lista scrollável */}
                                <div className="flex-1 overflow-y-auto py-2 px-2">
                                    {placasFiltradas.length > 0 ? (
                                        <div className="space-y-0.5">
                                            {placasFiltradas.map((row, index) => {
                                                const chartIdx = placasParaChart.indexOf(row.placa);
                                                const isInChart = chartIdx >= 0;
                                                const color = isInChart ? PLACA_CORES[chartIdx % PLACA_CORES.length] : null;
                                                const maxR = placasFiltradas[0]?.receita || 1;
                                                const pct = Math.max((row.receita / maxR) * 100, 3);
                                                return (
                                                    <button
                                                        key={row.placa}
                                                        onClick={() => togglePlaca(row.placa)}
                                                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-all duration-150 ${isInChart ? 'bg-slate-50 border border-slate-200' : 'hover:bg-slate-50 border border-transparent'}`}
                                                    >
                                                        <span
                                                            className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                                                            style={{ background: color || '#e2e8f0', color: color ? '#fff' : '#94a3b8' }}
                                                        >
                                                            {index + 1}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-1">
                                                                <span className="text-xs font-bold text-slate-700 truncate">{row.placa}</span>
                                                                <span className="text-[10px] font-semibold text-slate-500 shrink-0">{fmtBRL(row.receita)}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color || '#cbd5e1' }} />
                                                                </div>
                                                                {row.grupo && row.grupo !== '—' && (
                                                                    <span className="text-[8px] text-slate-400 truncate max-w-[60px]">{row.grupo}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <BarChart3 size={32} className="mb-2 opacity-20" />
                                            <p className="text-xs font-medium">Nenhuma placa encontrada</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Card direito: Desempenho Mensal */}
                            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 h-[400px] md:h-[520px] flex flex-col">
                                {/* Header */}
                                <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-800">Desempenho Mensal por Placa</h3>
                                        <p className="text-xs font-medium text-slate-400 mt-0.5">
                                            {selectedPlacas.length > 0 ? 'Seleção manual' : 'Top 8 do filtro atual'}
                                            {' · clique na lista para selecionar'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap justify-end max-w-full sm:max-w-[60%]">
                                        {placasParaChart.map((placa, i) => (
                                            <button
                                                key={placa}
                                                onClick={() => togglePlaca(placa)}
                                                className="flex items-center gap-1 hover:opacity-60 transition-opacity"
                                                title="Clique para remover"
                                            >
                                                <div className="w-2 h-2 rounded-full" style={{ background: PLACA_CORES[i % PLACA_CORES.length] }} />
                                                <span className="text-[10px] font-bold text-slate-600">{placa}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Gráfico */}
                                <div className="flex-1 p-4 min-h-0">
                                    {placasParaChart.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={placas_mensal || []} margin={{ top: 35, right: 20, left: 0, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="mes_label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} tickFormatter={fmtBRLk} width={55} />
                                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                                {placasParaChart.map((placa, i) => {
                                                    const lineColor = PLACA_CORES[i % PLACA_CORES.length];
                                                    return (
                                                        <Line
                                                            key={placa}
                                                            type="monotone"
                                                            dataKey={placa}
                                                            stroke={lineColor}
                                                            strokeWidth={2.5}
                                                            connectNulls
                                                            activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
                                                            dot={(dotProps) => {
                                                                const { cx, cy, index, payload } = dotProps;
                                                                const valor = payload?.[placa];
                                                                if (!valor || cx == null || cy == null) return <g key={`${placa}-${index}`} />;
                                                                const prevRow = (placas_mensal || [])[index - 1];
                                                                const prevValor = prevRow?.[placa];
                                                                const mom = (prevValor && prevValor > 0) ? ((valor - prevValor) / prevValor * 100) : null;
                                                                const momColor = mom == null ? null : mom > 0 ? '#059669' : mom < 0 ? '#e11d48' : '#94a3b8';
                                                                return (
                                                                    <g key={`${placa}-${index}`}>
                                                                        <circle cx={cx} cy={cy} r={4} fill={lineColor} stroke="white" strokeWidth={2} />
                                                                        <text x={cx} y={cy - 10} textAnchor="middle" fontSize={9} fontWeight={700} fill={lineColor}>
                                                                            {fmtBRLk(valor)}
                                                                        </text>
                                                                        {mom != null && (
                                                                            <text x={cx} y={cy + 20} textAnchor="middle" fontSize={8} fontWeight={800} fill={momColor}>
                                                                                {mom > 0 ? '+' : ''}{mom.toFixed(0)}%
                                                                            </text>
                                                                        )}
                                                                    </g>
                                                                );
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                            <BarChart3 size={40} className="mb-3 opacity-20" />
                                            <p className="text-sm font-medium">
                                                {placasFiltradas.length > 0
                                                    ? 'Clique em uma placa para ver o histórico.'
                                                    : 'Nenhuma placa encontrada para o período.'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* =========================================================
                        SEÇÃO 2: FATURAMENTO POR PAGADOR
                    ========================================================= */}
                    <section>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Detalhamento por Pagador</h3>
                            </div>
                            <div className="overflow-y-auto max-h-[420px]">
                                <table className="w-full text-sm text-left">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="px-5 py-4 font-bold text-slate-500">#</th>
                                            <th className="px-5 py-4 font-bold text-slate-500">Pagador</th>
                                            <th className="px-5 py-4 font-bold text-slate-500 text-right">Faturamento</th>
                                            <th className="px-5 py-4 font-bold text-slate-500 text-center">Part.%</th>
                                            <th className="px-5 py-4 font-bold text-slate-500 text-center">YoY%</th>
                                            <th className="px-5 py-4 font-bold text-slate-500 text-center">CTRCs</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {(top_pagadores || []).map((p, i) => (
                                            <tr key={i} className="hover:bg-blue-50/50 transition-colors group">
                                                <td className="px-5 py-3 text-slate-400 font-bold text-xs">{i + 1}</td>
                                                <td className="px-5 py-3 font-semibold text-slate-800" title={p.pagador}>
                                                    <div className="group-hover:text-blue-700 transition-colors">{p.pagador}</div>
                                                </td>
                                                <td className="px-5 py-3 text-right font-bold text-slate-800">{fmtBRL(p.receita)}</td>
                                                <td className="px-5 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min(p.pct_total, 100)}%` }} />
                                                        </div>
                                                        <span className="text-xs font-semibold text-slate-500">{p.pct_total?.toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-center"><VarBadge value={p.var_yoy} /></td>
                                                <td className="px-5 py-3 text-center">
                                                    <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold text-xs">{fmtNum(p.viagens)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                        {(!top_pagadores || top_pagadores.length === 0) && (
                                            <tr><td colSpan="6" className="text-center py-10 text-slate-400 font-medium">Nenhum dado de pagadores encontrado para o período.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
