import React, { useState } from 'react';

export default function FaturamentoPlaca({ monthData = [], monthDriverData = [], data = [], dayDriverData = [], selectedDay }) {
    const [tipoFiltro, setTipoFiltro] = useState('placa'); // 'placa' ou 'motorista'

    const isFiltered = (selectedDay && (tipoFiltro === 'placa' ? data.length > 0 : dayDriverData.length > 0));

    // Escolhe os dados baseado no toggle e se há dia selecionado
    let displayData = [];
    if (tipoFiltro === 'placa') {
        displayData = selectedDay ? data : monthData;
    } else {
        displayData = selectedDay ? dayDriverData : monthDriverData;
    }

    const formatCurrency = (val) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const maxValor = displayData.length > 0 ? Math.max(...displayData.map(d => d.valor)) : 0;

    return (
        <div className="bg-white rounded-xl shadow-md p-5 flex flex-col border border-gray-100 mb-auto">
            <div className="flex flex-col gap-4 mb-5">
                <div className="flex items-center justify-between">
                    <h3 className="text-[#0a3d2e] font-black uppercase tracking-tighter text-base">
                        FATURAMENTO PLACA/MOTORISTA
                    </h3>
                    {selectedDay && (
                        <span className="text-[10px] font-bold bg-[#147a61] text-white px-2 py-0.5 rounded-full">
                            DIA {selectedDay}
                        </span>
                    )}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setTipoFiltro('placa')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all border ${tipoFiltro === 'placa'
                            ? 'bg-[#147a61] text-white border-[#147a61] shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        Por Placa
                    </button>
                    <button
                        onClick={() => setTipoFiltro('motorista')}
                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all border ${tipoFiltro === 'motorista'
                            ? 'bg-[#147a61] text-white border-[#147a61] shadow-sm'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        Por Motorista
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 max-h-[500px]">
                {displayData.length > 0 ? (
                    displayData.map((item, idx) => {
                        const label = item.placa || item.motorista;
                        const percent = maxValor > 0 ? (item.valor / maxValor) * 100 : 0;

                        return (
                            <div key={idx} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[11px] font-bold text-gray-700 uppercase">
                                    <span className="w-16 truncate">{label}</span>
                                    <div className="flex-1 mx-3 h-3 bg-gray-100 rounded-full overflow-hidden relative">
                                        <div
                                            className="h-full bg-[#147a61] transition-all duration-500 rounded-full"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                    <span className="text-right tabular-nums whitespace-nowrap min-w-[90px]">
                                        {formatCurrency(item.valor)}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 italic text-sm">
                        <p>Nenhum dado encontrado para este filtro.</p>
                    </div>
                )}
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #ccc;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #147a61;
                }
            `}</style>
        </div>
    );
}

