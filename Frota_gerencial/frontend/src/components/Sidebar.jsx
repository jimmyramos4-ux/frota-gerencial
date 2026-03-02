import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileText, Fuel, RefreshCw, Clock, Gauge, Package, CircleDot, DollarSign } from 'lucide-react';
import logoTransbottan from '../assets/logo-transbottan.png';
const API = import.meta.env.VITE_API_BASE || '';

export default function Sidebar({ activePage, setActivePage }) {
    const active = activePage || 'Acompanhamento';
    const setActive = setActivePage || (() => { });
    const [lastUpdate, setLastUpdate] = useState(null);
    const [lastFile, setLastFile] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const menuItems = [
        { name: 'Acompanhamento', icon: <LayoutDashboard size={17} /> },
        { name: 'Analítico', icon: <FileText size={17} /> },
        { name: 'Combustível', icon: <Fuel size={17} /> },
        { name: 'Custos', icon: <DollarSign size={17} /> },
        { name: 'Gobrax', icon: <Gauge size={17} /> },
        { name: 'Pneus', icon: <CircleDot size={17} /> },
        { name: 'Almoxarifado', icon: <Package size={17} /> },
    ];

    const fetchLastUpdate = async () => {
        setRefreshing(true);
        try {
            const response = await fetch(`${API}/api/last-update`);
            const result = await response.json();
            if (result.status === 'ok' && result.last_update) {
                setLastUpdate(new Date(result.last_update));
                setLastFile(result.last_file);
            }
        } catch (error) {
            console.error("Erro ao buscar data de atualização:", error);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchLastUpdate();
    }, []);

    const fmtDate = (dt) => dt ? dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
    const fmtTime = (dt) => dt ? dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';

    // Calcula dias desde atualização
    const daysSince = lastUpdate ? Math.floor((Date.now() - lastUpdate.getTime()) / 86400000) : null;
    const freshnessColor = daysSince === null ? 'text-gray-400' : daysSince === 0 ? 'text-emerald-400' : daysSince <= 2 ? 'text-amber-400' : 'text-red-400';

    return (
        <aside className="w-56 h-screen flex flex-col fixed left-0 top-0 z-10 overflow-hidden"
            style={{ background: 'linear-gradient(180deg, #0a3d2e 0%, #0b4d3c 50%, #0a3d2e 100%)' }}>

            {/* Logo Area */}
            <div className="relative px-4 pt-5 pb-4">
                {/* Decorative accent line */}
                <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-emerald-400/60 to-transparent" />

                {/* Logo image */}
                <div className="bg-white rounded-xl px-3 py-2 flex items-center justify-center shadow-md">
                    <img
                        src={logoTransbottan}
                        alt="Transbottan"
                        className="w-full h-auto object-contain"
                        style={{ maxHeight: '52px' }}
                    />
                </div>

                <span className="block text-emerald-400/60 text-[10px] font-medium tracking-widest uppercase text-center mt-2">
                    Frota Gerencial
                </span>

                {/* Subtle divider */}
                <div className="mt-3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-2 overflow-y-auto">
                <p className="text-emerald-400/40 text-[9px] font-bold uppercase tracking-widest px-3 mb-2">Menu</p>
                <ul className="space-y-0.5">
                    {menuItems.map((item) => {
                        const isActive = active === item.name;
                        return (
                            <li key={item.name}>
                                <button
                                    onClick={() => setActive(item.name)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 text-sm font-medium group relative ${isActive
                                        ? 'bg-white/10 text-white shadow-sm'
                                        : 'text-white/50 hover:text-white/90 hover:bg-white/5'
                                        }`}
                                >
                                    {isActive && (
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-400 rounded-full" />
                                    )}
                                    <span className={`shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'text-white/40 group-hover:text-white/70'}`}>
                                        {item.icon}
                                    </span>
                                    <span className="truncate">{item.name}</span>
                                    {isActive && (
                                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Bottom divider */}
            <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-3" />

            {/* Data Update Card */}
            <div className="mx-3 mb-4 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {/* Card Header */}
                <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
                    <div className="flex items-center gap-1.5">
                        <Clock size={11} className="text-emerald-400/80" />
                        <span className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">Dados DRE</span>
                    </div>
                    <button
                        onClick={fetchLastUpdate}
                        disabled={refreshing}
                        className="text-white/30 hover:text-emerald-400 transition-colors"
                        title="Atualizar"
                    >
                        <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                </div>

                {/* Divider */}
                <div className="h-px mx-3 bg-white/5 mb-2" />

                {/* Date info */}
                <div className="px-3 pb-3">
                    {lastUpdate ? (
                        <>
                            <div className="flex items-baseline gap-1.5 mb-0.5">
                                <span className={`text-[11px] font-bold tabular-nums ${freshnessColor}`}>
                                    {fmtDate(lastUpdate)}
                                </span>
                                <span className="text-white/30 text-[10px]">{fmtTime(lastUpdate)}</span>
                            </div>
                            {daysSince !== null && (
                                <p className={`text-[9px] font-medium ${freshnessColor}`}>
                                    {daysSince === 0 ? '✓ Atualizado hoje' : `${daysSince}d atrás`}
                                </p>
                            )}
                            {lastFile && (
                                <p className="text-[8.5px] text-white/20 mt-1 truncate" title={lastFile}>
                                    {lastFile.length > 22 ? lastFile.substring(0, 20) + '…' : lastFile}
                                </p>
                            )}
                        </>
                    ) : (
                        <div className="flex items-center gap-1.5 py-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-400/40 animate-pulse" />
                            <span className="text-white/30 text-[10px]">Carregando...</span>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}
