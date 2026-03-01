import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { getFeriadosMes } from '../utils/feriados';

export default function Calendario({ dailyData = [], previousDailyData = [], mes, ano, selectedDay, setSelectedDay }) {
    // Estados do Calendário
    const [metaDiaria, setMetaDiaria] = useState(150000);
    const [isEditingMeta, setIsEditingMeta] = useState(false);
    const [tempMeta, setTempMeta] = useState(150000);
    const [filtroAtivo, setFiltroAtivo] = useState('Todos'); // 'Bateu Meta', 'Não Bateu Meta', 'Todos'

    // Determine o número de dias no mês
    const currentDate = new Date(ano || new Date().getFullYear(), (mes || new Date().getMonth() + 1) - 1, 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfWeek = currentDate.getDay(); // 0 é Domingo, 1 é Segunda ...

    // Último dia do mês anterior (para validar se o dia existe)
    const prevMonthLastDay = new Date(
        ano || new Date().getFullYear(),
        (mes || new Date().getMonth() + 1) - 1,
        0
    ).getDate();

    // Transforma dailyData em um mapa fácil de consultar pelo dia
    const dailyMap = {};
    dailyData.forEach(d => {
        dailyMap[d.day_int] = d;
    });

    // Feriados do mês
    const feriadosMes = getFeriadosMes(ano || new Date().getFullYear(), mes || (new Date().getMonth() + 1));

    // Mapa do mês anterior
    const prevDailyMap = {};
    previousDailyData.forEach(d => {
        prevDailyMap[d.day_int] = d;
    });

    const handleSalvarMeta = () => {
        setMetaDiaria(Number(tempMeta));
        setIsEditingMeta(false);
    };

    const handleDayClick = (day) => {
        if (!day) return;
        setSelectedDay(prev => prev === day ? null : day);
    };

    // Calcula acumulados para o dia selecionado (equivalente DAX)
    const computeComparativo = () => {
        if (!selectedDay) return null;

        // Dia válido no mês anterior (se mês anterior tem menos dias, usa o último)
        const diaValido = Math.min(selectedDay, prevMonthLastDay);

        // Acumulado mês atual: soma do dia 1 até selectedDay
        let acumuladoAtual = 0;
        for (let d = 1; d <= selectedDay; d++) {
            if (dailyMap[d]) acumuladoAtual += dailyMap[d].receita || 0;
        }

        // Acumulado mês passado: soma do dia 1 até diaValido
        let acumuladoMesPassado = 0;
        for (let d = 1; d <= diaValido; d++) {
            if (prevDailyMap[d]) acumuladoMesPassado += prevDailyMap[d].receita || 0;
        }

        const variacao = acumuladoMesPassado > 0
            ? (acumuladoAtual - acumuladoMesPassado) / acumuladoMesPassado
            : null;

        return { acumuladoAtual, acumuladoMesPassado, variacao };
    };

    const comparativo = computeComparativo();

    const days = [];

    // Preenche espaços vazios antes do 1º dia do mês
    for (let i = 0; i < firstDayOfWeek; i++) {
        days.push({ day: null, val: null, type: 'none' });
    }

    // Preenche os dias reais do mês
    for (let i = 1; i <= lastDay; i++) {
        const dInfo = dailyMap[i];
        let val = null;
        let type = 'none';

        if (dInfo && dInfo.receita > 0) {
            val = dInfo.receita;
            type = val >= metaDiaria ? 'green' : 'red';

            // Aplica os visuais do filtro de botões
            if (filtroAtivo === 'Bateu Meta' && type === 'red') {
                type = 'none';
                val = null;
            }
            if (filtroAtivo === 'Não Bateu Meta' && type === 'green') {
                type = 'none';
                val = null;
            }
        }

        const feriado = feriadosMes[i] || null;
        days.push({ day: i, val: val, type: type, feriado });
    }

    const formatCurrency = (val) => {
        if (!val) return '';
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-full border border-gray-100 relative">

            {/* Header Verde Escuro + botão meta integrado */}
            <div className="bg-[#147a61] text-white shrink-0 flex items-center justify-between px-4 py-2">
                <div className="w-28" />
                <h2 className="text-lg font-bold text-center flex-1">Calendário</h2>
                <div className="w-28 flex justify-end">
                    {isEditingMeta ? (
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-bold text-white/80">R$</span>
                            <input
                                type="number"
                                value={tempMeta}
                                onChange={(e) => setTempMeta(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSalvarMeta()}
                                className="border border-white/40 bg-white/20 text-white placeholder-white/60 rounded px-2 py-0.5 text-xs outline-none focus:border-white w-20"
                                autoFocus
                            />
                            <button onClick={handleSalvarMeta} className="text-white font-bold text-xs hover:text-white/70">OK</button>
                            <button onClick={() => setIsEditingMeta(false)} className="text-white/60 text-xs hover:text-white">✕</button>
                        </div>
                    ) : (
                        <button
                            onClick={() => { setTempMeta(metaDiaria); setIsEditingMeta(true); }}
                            className="text-white/80 hover:text-white flex items-center gap-1.5 text-[11px] font-bold border border-white/30 hover:border-white px-2 py-1 rounded transition whitespace-nowrap"
                        >
                            <Pencil size={11} />
                            META DIÁRIA (R$ {(metaDiaria / 1000).toFixed(0)}k)
                        </button>
                    )}
                </div>
            </div>

            {/* Legenda */}
            <div className="flex items-center gap-4 px-3 pt-2 pb-1">
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-purple-100 border border-purple-300" />
                    <span className="text-[10px] text-gray-400">Feriado nacional</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-[#cce6d9]" />
                    <span className="text-[10px] text-gray-400">Bateu meta</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm bg-[#fad4d4]" />
                    <span className="text-[10px] text-gray-400">Abaixo da meta</span>
                </div>
            </div>
            <div className="mx-3 mt-2 mb-1 shrink-0">
                {selectedDay && comparativo ? (
                    <div className={`rounded-lg px-4 py-3 text-center border ${comparativo.variacao === null
                        ? 'bg-gray-50 border-gray-200'
                        : comparativo.variacao > 0
                            ? 'bg-[#f0f7f4] border-[#a8d5c2]'
                            : comparativo.variacao < 0
                                ? 'bg-red-50 border-red-200'
                                : 'bg-gray-50 border-gray-200'
                        }`}>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            Até o dia <strong>{selectedDay}</strong> do mês passado acumulamos{' '}
                            <strong>{formatCurrency(comparativo.acumuladoMesPassado)}</strong>.
                            {' '}No mesmo período deste mês acumulamos{' '}
                            <strong>{formatCurrency(comparativo.acumuladoAtual)}</strong>.
                        </p>
                        <p className={`text-sm font-bold mt-1 ${comparativo.variacao === null
                            ? 'text-gray-400'
                            : comparativo.variacao > 0
                                ? 'text-[#147a61]'
                                : comparativo.variacao < 0
                                    ? 'text-red-600'
                                    : 'text-gray-500'
                            }`}>
                            {comparativo.variacao === null
                                ? 'Sem dados do mês anterior.'
                                : comparativo.variacao > 0
                                    ? `Aumento de ${(comparativo.variacao * 100).toFixed(1)}% ↑ em relação ao mês anterior.`
                                    : comparativo.variacao < 0
                                        ? `Queda de ${(Math.abs(comparativo.variacao) * 100).toFixed(1)}% ↓ em relação ao mês anterior.`
                                        : 'Sem variação em relação ao mês anterior.'
                            }
                        </p>
                    </div>
                ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-center">
                        <p className="text-sm text-gray-400 font-medium tracking-wide">
                            SELECIONE UM DIA NO CALENDÁRIO
                        </p>
                    </div>
                )}
            </div>

            <div className="p-3 flex-1 flex flex-col justify-center">
                {/* Days of week */}
                <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[#147a61] font-bold text-xs uppercase tracking-wider shrink-0">
                    <div>dom</div>
                    <div>seg</div>
                    <div>ter</div>
                    <div>qua</div>
                    <div>qui</div>
                    <div>sex</div>
                    <div>sáb</div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1 md:gap-2 flex-1 items-stretch">
                    {days.map((d, i) => (
                        <div
                            key={i}
                            onClick={() => handleDayClick(d.day)}
                            className={`p-1 flex flex-col justify-center items-center rounded-md border transition-all
                                ${d.day ? 'cursor-pointer' : 'opacity-0 pointer-events-none'}
                                ${d.day && d.day === selectedDay
                                    ? 'ring-2 ring-[#147a61] ring-offset-1 border-[#147a61]'
                                    : 'border-transparent'
                                }
                                ${d.day ? (
                                    d.type === 'red' ? 'bg-[#fad4d4] border-red-200' :
                                        d.type === 'green' ? 'bg-[#cce6d9] border-green-200' :
                                            d.feriado ? 'bg-purple-50 border-purple-200' : 'bg-gray-50'
                                ) : ''}
                                ${d.day && d.day !== selectedDay ? 'hover:brightness-95' : ''}
                            `}
                        >
                            <div className="text-gray-700 font-bold text-sm mb-0.5">{d.day || ''}</div>
                            {d.feriado && (
                                <div className="text-[8px] text-purple-600 font-semibold leading-tight text-center uppercase tracking-tight mb-0.5">
                                    {d.feriado}
                                </div>
                            )}
                            <div className="text-[10px] md:text-xs text-gray-800 font-medium leading-tight text-center break-all">
                                {d.val ? formatCurrency(d.val) : ''}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Rodapé - Filtros do Calendário */}
            <div className="flex gap-2 p-3 mt-auto justify-center bg-gray-50 border-t border-gray-100 shrink-0">
                <button
                    onClick={() => setFiltroAtivo('Bateu Meta')}
                    className={`px-4 py-1 border rounded text-xs transition ${filtroAtivo === 'Bateu Meta' ? 'bg-gray-800 border-gray-800 text-white shadow' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-100'}`}
                >Bateu Meta</button>
                <button
                    onClick={() => setFiltroAtivo('Não Bateu Meta')}
                    className={`px-4 py-1 border rounded text-xs transition ${filtroAtivo === 'Não Bateu Meta' ? 'bg-gray-800 border-gray-800 text-white shadow' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-100'}`}
                >Não Bateu Meta</button>
                <button
                    onClick={() => setFiltroAtivo('Todos')}
                    className={`px-6 py-1 border rounded text-xs transition ${filtroAtivo === 'Todos' ? 'bg-gray-800 border-gray-800 text-white shadow' : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-100'}`}
                >Todos</button>
            </div>

        </div>
    );
}
