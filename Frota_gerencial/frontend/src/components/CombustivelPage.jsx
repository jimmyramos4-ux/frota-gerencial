import { useState, useEffect, useMemo } from 'react';
import {
    ComposedChart, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Fuel, Droplets, Route, TrendingUp, TrendingDown, Gauge, Award, AlertTriangle } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE || '';

const MES_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const GRUPO_CORES = {
    'RODOTREM': '#3b82f6',
    'CONTAINER - RODOTREM': '#8b5cf6',
    'CIMENTO MS': '#f59e0b',
    'CONTAINER - 4 EIXO': '#10b981',
    'SEM GRUPO': '#6b7280',
};

function fmtMes(mes) {
    const m = parseInt(mes.split('-')[1]) - 1;
    return MES_LABELS[m] + '.';
}
function fmtBRL(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}
function fmtNum(v, dec = 0) {
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
}

// ── Cor por percentil — agora recebe p25/p75 do grupo ────────────────────────
function mediaColor(value, p25, p75) {
    if (value === null || value === undefined) return { bg: '', text: '' };
    if (p25 == null || p75 == null) return { bg: '', text: '' };
    if (value >= p75) return { bg: 'bg-emerald-100', text: 'text-emerald-800 font-bold' };
    if (value >= p25) return { bg: 'bg-sky-50',      text: 'text-sky-700' };
    return                  { bg: 'bg-red-50',        text: 'text-red-600' };
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ icon, label, value, sub, trend, iconBg, badge }) {
    const isPos = trend > 0;
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>
                <div className="flex flex-col items-end gap-1">
                    {badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                            {badge}
                        </span>
                    )}
                    {trend !== null && trend !== undefined && (
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${isPos ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            {isPos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {Math.abs(trend).toFixed(1)}%
                        </span>
                    )}
                </div>
            </div>
            <div>
                <div className="text-2xl font-extrabold text-gray-800 leading-tight">{value}</div>
                <div className="text-xs font-semibold text-gray-500 mt-0.5 uppercase tracking-wide">{label}</div>
                {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
            </div>
        </div>
    );
}

// ── Tooltip customizado ───────────────────────────────────────────────────────
function CustomTooltipTrend({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[170px]">
            <p className="font-bold text-gray-700 mb-2">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex justify-between gap-4 py-0.5">
                    <span style={{ color: p.color }} className="font-medium">{p.name}</span>
                    <span className="font-bold text-gray-800">{typeof p.value === 'number' ? p.value.toFixed(3) : p.value}</span>
                </div>
            ))}
        </div>
    );
}

// ── Indicador de ordenação nas colunas ───────────────────────────────────────
function SortIcon({ col, sortCol, sortDir }) {
    if (sortCol !== col) return <span className="text-white/30 ml-0.5 text-[9px]">⇅</span>;
    return <span className="ml-0.5 text-[9px]">{sortDir === 'asc' ? '▲' : '▼'}</span>;
}

// ── Componente principal ──────────────────────────────────────────────────────
const MES_NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function CombustivelPage({ ano, setAno, grupo, setGrupo, selectedMonths, setSelectedMonths }) {
    const [metodo, setMetodo] = useState('ponderada'); // afeta apenas ranking + tabela
    const [filtroPostoAb, setFiltroPostoAb] = useState('');
    const [filtroPlacaAb, setFiltroPlacaAb] = useState('');

    // dataPonderada: sempre ponderada → KPIs, Tendência, Consumo por Grupo
    // dataMetodo: método selecionado → Ranking + Tabela Comparativo
    const [dataPonderada, setDataPonderada] = useState(null);
    const [dataMetodo, setDataMetodo] = useState(null);
    const [loadingPonderada, setLoadingPonderada] = useState(true);
    const [loadingMetodo, setLoadingMetodo] = useState(true);

    const [trendMetric, setTrendMetric] = useState('media');
    const [sortCol, setSortCol] = useState('media_anual');
    const [sortDir, setSortDir] = useState('desc');
    const [filterGrupoTabela, setFilterGrupoTabela] = useState('TODOS');

    const toggleMes = (m) => {
        setSelectedMonths(prev =>
            prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
        );
    };

    const handleSort = (col) => {
        if (sortCol === col) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortCol(col);
            setSortDir(col === 'placa' || col === 'grupo' ? 'asc' : 'desc');
        }
    };

    // Fetch sempre ponderada (KPIs, Tendência, Grupos)
    useEffect(() => {
        const fetch_ = async () => {
            setLoadingPonderada(true);
            try {
                let url = `${API}/api/combustivel?year=${ano}&group=${encodeURIComponent(grupo)}&metodo=ponderada`;
                if (selectedMonths.length > 0) url += `&months=${selectedMonths.join(',')}`;
                const r = await fetch(url);
                const j = await r.json();
                setDataPonderada(j.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingPonderada(false);
            }
        };
        fetch_();
    }, [ano, grupo, selectedMonths]);

    // Fetch com método selecionado (Ranking + Tabela)
    useEffect(() => {
        const fetch_ = async () => {
            setLoadingMetodo(true);
            try {
                let url = `${API}/api/combustivel?year=${ano}&group=${encodeURIComponent(grupo)}&metodo=${metodo}`;
                if (selectedMonths.length > 0) url += `&months=${selectedMonths.join(',')}`;
                const r = await fetch(url);
                const j = await r.json();
                setDataMetodo(j.data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoadingMetodo(false);
            }
        };
        fetch_();
    }, [ano, grupo, selectedMonths, metodo]);

    // Percentis p25/p75 POR GRUPO para coloração condicional da tabela
    const grupoPct = useMemo(() => {
        if (!dataMetodo?.tabela_veiculos) return {};
        const grouped = {};
        dataMetodo.tabela_veiculos.forEach(v => {
            const g = v.grupo || 'SEM GRUPO';
            if (!grouped[g]) grouped[g] = [];
            Object.values(v.meses).forEach(val => {
                if (val !== null && val !== undefined) grouped[g].push(val);
            });
        });
        const map = {};
        Object.entries(grouped).forEach(([g, vals]) => {
            const sorted = [...vals].sort((a, b) => a - b);
            map[g] = {
                p25: sorted[Math.floor(sorted.length * 0.25)] ?? 2.0,
                p75: sorted[Math.floor(sorted.length * 0.75)] ?? 2.5,
            };
        });
        return map;
    }, [dataMetodo]);

    // Meses do ano selecionado (a partir do dataMetodo)
    const mesesDoAno = useMemo(() => {
        if (!dataMetodo?.all_months) return [];
        return dataMetodo.all_months.filter(m => m.startsWith(String(ano)));
    }, [dataMetodo, ano]);

    // Tabela filtrada e ordenada
    const tabelaFiltrada = useMemo(() => {
        if (!dataMetodo?.tabela_veiculos) return [];
        let rows = [...dataMetodo.tabela_veiculos];
        if (filterGrupoTabela !== 'TODOS') rows = rows.filter(r => r.grupo === filterGrupoTabela);
        rows.sort((a, b) => {
            if (sortCol === 'placa') {
                return sortDir === 'asc' ? a.placa.localeCompare(b.placa) : b.placa.localeCompare(a.placa);
            }
            if (sortCol === 'grupo') {
                return sortDir === 'asc'
                    ? (a.grupo || '').localeCompare(b.grupo || '')
                    : (b.grupo || '').localeCompare(a.grupo || '');
            }
            if (sortCol === 'total_km') {
                const av = a.total_km ?? 0, bv = b.total_km ?? 0;
                return sortDir === 'asc' ? av - bv : bv - av;
            }
            if (mesesDoAno.includes(sortCol)) {
                const av = a.meses[sortCol] ?? -1, bv = b.meses[sortCol] ?? -1;
                return sortDir === 'asc' ? av - bv : bv - av;
            }
            // media_anual (default)
            const av = a.media_anual ?? -1, bv = b.media_anual ?? -1;
            return sortDir === 'asc' ? av - bv : bv - av;
        });
        return rows;
    }, [dataMetodo, filterGrupoTabela, sortCol, sortDir, mesesDoAno]);

    // Média por mês para linha de referência na tabela (usa dataMetodo para coerência)
    const mediaPorMes = useMemo(() => {
        if (!dataMetodo?.monthly_trend) return {};
        const map = {};
        dataMetodo.monthly_trend.forEach(m => { map[m.mes] = m.media_km_l; });
        return map;
    }, [dataMetodo]);

    if (loadingPonderada && !dataPonderada) return (
        <div className="flex items-center justify-center h-64">
            <div className="text-xl text-[#0b4d3c] animate-pulse font-bold">Carregando dados de combustível...</div>
        </div>
    );

    const { kpis, monthly_trend, por_grupo, anos } = dataPonderada || {};
    const { ranking, postos_ranking, ultimos_abastecimentos, postos_disponiveis, placas_disponiveis } = dataMetodo || {};

    // Dados do gráfico de tendência (sempre ponderada)
    const trendData = (monthly_trend || []).map(m => ({
        mes: fmtMes(m.mes),
        'km/L': m.media_km_l,
        'R$/L': m.custo_litro,
        'Litros (mil)': +(m.litros / 1000).toFixed(1),
        'Custo (R$ mil)': +(m.custo / 1000).toFixed(0),
        var_media: m.var_media,
    }));

    // Dados do gráfico de grupos (sempre ponderada)
    const grupoData = (por_grupo || []).map(g => ({
        grupo: g.grupo.replace('CONTAINER - ', 'CONT. '),
        'km/L': g.media_km_l,
        'Custo (R$ mi)': +(g.custo / 1_000_000).toFixed(2),
        'Litros (mil)': +(g.litros / 1000).toFixed(0),
        fill: GRUPO_CORES[g.grupo] || '#6b7280',
    }));

    const mediaGeral = kpis?.media_km_l;

    return (
        <div className="max-w-[1700px] mx-auto px-1 sm:px-0">

            {/* ── Header de filtros (sem toggle de método) ── */}
            <div className="hidden md:block sticky top-0 z-40 pt-6 pb-4 bg-[#f3f4f6]">
                <div className="bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Fuel size={18} className="text-[#0b4d3c]" />
                    <span className="font-bold text-sm text-gray-700 mr-1 uppercase tracking-wider">Combustível</span>
                    <div className="w-px h-5 bg-gray-200" />

                    <span className="text-xs font-bold text-gray-400 tracking-widest">ANO</span>
                    {[...(anos || [2025, 2026])].sort((a, b) => a - b).map(y => (
                        <button key={y} onClick={() => { setAno(y); setSelectedMonths([]); }}
                            className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${ano === y ? 'bg-[#0b4d3c] text-white border-[#0b4d3c]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                            {y}
                        </button>
                    ))}

                    <div className="w-px h-5 bg-gray-200" />
                    <span className="text-xs font-bold text-gray-400 tracking-widest">MÊS</span>
                    <button
                        onClick={() => setSelectedMonths([])}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${selectedMonths.length === 0 ? 'bg-[#0b4d3c] text-white border-[#0b4d3c]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                        Todos
                    </button>
                    {MES_NOMES.map((nome, idx) => {
                        const m = idx + 1;
                        const ativo = selectedMonths.includes(m);
                        return (
                            <button key={m} onClick={() => toggleMes(m)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${ativo ? 'bg-[#147a61] text-white border-[#147a61]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                                {nome}
                            </button>
                        );
                    })}

                    <div className="w-px h-5 bg-gray-200" />
                    <span className="text-xs font-bold text-gray-400 tracking-widest">GRUPO</span>
                    <select value={grupo} onChange={e => setGrupo(e.target.value)}
                        className="bg-white text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium focus:border-[#0b4d3c] outline-none">
                        <option value="TODOS">Todos os grupos</option>
                        {(dataPonderada?.grupos || []).map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>
            </div>

            {/* ── KPI Cards (sempre ponderada) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
                <KPICard icon={<Droplets size={20} className="text-blue-600" />} iconBg="bg-blue-50"
                    label="Total Abastecido" value={`${fmtNum(kpis?.total_litros ?? 0)} L`}
                    sub={`${fmtNum(kpis?.total_abast ?? 0)} abastecimentos`} trend={null} />
                <KPICard icon={<span className="text-emerald-600 font-bold text-base">R$</span>} iconBg="bg-emerald-50"
                    label="Custo Total" value={fmtBRL(kpis?.total_custo ?? 0)}
                    sub={`Média ${fmtBRL(kpis?.custo_por_litro ?? 0)}/L`} trend={null} />
                <KPICard icon={<Route size={20} className="text-violet-600" />} iconBg="bg-violet-50"
                    label="KM Rodados" value={`${fmtNum(kpis?.total_km ?? 0)} km`}
                    sub={`R$ ${fmtNum(kpis?.custo_por_km ?? 0, 2)}/km`} trend={null} />
                <KPICard icon={<Gauge size={20} className="text-amber-600" />} iconBg="bg-amber-50"
                    label="Média km/L" value={`${fmtNum(kpis?.media_km_l ?? 0, 2)} km/L`}
                    sub="Média ponderada da frota" trend={kpis?.var_media_mom} badge="Ponderada" />
                <KPICard icon={<Fuel size={20} className="text-[#0b4d3c]" />} iconBg="bg-[#e6f4f0]"
                    label="R$/Litro Médio" value={`R$ ${fmtNum(kpis?.custo_por_litro ?? 0, 3)}`}
                    sub={`R$ ${fmtNum(kpis?.custo_por_km ?? 0, 3)}/km`} trend={null} badge="Ponderada" />
            </div>

            {/* ── Gráficos: Tendência + Grupos (sempre ponderada) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-6">

                {/* Tendência mensal */}
                <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Tendência Mensal
                                <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wide normal-case">Ponderada</span>
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">Evolução de consumo e custo por mês</p>
                        </div>
                        <div className="flex gap-1">
                            {[['media', 'km/L'], ['custo', 'R$/L'], ['litros', 'Volume']].map(([k, l]) => (
                                <button key={k} onClick={() => setTrendMetric(k)}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${trendMetric === k ? 'bg-[#0b4d3c] text-white border-[#0b4d3c]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={260}>
                        {trendMetric === 'media' ? (
                            <ComposedChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                                <YAxis yAxisId="left" domain={['auto', 'auto']} tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(2)} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => v.toFixed(2)} />
                                <Tooltip content={<CustomTooltipTrend />} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                <Bar yAxisId="right" dataKey="Litros (mil)" fill="#bfdbfe" radius={[3, 3, 0, 0]} name="Litros (mil)" />
                                <Line yAxisId="left" type="monotone" dataKey="km/L" stroke="#0b4d3c" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                {mediaGeral && <ReferenceLine yAxisId="left" y={mediaGeral} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `Média ${mediaGeral?.toFixed(2)}`, fontSize: 10, fill: '#f59e0b', position: 'insideTopRight' }} />}
                            </ComposedChart>
                        ) : trendMetric === 'custo' ? (
                            <ComposedChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                                <YAxis yAxisId="left" domain={['auto', 'auto']} tick={{ fontSize: 11 }} tickFormatter={v => `R$${v.toFixed(2)}`} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                                <Tooltip content={<CustomTooltipTrend />} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                <Bar yAxisId="right" dataKey="Custo (R$ mil)" fill="#fde68a" radius={[3, 3, 0, 0]} name="Custo (R$ mil)" />
                                <Line yAxisId="left" type="monotone" dataKey="R$/L" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            </ComposedChart>
                        ) : (
                            <ComposedChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip content={<CustomTooltipTrend />} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                <Bar dataKey="Litros (mil)" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                                <Bar dataKey="Custo (R$ mil)" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                            </ComposedChart>
                        )}
                    </ResponsiveContainer>
                </div>

                {/* Por Grupo (sempre ponderada) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="mb-4">
                        <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Consumo por Grupo
                            <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wide normal-case">Ponderada</span>
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">km/L médio e custo total</p>
                    </div>
                    <ResponsiveContainer width="100%" height={130}>
                        <BarChart data={grupoData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                            <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 'auto']} tickFormatter={v => v.toFixed(1)} />
                            <YAxis type="category" dataKey="grupo" tick={{ fontSize: 10 }} width={90} />
                            <Tooltip formatter={(v, n) => [v.toFixed(3), n]} />
                            <Bar dataKey="km/L" fill="#0b4d3c" radius={[0, 4, 4, 0]}>
                                {grupoData.map((entry, i) => (
                                    <rect key={i} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>

                    {/* Tabela resumo por grupo */}
                    <div className="mt-4 space-y-2">
                        {(por_grupo || []).map(g => (
                            <div key={g.grupo} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: GRUPO_CORES[g.grupo] || '#6b7280' }} />
                                    <span className="text-gray-600 truncate max-w-[130px]">{g.grupo}</span>
                                </div>
                                <div className="flex gap-3">
                                    <span className="font-bold text-[#0b4d3c]">{g.media_km_l?.toFixed(2)} km/L</span>
                                    <span className="text-gray-400">{fmtBRL(g.custo)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Toggle Método (afeta apenas ranking + tabela abaixo) ── */}
            <div className="flex flex-wrap items-center gap-2 mb-4 px-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mr-1">Método de Cálculo</span>
                <button
                    onClick={() => setMetodo('ponderada')}
                    className={`px-4 py-1.5 rounded-l-lg text-xs font-semibold border transition-colors ${metodo === 'ponderada' ? 'bg-[#0b4d3c] text-white border-[#0b4d3c]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                    Ponderada
                </button>
                <button
                    onClick={() => setMetodo('tanque_cheio')}
                    className={`px-4 py-1.5 rounded-r-lg text-xs font-semibold border-t border-b border-r transition-colors ${metodo === 'tanque_cheio' ? 'bg-[#0b4d3c] text-white border-[#0b4d3c]' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                    Tanque Cheio
                </button>
                {metodo === 'tanque_cheio' && dataMetodo?.kpis?.cobertura_tc != null && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                        {dataMetodo.kpis.cobertura_tc}% cobertura TC
                    </span>
                )}
                <span className="text-[11px] text-gray-400 ml-1">
                    Afeta: Melhores/Piores Consumidores e Comparativo por Veículo
                </span>
            </div>

            {/* ── Ranking Melhores/Piores ── */}
            {loadingMetodo && !dataMetodo ? (
                <div className="flex items-center justify-center h-24 mb-6">
                    <div className="text-sm text-[#0b4d3c] animate-pulse font-semibold">Carregando ranking...</div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                    {/* Melhores */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Award size={16} className="text-emerald-600" />
                            <h3 className="font-bold text-sm text-gray-800 uppercase tracking-wider">Melhores Consumidores</h3>
                            <span className="text-xs text-gray-400 ml-auto">maior km/L = mais eficiente</span>
                        </div>
                        <div className="space-y-2">
                            {(ranking || []).slice(0, 8).map((r, i) => {
                                const pct = ((r.media_anual - (ranking.at(-1)?.media_anual ?? 0)) / ((ranking[0]?.media_anual ?? 1) - (ranking.at(-1)?.media_anual ?? 0))) * 100;
                                return (
                                    <div key={r.placa} className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-gray-400 w-5 text-right">{i + 1}</span>
                                        <span className="font-mono text-xs font-bold text-gray-700 w-20">{r.placa}</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
                                            <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${Math.max(pct, 5)}%` }} />
                                        </div>
                                        <span className="text-xs font-bold text-emerald-700 w-16 text-right">{r.media_anual?.toFixed(2)} km/L</span>
                                        <span className="text-[10px] text-gray-400 w-20 hidden xl:block">{r.grupo?.slice(0, 12)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Piores */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle size={16} className="text-amber-500" />
                            <h3 className="font-bold text-sm text-gray-800 uppercase tracking-wider">Atenção — Menor Eficiência</h3>
                            <span className="text-xs text-gray-400 ml-auto">menor km/L = pior consumo</span>
                        </div>
                        <div className="space-y-2">
                            {(ranking || []).slice(-8).reverse().map((r, i) => {
                                const pct = ((r.media_anual - (ranking.at(-1)?.media_anual ?? 0)) / ((ranking[0]?.media_anual ?? 1) - (ranking.at(-1)?.media_anual ?? 0))) * 100;
                                return (
                                    <div key={r.placa} className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-gray-400 w-5 text-right">{(ranking || []).length - i}</span>
                                        <span className="font-mono text-xs font-bold text-gray-700 w-20">{r.placa}</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
                                            <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${Math.max(pct, 5)}%` }} />
                                        </div>
                                        <span className="text-xs font-bold text-amber-700 w-16 text-right">{r.media_anual?.toFixed(2)} km/L</span>
                                        <span className="text-[10px] text-gray-400 w-20 hidden xl:block">{r.grupo?.slice(0, 12)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Tabela Comparativo Veículos x Mês ── */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <h3 className="font-bold text-gray-800 uppercase tracking-wider text-sm">
                            Comparativo de Média de Combustível dos Veículos
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            km/L por veículo a cada mês — {ano} · cores relativas ao grupo do veículo
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select value={filterGrupoTabela} onChange={e => setFilterGrupoTabela(e.target.value)}
                            className="bg-white text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium focus:border-[#0b4d3c] outline-none">
                            <option value="TODOS">Todos os grupos</option>
                            {(dataMetodo?.grupos || []).map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        {/* Legenda de cores */}
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200" />Alto
                            <span className="w-3 h-3 rounded bg-sky-50 border border-sky-200 ml-1" />Médio
                            <span className="w-3 h-3 rounded bg-red-50 border border-red-200 ml-1" />Baixo
                        </div>
                    </div>
                </div>

                {loadingMetodo && !dataMetodo ? (
                    <div className="flex items-center justify-center h-24">
                        <div className="text-sm text-[#0b4d3c] animate-pulse font-semibold">Carregando tabela...</div>
                    </div>
                ) : (
                    <div className="overflow-auto rounded-lg border border-gray-100">
                        <table className="w-full text-xs text-left min-w-max">
                            <thead>
                                <tr className="bg-[#0b4d3c] text-white">
                                    <th
                                        onClick={() => handleSort('placa')}
                                        className="px-3 py-2.5 font-bold sticky left-0 bg-[#0b4d3c] min-w-[120px] cursor-pointer select-none hover:bg-[#0d5a48] transition-colors">
                                        Veículo <SortIcon col="placa" sortCol={sortCol} sortDir={sortDir} />
                                    </th>
                                    <th
                                        onClick={() => handleSort('grupo')}
                                        className="px-2 py-2.5 font-semibold text-[10px] text-emerald-200 min-w-[64px] cursor-pointer select-none hover:bg-[#0d5a48] transition-colors">
                                        Grupo <SortIcon col="grupo" sortCol={sortCol} sortDir={sortDir} />
                                    </th>
                                    {mesesDoAno.map(m => (
                                        <th key={m}
                                            onClick={() => handleSort(m)}
                                            className="px-2 py-2.5 font-semibold text-center min-w-[54px] cursor-pointer select-none hover:bg-[#0d5a48] transition-colors">
                                            {fmtMes(m)} <SortIcon col={m} sortCol={sortCol} sortDir={sortDir} />
                                        </th>
                                    ))}
                                    <th
                                        onClick={() => handleSort('media_anual')}
                                        className="px-3 py-2.5 font-bold text-center bg-[#083d2e] min-w-[64px] cursor-pointer select-none hover:bg-[#0a4a37] transition-colors">
                                        Média A. <SortIcon col="media_anual" sortCol={sortCol} sortDir={sortDir} />
                                    </th>
                                    <th
                                        onClick={() => handleSort('total_km')}
                                        className="px-3 py-2.5 font-semibold text-center text-[10px] text-emerald-200 min-w-[80px] cursor-pointer select-none hover:bg-[#0d5a48] transition-colors">
                                        Total KM <SortIcon col="total_km" sortCol={sortCol} sortDir={sortDir} />
                                    </th>
                                </tr>
                                {/* Linha de média da frota */}
                                <tr className="bg-[#e6f4f0] border-b border-gray-200">
                                    <td className="px-3 py-1.5 font-bold text-[#0b4d3c] sticky left-0 bg-[#e6f4f0]">Média Frota</td>
                                    <td className="px-2 py-1.5" />
                                    {mesesDoAno.map(m => (
                                        <td key={m} className="px-2 py-1.5 text-center font-bold text-[#0b4d3c]">
                                            {mediaPorMes[m] ? mediaPorMes[m].toFixed(2) : '—'}
                                        </td>
                                    ))}
                                    <td className="px-3 py-1.5 text-center font-extrabold text-[#0b4d3c] bg-[#d0ece6]">
                                        {dataMetodo?.kpis?.media_km_l?.toFixed(2)}
                                    </td>
                                    <td className="px-3 py-1.5 text-center text-[#0b4d3c]">
                                        {fmtNum(dataMetodo?.kpis?.total_km ?? 0)}
                                    </td>
                                </tr>
                            </thead>
                            <tbody>
                                {tabelaFiltrada.map((veh, idx) => {
                                    const isEven = idx % 2 === 0;
                                    const gPct = grupoPct[veh.grupo || 'SEM GRUPO'] || {};
                                    return (
                                        <tr key={veh.placa} className={isEven ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/60 hover:bg-gray-100/60'}>
                                            <td className={`px-3 py-2 font-mono font-bold text-gray-800 sticky left-0 ${isEven ? 'bg-white' : 'bg-gray-50/60'}`}>
                                                {veh.placa}
                                            </td>
                                            <td className="px-2 py-2">
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: GRUPO_CORES[veh.grupo] + '22', color: GRUPO_CORES[veh.grupo] || '#666' }}>
                                                    {veh.grupo?.replace('CONTAINER - ', 'CT.')}
                                                </span>
                                            </td>
                                            {mesesDoAno.map(m => {
                                                const val = veh.meses[m];
                                                const { bg, text } = mediaColor(val, gPct.p25, gPct.p75);
                                                return (
                                                    <td key={m} className={`px-2 py-2 text-center text-xs ${bg} ${text}`}>
                                                        {val !== null && val !== undefined ? val.toFixed(2) : <span className="text-gray-300">—</span>}
                                                    </td>
                                                );
                                            })}
                                            <td className={`px-3 py-2 text-center font-extrabold text-sm ${mediaColor(veh.media_anual, gPct.p25, gPct.p75).bg} ${mediaColor(veh.media_anual, gPct.p25, gPct.p75).text}`}>
                                                {veh.media_anual !== null ? veh.media_anual.toFixed(2) : '—'}
                                            </td>
                                            <td className="px-3 py-2 text-center text-gray-500">
                                                {fmtNum(veh.total_km)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                <div className="mt-2 text-[10px] text-gray-400 text-right">
                    {tabelaFiltrada.length} veículos · cores relativas ao grupo do veículo · km/L = km rodados ÷ litros abastecidos
                </div>
            </div>

            {/* ── Postos mais baratos / mais caros ── */}
            {postos_ranking && postos_ranking.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                    {/* Mais baratos */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Award size={16} className="text-emerald-600" />
                            <h3 className="font-bold text-sm text-gray-800 uppercase tracking-wider">Postos Mais Baratos</h3>
                            <span className="text-xs text-gray-400 ml-auto">menor R$/L = mais barato</span>
                        </div>
                        <div className="overflow-y-auto max-h-[520px] space-y-2.5 pr-1">
                            {postos_ranking.slice(0, 30).map((p, i) => {
                                const min = postos_ranking[0]?.preco_medio ?? 0;
                                const max = postos_ranking.at(-1)?.preco_medio ?? 1;
                                const pct = max > min ? ((max - p.preco_medio) / (max - min)) * 100 : 100;
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-gray-400 w-4 text-right shrink-0">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-gray-700 truncate">{p.posto}</div>
                                            <div className="text-[10px] text-gray-400">{p.cidade}{p.estado ? ` · ${p.estado}` : ''}</div>
                                        </div>
                                        <div className="w-20 bg-gray-100 rounded-full h-3 overflow-hidden shrink-0">
                                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.max(pct, 5)}%` }} />
                                        </div>
                                        <span className="text-xs font-bold text-emerald-700 w-14 text-right shrink-0">R$ {p.preco_medio.toFixed(4)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Mais caros */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle size={16} className="text-amber-500" />
                            <h3 className="font-bold text-sm text-gray-800 uppercase tracking-wider">Postos Mais Caros</h3>
                            <span className="text-xs text-gray-400 ml-auto">maior R$/L = mais caro</span>
                        </div>
                        <div className="overflow-y-auto max-h-[520px] space-y-2.5 pr-1">
                            {postos_ranking.slice(-30).reverse().map((p, i) => {
                                const min = postos_ranking[0]?.preco_medio ?? 0;
                                const max = postos_ranking.at(-1)?.preco_medio ?? 1;
                                const pct = max > min ? ((p.preco_medio - min) / (max - min)) * 100 : 100;
                                return (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className="text-xs font-bold text-gray-400 w-4 text-right shrink-0">{postos_ranking.length - i}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-bold text-gray-700 truncate">{p.posto}</div>
                                            <div className="text-[10px] text-gray-400">{p.cidade}{p.estado ? ` · ${p.estado}` : ''}</div>
                                        </div>
                                        <div className="w-20 bg-gray-100 rounded-full h-3 overflow-hidden shrink-0">
                                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.max(pct, 5)}%` }} />
                                        </div>
                                        <span className="text-xs font-bold text-amber-700 w-14 text-right shrink-0">R$ {p.preco_medio.toFixed(4)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Últimos Abastecimentos ── */}
            {ultimos_abastecimentos && ultimos_abastecimentos.length > 0 && (() => {
                const termPosto = filtroPostoAb.trim().toUpperCase();
                const termPlaca = filtroPlacaAb.trim().toUpperCase();
                const abFiltrado = ultimos_abastecimentos.filter(a =>
                    (!termPosto || a.posto.toUpperCase().includes(termPosto)) &&
                    (!termPlaca || a.placa.toUpperCase().includes(termPlaca))
                );
                return (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mt-6 mb-8">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div>
                                <h3 className="font-bold text-gray-800 uppercase tracking-wider text-sm">Abastecimentos</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Δ preço = variação em relação ao abastecimento anterior no mesmo posto</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="relative">
                                    <input
                                        type="text"
                                        list="lista-postos"
                                        value={filtroPostoAb}
                                        onChange={e => setFiltroPostoAb(e.target.value)}
                                        placeholder="Filtrar por posto..."
                                        className="bg-white text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium focus:border-[#0b4d3c] outline-none w-[220px]"
                                    />
                                    <datalist id="lista-postos">
                                        {(postos_disponiveis || []).map(p => <option key={p} value={p} />)}
                                    </datalist>
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        list="lista-placas"
                                        value={filtroPlacaAb}
                                        onChange={e => setFiltroPlacaAb(e.target.value)}
                                        placeholder="Filtrar por placa..."
                                        className="bg-white text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium focus:border-[#0b4d3c] outline-none w-[140px]"
                                    />
                                    <datalist id="lista-placas">
                                        {(placas_disponiveis || []).map(p => <option key={p} value={p} />)}
                                    </datalist>
                                </div>
                                <span className="text-xs text-gray-400">{abFiltrado.length} registros</span>
                            </div>
                        </div>
                        <div className="overflow-y-auto max-h-[480px]">
                            <table className="w-full text-xs text-left">
                                <thead className="sticky top-0 z-10">
                                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wide">
                                        <th className="px-3 py-3">Data</th>
                                        <th className="px-3 py-3">Placa</th>
                                        <th className="px-3 py-3">Posto</th>
                                        <th className="px-3 py-3">Cidade</th>
                                        <th className="px-3 py-3">UF</th>
                                        <th className="px-3 py-3 text-right">Litros</th>
                                        <th className="px-3 py-3 text-right">R$/L</th>
                                        <th className="px-3 py-3 text-right">Total</th>
                                        <th className="px-3 py-3 text-center">Δ Preço</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {abFiltrado.map((a, i) => {
                                        const deltaPos = a.delta_preco != null && a.delta_preco > 0;
                                        const deltaNeg = a.delta_preco != null && a.delta_preco < 0;
                                        return (
                                            <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                                                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{a.data}</td>
                                                <td className="px-3 py-2 font-mono font-bold text-gray-700">{a.placa}</td>
                                                <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate" title={a.posto}>{a.posto}</td>
                                                <td className="px-3 py-2 text-gray-500">{a.cidade}</td>
                                                <td className="px-3 py-2 text-gray-500 font-bold">{a.estado}</td>
                                                <td className="px-3 py-2 text-right text-gray-600">{a.litros != null ? fmtNum(a.litros, 2) : '—'}</td>
                                                <td className="px-3 py-2 text-right font-bold text-gray-800">
                                                    {a.preco_litro != null ? `R$ ${a.preco_litro.toFixed(4)}` : '—'}
                                                </td>
                                                <td className="px-3 py-2 text-right font-bold text-gray-800">
                                                    {a.valor_total != null ? fmtBRL(a.valor_total) : '—'}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {a.delta_preco != null ? (
                                                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-bold text-[10px]
                                                            ${deltaPos ? 'bg-red-100 text-red-600' : deltaNeg ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                            {deltaPos ? <TrendingUp size={9} /> : deltaNeg ? <TrendingDown size={9} /> : null}
                                                            {deltaPos ? '+' : ''}{a.delta_preco.toFixed(2)}%
                                                        </span>
                                                    ) : <span className="text-gray-300">—</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
