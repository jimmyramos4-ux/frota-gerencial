import { useState } from 'react';

const PLANILHA_COR = {
    DSO:         'bg-blue-100 text-blue-700',
    CIMENSHOP:   'bg-purple-100 text-purple-700',
    FOB:         'bg-green-100 text-green-700',
    INTERCEMENT: 'bg-orange-100 text-orange-700',
};

export default function UltimosCarregamentosCimento({ data = [] }) {
    const [filterMotorista, setFilterMotorista] = useState('');

    const fmtData = (str) => {
        if (!str) return '-';
        const [y, m, d] = str.split('-');
        return `${d}/${m}/${y}`;
    };

    const fmtPeso = (val) =>
        val > 0
            ? new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(val) + ' t'
            : '-';

    const planilhaCor = (p) =>
        PLANILHA_COR[(p || '').toUpperCase()] || 'bg-gray-100 text-gray-600';

    const isValidDestino = (d) => d && d !== 'nan' && d !== 'NaN' && d.trim() !== '';

    const fmtEntr = (val) => {
        if (!val || val === '-') return '-';
        const n = parseFloat(val);
        return isNaN(n) ? '-' : String(Math.round(n));
    };

    const baseData = data.filter(r => isValidDestino(r.destino));

    const filteredData = filterMotorista.trim()
        ? baseData.filter(r => r.motorista?.toLowerCase().includes(filterMotorista.toLowerCase()))
        : baseData;

    return (
        <div className="bg-white rounded-xl shadow-md p-4 flex flex-col">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h3 className="text-gray-800 font-extrabold uppercase tracking-widest text-sm">
                    ÚLTIMOS CARREGAMENTOS CIMENTO
                </h3>
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="Filtrar motorista..."
                        value={filterMotorista}
                        onChange={e => setFilterMotorista(e.target.value)}
                        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0b4d3c]/30 w-52"
                    />
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
                                <th className="px-3 py-2 text-right">PESO CARREG.</th>
                                <th className="px-3 py-2">DESTINO</th>
                                <th className="px-3 py-2">ENTR.</th>
                                <th className="px-3 py-2">PLANILHA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((row, idx) => (
                                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-3 py-2 whitespace-nowrap font-medium">{fmtData(row.data)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">{row.motorista}</td>
                                    <td className="px-3 py-2 font-mono text-xs font-bold whitespace-nowrap">{row.placa}</td>
                                    <td className="px-3 py-2 text-right whitespace-nowrap font-semibold">{fmtPeso(row.peso)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">{row.destino}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-gray-500 text-xs">{fmtEntr(row.entr)}</td>
                                    <td className="px-3 py-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${planilhaCor(row.planilha)}`}>
                                            {row.planilha || '-'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
