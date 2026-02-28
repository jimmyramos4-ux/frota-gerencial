import React from 'react';

export default function TabelaCimento({ data = [], monthData = [], selectedDay }) {
    const rows = (selectedDay && data.length > 0) ? data : monthData;
    const isFiltered = selectedDay && data.length > 0;
    const semDados = selectedDay && data.length === 0;

    const totalViagens = rows.reduce((s, r) => s + r.viagens, 0);
    const totalFaturamento = rows.reduce((s, r) => s + r.faturamento, 0);


    const fmt = (val) =>
        new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(val);

    return (
        <div className="bg-white rounded-xl shadow-md p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-800 font-extrabold uppercase tracking-widest text-sm">
                    CARREGAMENTO CIMENTO
                </h3>
                {isFiltered && (
                    <span className="text-[10px] font-bold bg-[#147a61] text-white px-2 py-0.5 rounded-full">
                        DIA {selectedDay}
                    </span>
                )}
                {semDados && (
                    <span className="text-[10px] font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                        SEM DADOS
                    </span>
                )}
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-700">
                    <thead className="text-xs text-white uppercase bg-[#0b4d3c]">
                        <tr>
                            <th className="px-4 py-2 rounded-tl-md">MOTORISTAS</th>
                            <th className="px-4 py-2 text-right">VIAGENS</th>
                            <th className="px-4 py-2 text-right rounded-tr-md">FATURAMENTO</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                                <td className="px-4 py-2 font-medium">{row.motorista}</td>
                                <td className="px-4 py-2 text-right">{row.viagens}</td>
                                <td className="px-4 py-2 text-right">{fmt(row.faturamento)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="font-bold text-white bg-[#147a61]">
                            <td className="px-4 py-2 rounded-bl-md">Total</td>
                            <td className="px-4 py-2 text-right">{totalViagens}</td>
                            <td className="px-4 py-2 text-right rounded-br-md">{fmt(totalFaturamento)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
