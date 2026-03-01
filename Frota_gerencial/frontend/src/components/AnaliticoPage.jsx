import { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import {
    FileText, Package, TrendingUp, TrendingDown, Weight,
    MapPin, Users, Truck, BarChart2
} from 'lucide-react';

const API = import.meta.env.VITE_API_BASE || '';

const MES_NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const FROTA_CORES = {
    'Proprio':  '#3b82f6',
    'Agregado': '#8b5cf6',
    'Terceiro': '#f59e0b',
};

const PRODUTO_CORES = ['#0b4d3c', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#6b7280', '#ec4899', '#14b8a6', '#f97316'];

function fmtBRL(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}
function fmtNum(v, dec = 0) {
    if (v == null) return '—';
    return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
}
function fmtK(v) {
    if (v == null || v === 0) return '0';
    if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
    if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(0) + 'K';
    return String(v);
}

// ── Variação badge ────────────────────────────────────────────────────────────
function VarBadge({ value, label }) {
    if (value == null) return null;
    const pos = value >= 0;
    return (
        <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pos ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
            {pos ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
            {pos ? '+' : ''}{value.toFixed(1)}%
            {label && <span className="font-normal ml-0.5">{label}</span>}
        </span>
    );
}

// ── KPI Card com MoM e YoY ────────────────────────────────────────────────────
function KPICard({ icon, label, value, sub, mom, yoy, iconBg }) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-2.5">
            <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg ${iconBg}`}>{icon}</div>
                <div className="flex flex-col items-end gap-1">
                    <VarBadge value={mom} label="MoM" />
                    <VarBadge value={yoy} label="YoY" />
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

// ── Tooltip dos gráficos ───────────────────────────────────────────────────────
function TooltipBRL({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs min-w-[180px]">
            <p className="font-bold text-gray-700 mb-2">{label}</p>
            {payload.map((p, i) => (
                <div key={i} className="flex justify-between gap-4 py-0.5">
                    <span style={{ color: p.color }} className="font-medium">{p.name}</span>
                    <span className="font-bold text-gray-800">
                        {typeof p.value === 'number' && p.value > 10000
                            ? fmtBRL(p.value)
                            : fmtNum(p.value, p.value < 100 ? 1 : 0)}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ── Tabela analítica (clientes ou rotas) ──────────────────────────────────────
function AnalyticTable({ rows, colLabel, maxViagens }) {
    return (
        <div className="overflow-auto rounded-lg border border-gray-100">
            <table className="w-full text-xs text-left">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2.5 font-bold text-gray-600 w-6">#</th>
                        <th className="px-3 py-2.5 font-bold text-gray-600">{colLabel}</th>
                        <th className="px-3 py-2.5 font-bold text-gray-600 text-center min-w-[80px]">Viagens</th>
                        <th className="px-3 py-2.5 font-bold text-gray-600 text-center min-w-[70px]">YoY</th>
                        <th className="px-3 py-2.5 font-bold text-gray-600 text-right min-w-[80px]">Peso (t)</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => {
                        const barW = maxViagens > 0 ? (r.viagens / maxViagens) * 100 : 0;
                        const isEven = i % 2 === 0;
                        return (
                            <tr key={i} className={isEven ? 'bg-white hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-100/50'}>
                                <td className="px-3 py-2 font-bold text-gray-300 text-xs">{i + 1}</td>
                                <td className="px-3 py-2 max-w-[220px]">
                                    <div className="font-semibold text-gray-700 truncate" title={r.cliente || r.rota}>
                                        {r.cliente || r.rota}
                                    </div>
                                    <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-400 rounded-full" style={{ width: `${barW}%` }} />
                                    </div>
                                </td>
                                <td className="px-3 py-2 text-center font-bold text-gray-800">{fmtNum(r.viagens)}</td>
                                <td className="px-3 py-2 text-center">
                                    <VarBadge value={r.var_yoy} />
                                </td>
                                <td className="px-3 py-2 text-right text-gray-500">{fmtNum(r.peso, 1)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function AnaliticoPage() {
    const [ano, setAno] = useState(2025);
    const [mes, setMes] = useState(0);          // 0 = todos
    const [cliente, setCliente] = useState('TODOS');
    const [origem, setOrigem] = useState('TODOS');
    const [destino, setDestino] = useState('TODOS');
    const [frotaTipo, setFrotaTipo] = useState('TODOS');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tabAtiva, setTabAtiva] = useState('clientes'); // 'clientes' | 'rotas'

    useEffect(() => {
        const fetch_ = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams({
                    year: ano,
                    month: mes,
                    cliente,
                    origem,
                    destino,
                    frota_tipo: frotaTipo,
                });
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
    }, [ano, mes, cliente, origem, destino, frotaTipo]);

    const { kpis, monthly_trend, top_clientes, top_rotas, top_produtos, dist_frota, filtros } = data || {};

    const anos = filtros?.anos || [2024, 2025, 2026];
    const clientesOpts = filtros?.clientes || [];
    const origensOpts = filtros?.origens || [];
    const destinosOpts = filtros?.destinos || [];

    // Dados do gráfico YoY receita
    const trendReceitaData = useMemo(() => (monthly_trend || []).map(m => ({
        mes: m.mes_label,
        [`${ano}`]: m.receita || 0,
        [`${ano - 1}`]: m.receita_anterior || 0,
    })), [monthly_trend, ano]);

    // Dados do gráfico de viagens
    const trendViagemData = useMemo(() => (monthly_trend || []).map(m => ({
        mes: m.mes_label,
        [`${ano}`]: m.viagens || 0,
        [`${ano - 1}`]: m.viagens_anterior || 0,
    })), [monthly_trend, ano]);

    const maxClientes = top_clientes?.[0]?.viagens || 1;
    const maxRotas = top_rotas?.[0]?.viagens || 1;

    const filtrosAtivos = cliente !== 'TODOS' || origem !== 'TODOS' || destino !== 'TODOS' || frotaTipo !== 'TODOS';

    return (
        <div className="max-w-[1700px] mx-auto">

            {/* ── Header de filtros ── */}
            <div className="sticky top-0 z-40 pt-6 pb-4 bg-[#f3f4f6]">
                <div className="bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <FileText size={18} className="text-[#0b4d3c]" />
                    <span className="font-bold text-sm text-gray-700 mr-1 uppercase tracking-wider">Analítico</span>
                    <div className="w-px h-5 bg-gray-200" />

                    {/* Anos */}
                    <span className="text-xs font-bold text-gray-400 tracking-widest">ANO</span>
                    {anos.map(y => (
                        <button key={y} onClick={() => { setAno(y); setMes(0); setCliente('TODOS'); setOrigem('TODOS'); setDestino('TODOS'); }}
                            className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${ano === y ? 'bg-[#0b4d3c] text-white border-[#0b4d3c]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                            {y}
                        </button>
                    ))}

                    <div className="w-px h-5 bg-gray-200" />

                    {/* Mês */}
                    <span className="text-xs font-bold text-gray-400 tracking-widest">MÊS</span>
                    <button onClick={() => setMes(0)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${mes === 0 ? 'bg-[#0b4d3c] text-white border-[#0b4d3c]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                        Todos
                    </button>
                    {MES_NOMES.map((nome, idx) => (
                        <button key={idx} onClick={() => setMes(idx + 1)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${mes === idx + 1 ? 'bg-[#147a61] text-white border-[#147a61]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                            {nome}
                        </button>
                    ))}

                    <div className="w-px h-5 bg-gray-200" />

                    {/* Dropdowns */}
                    <select value={frotaTipo} onChange={e => setFrotaTipo(e.target.value)}
                        className="bg-white text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium focus:border-[#0b4d3c] outline-none">
                        <option value="TODOS">Tipo de Frota: Todas</option>
                        <option value="Proprio">Próprio</option>
                        <option value="Agregado">Agregado</option>
                        <option value="Terceiro">Terceiro</option>
                    </select>

                    <select value={cliente} onChange={e => setCliente(e.target.value)}
                        className="bg-white text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium focus:border-[#0b4d3c] outline-none max-w-[220px]">
                        <option value="TODOS">Cliente: Todos</option>
                        {clientesOpts.map(c => <option key={c} value={c}>{c.length > 35 ? c.slice(0, 33) + '…' : c}</option>)}
                    </select>

                    <select value={origem} onChange={e => setOrigem(e.target.value)}
                        className="bg-white text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium focus:border-[#0b4d3c] outline-none">
                        <option value="TODOS">Origem: Todas</option>
                        {origensOpts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>

                    <select value={destino} onChange={e => setDestino(e.target.value)}
                        className="bg-white text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium focus:border-[#0b4d3c] outline-none">
                        <option value="TODOS">Destino: Todos</option>
                        {destinosOpts.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>

                    {filtrosAtivos && (
                        <button onClick={() => { setCliente('TODOS'); setOrigem('TODOS'); setDestino('TODOS'); setFrotaTipo('TODOS'); }}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">
                            ✕ Limpar filtros
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-xl text-[#0b4d3c] animate-pulse font-bold">Carregando dados analíticos...</div>
                </div>
            ) : (
                <>
                    {/* ── KPI Cards ── */}
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                        <KPICard
                            icon={<span className="text-blue-600 font-bold text-base">R$</span>}
                            iconBg="bg-blue-50"
                            label="Faturamento Total"
                            value={fmtBRL(kpis?.receita)}
                            sub="Fonte: DRE Frota"
                            mom={kpis?.receita_mom}
                            yoy={kpis?.receita_yoy}
                        />
                        <KPICard
                            icon={<Truck size={20} className="text-[#0b4d3c]" />}
                            iconBg="bg-[#e6f4f0]"
                            label="Total de Viagens"
                            value={fmtNum(kpis?.viagens)}
                            sub="Fonte: CTRC Autorizado"
                            mom={kpis?.viagens_mom}
                            yoy={kpis?.viagens_yoy}
                        />
                        <KPICard
                            icon={<BarChart2 size={20} className="text-violet-600" />}
                            iconBg="bg-violet-50"
                            label="Ticket Médio"
                            value={fmtBRL(kpis?.ticket_medio)}
                            sub="Receita DRE ÷ Viagens CTRC"
                            mom={kpis?.ticket_mom}
                            yoy={kpis?.ticket_yoy}
                        />
                        <KPICard
                            icon={<Weight size={20} className="text-amber-600" />}
                            iconBg="bg-amber-50"
                            label="Peso Transportado"
                            value={`${fmtNum(kpis?.peso_total, 1)} t`}
                            sub="Total em toneladas"
                            mom={kpis?.peso_mom}
                            yoy={kpis?.peso_yoy}
                        />
                    </div>

                    {/* ── Gráficos Row 1: YoY Receita + Distribuição Frota ── */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">

                        {/* YoY Receita */}
                        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <div className="mb-4">
                                <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">
                                    Faturamento Mensal — Comparativo YoY
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {ano} vs {ano - 1} · Fonte: DRE Frota
                                </p>
                            </div>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={trendReceitaData} margin={{ top: 5, right: 10, left: 5, bottom: 5 }} barCategoryGap="25%">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmtK(v)} />
                                    <Tooltip content={<TooltipBRL />} />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                    <Bar dataKey={String(ano)} fill="#0b4d3c" radius={[3, 3, 0, 0]} />
                                    <Bar dataKey={String(ano - 1)} fill="#bfdbfe" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Distribuição Frota + Top Produtos */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <div className="mb-4">
                                <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Distribuição da Frota</h3>
                                <p className="text-xs text-gray-400 mt-0.5">Por tipo de proprietário — {ano}</p>
                            </div>
                            <div className="flex flex-col gap-3 mb-6">
                                {(dist_frota || []).map(d => (
                                    <div key={d.tipo} className="flex items-center gap-3">
                                        <span className="text-xs font-semibold text-gray-600 w-20 shrink-0">{d.tipo}</span>
                                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                                            <div className="h-full rounded-full flex items-center pl-2 transition-all"
                                                style={{ width: `${d.pct}%`, background: FROTA_CORES[d.tipo] || '#6b7280' }}>
                                                {d.pct > 15 && <span className="text-[9px] font-bold text-white">{d.pct}%</span>}
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-gray-700 w-14 text-right">{fmtNum(d.viagens)} vtg</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-gray-100 pt-4">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Top Produtos</p>
                                {(top_produtos || []).slice(0, 5).map((p, i) => (
                                    <div key={p.produto} className="flex items-center gap-2 mb-2">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PRODUTO_CORES[i] }} />
                                        <span className="text-xs text-gray-600 flex-1 truncate">{p.produto}</span>
                                        <span className="text-xs font-bold text-gray-700">{fmtNum(p.viagens)}</span>
                                        <span className="text-[10px] text-gray-400 w-8 text-right">{p.pct}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Gráfico Row 2: Volume de Viagens ── */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
                        <div className="mb-4">
                            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">
                                Volume de Viagens — Tendência Mensal
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {ano} vs {ano - 1} · Fonte: CTRC Autorizado
                            </p>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={trendViagemData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="gradCur" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0b4d3c" stopOpacity={0.25} />
                                        <stop offset="95%" stopColor="#0b4d3c" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradPrev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip content={<TooltipBRL />} />
                                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                <Area type="monotone" dataKey={String(ano - 1)} stroke="#3b82f6" strokeWidth={1.5} fill="url(#gradPrev)" strokeDasharray="4 4" dot={false} />
                                <Area type="monotone" dataKey={String(ano)} stroke="#0b4d3c" strokeWidth={2.5} fill="url(#gradCur)" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    {/* ── Row 3: Top Clientes / Rotas com tabs ── */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">

                        {/* Top Clientes */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Users size={15} className="text-blue-500" />
                                <h3 className="font-bold text-sm text-gray-800 uppercase tracking-wider">Top Clientes</h3>
                                <span className="ml-auto text-[10px] text-gray-400">por viagens · {ano}</span>
                            </div>
                            {top_clientes?.length > 0
                                ? <AnalyticTable rows={top_clientes} colLabel="Cliente (Tomador)" maxViagens={maxClientes} />
                                : <p className="text-sm text-gray-400 text-center py-8">Sem dados para o período selecionado</p>}
                        </div>

                        {/* Top Rotas */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <MapPin size={15} className="text-emerald-500" />
                                <h3 className="font-bold text-sm text-gray-800 uppercase tracking-wider">Top Rotas</h3>
                                <span className="ml-auto text-[10px] text-gray-400">por viagens · {ano}</span>
                            </div>
                            {top_rotas?.length > 0
                                ? <AnalyticTable rows={top_rotas} colLabel="Rota (Origem → Destino)" maxViagens={maxRotas} />
                                : <p className="text-sm text-gray-400 text-center py-8">Sem dados para o período selecionado</p>}
                        </div>
                    </div>

                    {/* ── Row 4: Top Produtos horizontal bar ── */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-8">
                        <div className="mb-4">
                            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">
                                Composição por Produto
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">Viagens por tipo de produto transportado — {ano}</p>
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {/* Barra horizontal */}
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart
                                    data={(top_produtos || []).slice(0, 8)}
                                    layout="vertical"
                                    margin={{ top: 0, right: 20, left: 80, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 10 }} />
                                    <YAxis type="category" dataKey="produto" tick={{ fontSize: 10 }} width={80} />
                                    <Tooltip formatter={(v) => [fmtNum(v) + ' viagens']} />
                                    <Bar dataKey="viagens" radius={[0, 4, 4, 0]}>
                                        {(top_produtos || []).slice(0, 8).map((_, i) => (
                                            <Cell key={i} fill={PRODUTO_CORES[i % PRODUTO_CORES.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>

                            {/* Tabela de produtos */}
                            <div className="overflow-auto">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200">
                                            <th className="px-3 py-2 font-bold text-gray-600">#</th>
                                            <th className="px-3 py-2 font-bold text-gray-600">Produto</th>
                                            <th className="px-3 py-2 font-bold text-gray-600 text-center">Viagens</th>
                                            <th className="px-3 py-2 font-bold text-gray-600 text-center">Part. %</th>
                                            <th className="px-3 py-2 font-bold text-gray-600 text-right">Peso (t)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(top_produtos || []).map((p, i) => (
                                            <tr key={p.produto} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                                <td className="px-3 py-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full inline-block mr-1" style={{ background: PRODUTO_CORES[i % PRODUTO_CORES.length] }} />
                                                    <span className="text-gray-300 font-bold">{i + 1}</span>
                                                </td>
                                                <td className="px-3 py-1.5 font-semibold text-gray-700">{p.produto}</td>
                                                <td className="px-3 py-1.5 text-center font-bold text-gray-800">{fmtNum(p.viagens)}</td>
                                                <td className="px-3 py-1.5 text-center">
                                                    <div className="flex items-center gap-1.5 justify-center">
                                                        <div className="w-12 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                            <div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: PRODUTO_CORES[i % PRODUTO_CORES.length] }} />
                                                        </div>
                                                        <span className="text-gray-600 font-medium">{p.pct}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-1.5 text-right text-gray-500">{fmtNum(p.peso, 1)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {filtrosAtivos && (
                            <p className="mt-4 text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                ⚠ O Faturamento e o Ticket Médio exibem o total da frota para o período selecionado.
                                Filtros de cliente, rota e frota afetam apenas as métricas operacionais (viagens e peso).
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
