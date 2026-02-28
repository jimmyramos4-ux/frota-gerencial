import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Recycle, HardHat, DollarSign, BarChart2, Pencil, Check, X } from 'lucide-react';

function fmt(value) {
  if (value == null || isNaN(value)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

function pct(value, total) {
  if (!total || total === 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function diffPct(current, previous) {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/* ── Velocímetro SVG — estilo half-donut limpo ── */
function Speedometer({ progress }) {
  const clamp = Math.min(100, Math.max(0, progress));
  const cx = 60, cy = 58, r = 44, strokeW = 13;

  // Cor dinâmica: vermelho < 70%, laranja 70-99%, verde >= 100%
  const fillColor = clamp >= 100 ? '#10b981' : clamp >= 70 ? '#f97316' : '#ef4444';
  const trackColor = '#e9eaec';

  // Semicírculo como path: left (cx-r, cy) -> top -> right (cx+r, cy)
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  // strokeDasharray para fill parcial: comprimento do semicírculo = π * r
  const arcLen = Math.PI * r;
  const filled = (clamp / 100) * arcLen;

  return (
    <svg viewBox={`0 0 ${cx * 2} ${cy + 4}`} className="w-full" style={{ maxHeight: 72 }}>
      {/* Track (cinza) */}
      <path
        d={d}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeW}
        strokeLinecap="round"
      />
      {/* Arco preenchido */}
      {clamp > 0 && (
        <path
          d={d}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${arcLen - filled + 1}`}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      )}
    </svg>
  );
}

export default function KPICards({ data, metaManual, setMetaManual }) {
  if (!data) return null;

  const { receita = 0, cimento = 0, sucata = 0, receita_anterior = 0 } = data;
  const meta = metaManual || data.meta || 3600000;
  const progressMeta = Math.min(100, (receita / meta) * 100);

  // Cores dinâmicas da Receita Total com base no % de atingimento de meta
  const receitaTheme = progressMeta >= 100
    ? { bg: 'linear-gradient(135deg, #065f46 0%, #059669 100%)', badge: 'bg-emerald-400/20 text-emerald-200', label: 'text-emerald-200', sub: 'text-emerald-300' }
    : progressMeta >= 70
      ? { bg: 'linear-gradient(135deg, #78350f 0%, #d97706 100%)', badge: 'bg-amber-400/20 text-amber-200', label: 'text-amber-200', sub: 'text-amber-300' }
      : { bg: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 100%)', badge: 'bg-red-400/20 text-red-200', label: 'text-red-200', sub: 'text-red-300' };

  const gaugeColor = progressMeta >= 100 ? 'text-emerald-500' : progressMeta >= 70 ? 'text-orange-500' : 'text-red-500';

  const diff = diffPct(receita, receita_anterior);
  const isUp = diff !== null && diff >= 0;

  // Estado local para editar meta dentro do card
  const [editing, setEditing] = useState(false);
  const [tempMeta, setTempMeta] = useState(meta);

  const handleSave = () => {
    const val = Number(tempMeta);
    if (!isNaN(val) && val > 0) setMetaManual(val);
    setEditing(false);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

      {/* ── Card 1: RECEITA TOTAL — cores dinâmicas ── */}
      <div
        className="relative overflow-hidden rounded-2xl px-5 py-4 flex flex-col justify-between shadow-lg"
        style={{ background: receitaTheme.bg, minHeight: '130px' }}
      >
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full opacity-10 bg-white" />
        <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full opacity-10 bg-white" />

        <div className="flex items-center justify-between mb-2">
          <span className={`text-[11px] font-semibold uppercase tracking-widest ${receitaTheme.label}`}>
            Receita Total
          </span>
          <div className="bg-white/15 rounded-full p-1.5">
            <DollarSign size={16} className="text-white" />
          </div>
        </div>

        <span className="text-white font-black text-2xl leading-tight tracking-tight">
          {fmt(receita)}
        </span>

        {/* Barra mini de progresso */}
        <div className="my-2 h-1 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-white/60 rounded-full transition-all" style={{ width: `${Math.min(progressMeta, 100)}%` }} />
        </div>

        {/* Mês anterior + variação */}
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-[9px] uppercase tracking-wider mb-0.5 opacity-60 ${receitaTheme.label}`}>Mês Anterior</p>
            <p className={`text-[13px] font-semibold ${receitaTheme.sub}`}>{fmt(receita_anterior)}</p>
          </div>
          {diff !== null && (
            <span className={`flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full ${receitaTheme.badge}`}>
              {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {Math.abs(diff).toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* ── Card 2: RECEITAS POR SEGMENTO ── */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b border-gray-100">
          <BarChart2 size={14} className="text-gray-400" />
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Receitas por Segmento</span>
        </div>
        <div className="flex flex-1">
          {/* Sucata */}
          <div className="flex-1 px-4 py-3 border-r border-gray-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-semibold text-blue-600 uppercase tracking-wide">Sucata</span>
              <Recycle size={13} className="text-blue-400" />
            </div>
            <span className="text-[15px] font-bold text-gray-800 leading-tight block">{fmt(sucata)}</span>
            <div className="mt-2">
              <span className="text-[9px] text-gray-400">{pct(sucata, receita)}% da receita</span>
              <div className="mt-0.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-blue-400" style={{ width: `${pct(sucata, receita)}%` }} />
              </div>
            </div>
          </div>
          {/* Cimento */}
          <div className="flex-1 px-4 py-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-semibold text-amber-600 uppercase tracking-wide">Cimento</span>
              <HardHat size={13} className="text-amber-400" />
            </div>
            <span className="text-[15px] font-bold text-gray-800 leading-tight block">{fmt(cimento)}</span>
            <div className="mt-2">
              <span className="text-[9px] text-gray-400">{pct(cimento, receita)}% da receita</span>
              <div className="mt-0.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct(cimento, receita)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Card 3: META DO MÊS com velocímetro half-donut ── */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm flex flex-col px-4 py-3 gap-0.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Meta do Mês</span>
          {/* Botão editar meta */}
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={tempMeta}
                onChange={(e) => setTempMeta(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs outline-none focus:border-emerald-500 w-24"
                autoFocus
              />
              <button onClick={handleSave} className="bg-emerald-600 text-white rounded p-0.5 hover:bg-emerald-700 transition">
                <Check size={12} />
              </button>
              <button onClick={() => setEditing(false)} className="bg-gray-100 text-gray-500 rounded p-0.5 hover:bg-gray-200 transition">
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setTempMeta(meta); setEditing(true); }}
              className="flex items-center gap-1 text-gray-400 hover:text-emerald-600 transition text-[10px] font-medium"
              title="Editar meta"
            >
              <Pencil size={11} />
              {fmt(meta)}
            </button>
          )}
        </div>

        {/* Velocímetro half-donut */}
        <div className="relative">
          <Speedometer progress={progressMeta} />
          {/* Percentual centralizado na base do arco */}
          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
            <span className={`text-xl font-black leading-none ${gaugeColor}`}>
              {progressMeta.toFixed(2).replace('.', ',')}%
            </span>
          </div>
        </div>

        {/* Info embaixo */}
        <div className="flex items-center justify-between mt-1">
          <p className="text-[9px] text-gray-400">
            {progressMeta >= 100 ? '✓ Meta atingida!' : `Faltam ${fmt(meta - receita)}`}
          </p>
          <span className={`text-[11px] font-bold ${receita >= meta ? 'text-emerald-600' : 'text-red-500'}`}>
            {fmt(receita - meta)}
          </span>
        </div>
      </div>

    </div>
  );
}
