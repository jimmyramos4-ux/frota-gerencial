import { useState } from 'react';

export default function UltimosCarregamentos({ data = [], title = "ÚLTIMOS CARREGAMENTOS", showFilter = false, selectedDay = null }) {
    const [filterMotorista, setFilterMotorista] = useState('');

    const fmt = (val) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const fmtData = (str) => {
        if (!str) return '-';
        const [y, m, d] = str.split('-');
        return `${d}/${m}/${y}`;
    };

    const produtoCor = (produto) => {
        const p = produto?.toUpperCase() || '';
        if (p.includes('CIMENTO')) return 'bg-blue-100 text-blue-700';
        if (p.includes('SUCATA')) return 'bg-orange-100 text-orange-700';
        return 'bg-gray-100 text-gray-600';
    };

    const dayFiltered = selectedDay
        ? data.filter(r => r.data && parseInt(r.data.split('-')[2]) <= selectedDay)
        : data;

    const filteredData = (showFilter && filterMotorista.trim())
        ? dayFiltered.filter(r => r.motorista?.toLowerCase().includes(filterMotorista.toLowerCase()))
        : dayFiltered;

    return (
        <div className="bg-white rounded-xl shadow-md p-4 flex flex-col">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="text-gray-800 font-extrabold uppercase tracking-widest text-sm flex items-center gap-2">
                    {title}
                    {selectedDay && (
                        <span className="text-[10px] font-bold bg-[#147a61] text-white px-2 py-0.5 rounded-full normal-case tracking-normal">
                            Até dia {selectedDay}
                        </span>
                    )}
                </h3>
                <div className="flex items-center gap-3">
                    {showFilter && (
                        <input
                            type="text"
                            placeholder="Filtrar motorista..."
                            value={filterMotorista}
                            onChange={e => setFilterMotorista(e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b4d3c]/30 w-52"
                        />
                    )}
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {filteredData.length} registros
                    </span>
                </div>
            </div>

            {filteredData.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-6">Nenhum carregamento encontrado.</div>
            ) : (
                <div className="overflow-auto max-h-[440px] rounded-md border border-gray-100">
                    <table className="w-full text-sm text-left text-gray-700 min-w-max">
                        <thead className="text-xs text-white uppercase bg-[#0b4d3c] sticky top-0 z-10">
                            <tr>
                                <th className="px-3 py-2">DATA</th>
                                <th className="px-3 py-2">MOTORISTA</th>
                                <th className="px-3 py-2">PLACA</th>
                                <th className="px-3 py-2">PRODUTO</th>
                                <th className="px-3 py-2">CLIENTE</th>
                                <th className="px-3 py-2">ORIGEM</th>
                                <th className="px-3 py-2">DESTINO</th>
                                <th className="px-3 py-2 text-right">VALOR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((row, idx) => (
                                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-3 py-2 whitespace-nowrap font-medium">{fmtData(row.data)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">{row.motorista}</td>
                                    <td className="px-3 py-2 font-mono text-xs font-bold whitespace-nowrap">{row.placa}</td>
                                    <td className="px-3 py-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${produtoCor(row.produto)}`}>
                                            {row.produto}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">{row.cliente}</td>
                                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{row.origem}</td>
                                    <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{row.destino}</td>
                                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{fmt(row.valor)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
