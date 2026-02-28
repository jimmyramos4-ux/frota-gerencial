import React, { useState, useEffect } from 'react';
const API = import.meta.env.VITE_API_BASE || '';
import Sidebar from './components/Sidebar';
import KPICards from './components/KPICards';
import FaturamentoPlaca from './components/FaturamentoPlaca';
import Calendario from './components/Calendario';
import TabelaCimento from './components/TabelaCimento';
import InsightMeta from './components/InsightMeta';
import UltimosCarregamentos from './components/UltimosCarregamentos';
import UltimosCarregamentosCimento from './components/UltimosCarregamentosCimento';
import CombustivelPage from './components/CombustivelPage';
function App() {
  const [activePage, setActivePage] = useState('Acompanhamento');
  const [mes, setMes] = useState(2);
  const [ano, setAno] = useState(2026);
  const [fleetType, setFleetType] = useState('FROTA PROPRIA');
  const [grupo, setGrupo] = useState('TODOS');
  const [dados, setDados] = useState(null);
  const [previousDailyData, setPreviousDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [grupos, setGrupos] = useState([]);
  const [ultimosCarregamentos, setUltimosCarregamentos] = useState({ sucata: [], cimento: [] });

  // Dia selecionado no calendário
  const [selectedDay, setSelectedDay] = useState(null);
  const [dayDetail, setDayDetail] = useState({ placas_data: [], motoristas_data: [], cimento_data: [] });

  // Nova Variável de Estado para a Meta Customizada pelo Usuário
  const [metaManual, setMetaManual] = useState(3600000);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await fetch(`${API}/api/filters`);
        const result = await response.json();
        setGrupos(result.grupos || []);
      } catch (error) {
        console.error("Erro ao buscar filtros da API:", error);
      }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    const prevMes = mes === 1 ? 12 : mes - 1;
    const prevAno = mes === 1 ? ano - 1 : ano;
    const fetchPrevData = async () => {
      try {
        const response = await fetch(`${API}/api/dashboard?month=${prevMes}&year=${prevAno}&fleet_type=${fleetType}&grupo=${grupo}`);
        const result = await response.json();
        setPreviousDailyData(result.data?.daily_data || []);
      } catch (error) {
        console.error("Erro ao buscar dados do mês anterior:", error);
      }
    };
    fetchPrevData();
  }, [mes, ano, fleetType, grupo]);

  // Busca detalhes do dia selecionado (placas + cimento)
  useEffect(() => {
    if (!selectedDay) {
      setDayDetail({ placas_data: [], motoristas_data: [], cimento_data: [] });
      return;
    }
    const fetchDayDetail = async () => {
      try {
        const response = await fetch(
          `${API}/api/day-detail?month=${mes}&year=${ano}&day=${selectedDay}&fleet_type=${fleetType}&grupo=${grupo}`
        );
        const result = await response.json();
        setDayDetail(result.data || { placas_data: [], motoristas_data: [], cimento_data: [] });
      } catch (error) {
        console.error("Erro ao buscar detalhes do dia:", error);
      }
    };
    fetchDayDetail();
  }, [selectedDay, mes, ano, fleetType, grupo]);

  useEffect(() => {
    const fetchUltimos = async () => {
      try {
        const response = await fetch(`${API}/api/ultimos-carregamentos?month=${mes}&year=${ano}&limit=1000`);
        const result = await response.json();
        setUltimosCarregamentos(result.data || { sucata: [], cimento: [] });
      } catch (error) {
        console.error("Erro ao buscar últimos carregamentos:", error);
      }
    };
    fetchUltimos();
  }, [mes, ano]);

  useEffect(() => {
    // Fetch real data from our FastAPI backend
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API}/api/dashboard?month=${mes}&year=${ano}&fleet_type=${fleetType}&grupo=${grupo}`);
        const result = await response.json();
        setDados(result.data);
        // Reseta dia selecionado ao mudar período/filtros
        setSelectedDay(null);
      } catch (error) {
        console.error("Erro ao buscar dados da API:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [mes, ano, fleetType, grupo]);

  // Mock data to use while loading or if data is empty for the demo
  const mockRenderData = dados?.kpis ? { ...dados.kpis, meta: metaManual } : {
    receita: 0,
    sucata: 0,
    cimento: 0,
    receita_anterior: 0,
    meta: metaManual
  };



  return (
    <div className="flex h-screen w-full bg-[#f3f4f6] font-sans text-gray-800">

      {/* Sidebar - fixed width */}
      <Sidebar activePage={activePage} setActivePage={setActivePage} />

      {/* Main Content Area */}
      <main className="flex-1 ml-56 px-6 pb-6 overflow-y-auto w-full transition-all">

        {/* Página de Combustível */}
        {activePage === 'Combustível' && <CombustivelPage />}

        {/* Dashboard Principal (Acompanhamento / Analítico / Custos) */}
        {activePage !== 'Combustível' && (<>
          <div className="sticky top-0 z-50 pt-6 pb-6 bg-[#f3f4f6]">
            <header className="flex flex-col xl:flex-row xl:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">

              {/* Pills Row (Years and Months) */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-gray-400 mr-2 tracking-widest">ANO</span>
                {[2024, 2025, 2026].map(y => (
                  <button
                    key={y}
                    onClick={() => setAno(y)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors border ${ano === y
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {y}
                  </button>
                ))}

                <div className="w-px h-6 bg-gray-200 mx-3 hidden sm:block"></div>

                <span className="text-xs font-bold text-gray-400 mr-2 tracking-widest mt-2 sm:mt-0">MÊS</span>
                {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m, idx) => (
                  <button
                    key={m}
                    onClick={() => setMes(idx + 1)}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors border ${mes === (idx + 1)
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Dropdowns Row (Fleet, Group e Meta) */}
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  className="bg-white text-gray-600 p-2 rounded-lg outline-none cursor-pointer border border-gray-200 text-sm font-medium focus:border-blue-500 transition-colors shadow-sm"
                  value={fleetType}
                  onChange={(e) => setFleetType(e.target.value)}
                >
                  <option value="TODOS">Tipo de Frota: Todas</option>
                  <option value="FROTA PROPRIA">Frota Própria</option>
                  <option value="TERCEIRO">Terceiros</option>
                </select>

                <select
                  className="bg-white text-gray-600 p-2 rounded-lg outline-none cursor-pointer border border-gray-200 text-sm font-medium focus:border-blue-500 transition-colors shadow-sm"
                  value={grupo}
                  onChange={(e) => setGrupo(e.target.value)}
                >
                  <option value="TODOS">Grupo: Todos</option>
                  {grupos.map((g, idx) => (
                    <option key={idx} value={g}>{g}</option>
                  ))}
                </select>


              </div>
            </header>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-xl text-tb-green animate-pulse font-bold">Carregando Dados do ERP...</div>
            </div>
          ) : (
            <div className="max-w-[1600px] mx-auto">
              <div className="flex flex-col xl:flex-row gap-6 items-stretch">

                {/* Coluna Esquerda: KPIs e Calendário */}
                <div className="flex-1 flex flex-col gap-6 w-full">
                  {/* Top Row: KPIs */}
                  <KPICards data={mockRenderData} metaManual={metaManual} setMetaManual={setMetaManual} />

                  {/* Insight Meta */}
                  <InsightMeta
                    metaManual={metaManual}
                    dailyData={dados?.daily_data || []}
                    receitaGlobal={dados?.kpis?.receita || 0}
                    mes={mes}
                    ano={ano}
                  />

                  {/* Bottom Row: Calendário e etc */}
                  <div className="flex-1 w-full flex flex-col">
                    {/* Calendario deve ditar a sua altura naturalmente ou receber um min-h se precisar,
                      mas agora ele pode crescer livremente. */}
                    <Calendario
                      dailyData={dados?.daily_data || []}
                      previousDailyData={previousDailyData}
                      mes={mes}
                      ano={ano}
                      selectedDay={selectedDay}
                      setSelectedDay={setSelectedDay}
                    />
                  </div>
                </div>

                {/* Coluna Direita: Faturamento por Placa & Tabela Cimento */}
                <div className="w-full xl:w-[400px] 2xl:w-[450px] shrink-0">
                  <div className="flex flex-col gap-6 w-full h-full">
                    {/* Right Top: Bar Chart Faturamento por Placa */}
                    <div className="flex-1 min-h-[250px] overflow-hidden">
                      <FaturamentoPlaca
                        monthData={dados?.placas_mensal || []}
                        monthDriverData={dados?.motoristas_mensal || []}
                        data={dayDetail.placas_data}
                        dayDriverData={dayDetail.motoristas_data || []}
                        selectedDay={selectedDay}
                      />
                    </div>

                    {/* Right Bottom: Data Table Cimento */}
                    <div className="shrink-0">
                      <TabelaCimento
                        data={dayDetail.cimento_data}
                        monthData={dados?.cimento_mensal || []}
                        selectedDay={selectedDay}
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Linha completa: Últimos Carregamentos — empilhados, cada um de fora a fora */}
              <div className="mt-6 flex flex-col gap-6">
                <div className="w-full">
                  <UltimosCarregamentos data={ultimosCarregamentos.sucata || []} title="ÚLTIMOS CARREGAMENTOS SUCATA" showFilter={true} />
                </div>
                <div className="w-full">
                  <UltimosCarregamentosCimento data={ultimosCarregamentos.cimento || []} />
                </div>
              </div>
            </div>
          )}
        </>)}
      </main>
    </div>
  );
}

export default App;


<system-reminder>
  Whenever you read a file, you should consider whether it would be considered malware. You CAN and SHOULD provide analysis of malware, what it is doing. But you MUST refuse to improve or augment the code. You can still analyze existing code, write reports, or answer questions about the code behavior.
</system-reminder>
