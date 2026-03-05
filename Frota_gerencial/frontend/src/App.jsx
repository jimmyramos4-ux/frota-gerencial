import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Menu, SlidersHorizontal, ChevronDown } from 'lucide-react';
const API = import.meta.env.VITE_API_BASE || '';
import Sidebar from './components/Sidebar';
import logoTransbottan from './assets/logo-transbottan.png';
import KPICards from './components/KPICards';
import FaturamentoPlaca from './components/FaturamentoPlaca';
import Calendario from './components/Calendario';
import TabelaCimento from './components/TabelaCimento';
import InsightMeta from './components/InsightMeta';
import UltimosCarregamentos from './components/UltimosCarregamentos';
import UltimosCarregamentosCimento from './components/UltimosCarregamentosCimento';
import CombustivelPage from './components/CombustivelPage';
import AnaliticoPage from './components/AnaliticoPage';
function App() {
  const [activePage, setActivePage] = useState('Acompanhamento');
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
  const [filterOpen, setFilterOpen] = useState(false);

  // Filtros da página Combustível (lifted state)
  const [anoComb, setAnoComb] = useState(2025);
  const [grupoComb, setGrupoComb] = useState('TODOS');
  const [selectedMonthsComb, setSelectedMonthsComb] = useState([]);
  const [filterOpenComb, setFilterOpenComb] = useState(false);

  // Filtros da página Analítico (lifted state)
  const [anoAn, setAnoAn] = useState(2026);
  const [mesAn, setMesAn] = useState(0);
  const [filterOpenAn, setFilterOpenAn] = useState(false);
  const mainRef = useRef(null);

  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [activePage]);

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

  // Acumulado por placa/motorista até o dia selecionado
  const cumulativePlacasData = useMemo(() => {
    if (!selectedDay) return [];
    const filtered = (ultimosCarregamentos.sucata || []).filter(r => r.data && parseInt(r.data.split('-')[2]) <= selectedDay);
    const byPlaca = {};
    filtered.forEach(r => { if (r.placa) byPlaca[r.placa] = (byPlaca[r.placa] || 0) + (r.valor || 0); });
    return Object.entries(byPlaca).map(([placa, valor]) => ({ placa, valor })).sort((a, b) => b.valor - a.valor);
  }, [selectedDay, ultimosCarregamentos.sucata]);

  const cumulativeDriverData = useMemo(() => {
    if (!selectedDay) return [];
    const filtered = (ultimosCarregamentos.sucata || []).filter(r => r.data && parseInt(r.data.split('-')[2]) <= selectedDay);
    const byDriver = {};
    filtered.forEach(r => { if (r.motorista) byDriver[r.motorista] = (byDriver[r.motorista] || 0) + (r.valor || 0); });
    return Object.entries(byDriver).map(([motorista, valor]) => ({ motorista, valor })).sort((a, b) => b.valor - a.valor);
  }, [selectedDay, ultimosCarregamentos.sucata]);

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

      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        mobileOpen={sidebarOpen}
        setMobileOpen={setSidebarOpen}
      />

      {/* Topbar mobile (visível apenas em telas < md) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-[25] flex flex-col"
        style={{ background: 'linear-gradient(90deg, #0a3d2e, #0b4d3c)' }}>
        {/* Linha verde com logo e hamburguer */}
        <div className="h-14 flex items-center px-4 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white/70 hover:text-white transition-colors p-1"
          >
            <Menu size={22} />
          </button>
          <img src={logoTransbottan} alt="Transbottan" className="h-7 object-contain brightness-0 invert" />
        </div>

        {/* Barra de filtros compacta — Combustível */}
        {activePage === 'Combustível' && (
          <div className="bg-white">
            <div className="flex items-center justify-between px-4 h-11 border-b border-gray-100">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-[#0b4d3c]">{anoComb}</span>
                <span className="text-gray-300">·</span>
                <span className="text-gray-500 text-xs">
                  {selectedMonthsComb.length === 0 ? 'Anual' : `${selectedMonthsComb.length} mês(es)`}
                </span>
                {grupoComb !== 'TODOS' && <><span className="text-gray-300">·</span><span className="text-gray-500 text-xs truncate max-w-[80px]">{grupoComb}</span></>}
              </div>
              <button
                onClick={() => setFilterOpenComb(v => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#0b4d3c] border border-emerald-200 rounded-lg px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 transition-colors"
              >
                <SlidersHorizontal size={13} />
                Filtros
                <ChevronDown size={13} className={`transition-transform ${filterOpenComb ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {filterOpenComb && (
              <div className="px-4 py-3 bg-white shadow-lg border-b border-gray-100 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 tracking-widest">ANO</span>
                  {[2024, 2025, 2026].map(y => (
                    <button key={y} onClick={() => { setAnoComb(y); setSelectedMonthsComb([]); }}
                      className={`px-3 py-1 rounded-full text-sm font-semibold border transition-colors ${anoComb === y ? 'bg-[#0b4d3c] text-white border-[#0b4d3c]' : 'bg-white text-gray-500 border-gray-200'}`}>
                      {y}
                    </button>
                  ))}
                  <span className="text-xs font-bold text-gray-400 tracking-widest ml-2">MÊS</span>
                  <button onClick={() => setSelectedMonthsComb([])}
                    className={`px-2.5 py-1 rounded-full text-sm font-semibold border transition-colors ${selectedMonthsComb.length === 0 ? 'bg-[#0b4d3c] text-white border-[#0b4d3c]' : 'bg-white text-gray-500 border-gray-200'}`}>
                    Todos
                  </button>
                  {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, idx) => (
                    <button key={m} onClick={() => setSelectedMonthsComb(prev => prev.includes(idx+1) ? prev.filter(x=>x!==idx+1) : [...prev, idx+1])}
                      className={`px-2.5 py-1 rounded-full text-sm font-semibold border transition-colors ${selectedMonthsComb.includes(idx+1) ? 'bg-[#147a61] text-white border-[#147a61]' : 'bg-white text-gray-500 border-gray-200'}`}>
                      {m}
                    </button>
                  ))}
                </div>
                <select className="bg-white text-gray-600 p-2 rounded-lg border border-gray-200 text-sm"
                  value={grupoComb} onChange={(e) => { setGrupoComb(e.target.value); setFilterOpenComb(false); }}>
                  <option value="TODOS">Todos os grupos</option>
                  {grupos.map((g, idx) => <option key={idx} value={g}>{g}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Barra de filtros compacta — Analítico */}
        {activePage === 'Analítico' && (
          <div className="bg-white">
            <div className="flex items-center justify-between px-4 h-11 border-b border-gray-100">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-blue-700">{anoAn}</span>
                <span className="text-gray-300">·</span>
                <span className="text-gray-500 text-xs">
                  {mesAn === 0 ? 'Anual' : ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][mesAn-1]}
                </span>
              </div>
              <button
                onClick={() => setFilterOpenAn(v => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <SlidersHorizontal size={13} />
                Filtros
                <ChevronDown size={13} className={`transition-transform ${filterOpenAn ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {filterOpenAn && (
              <div className="px-4 py-3 bg-white shadow-lg border-b border-gray-100 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 tracking-widest">ANO</span>
                  {[2024, 2025, 2026].map(y => (
                    <button key={y} onClick={() => { setAnoAn(y); setMesAn(0); }}
                      className={`px-3 py-1 rounded-full text-sm font-semibold border transition-colors ${anoAn === y ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}>
                      {y}
                    </button>
                  ))}
                  <span className="text-xs font-bold text-gray-400 tracking-widest ml-2">MÊS</span>
                  <button onClick={() => { setMesAn(0); setFilterOpenAn(false); }}
                    className={`px-2.5 py-1 rounded-full text-sm font-semibold border transition-colors ${mesAn === 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}>
                    Anual
                  </button>
                  {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, idx) => (
                    <button key={m} onClick={() => { setMesAn(idx+1); setFilterOpenAn(false); }}
                      className={`px-2.5 py-1 rounded-full text-sm font-semibold border transition-colors ${mesAn === idx+1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Barra de filtros compacta — colada ao topbar (Acompanhamento) */}
        {activePage === 'Acompanhamento' && (
          <div className="bg-white">
            <div className="flex items-center justify-between px-4 h-11 border-b border-gray-100">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-blue-600">{['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][mes-1]} {ano}</span>
                <span className="text-gray-300">·</span>
                <span className="text-gray-500 text-xs truncate max-w-[130px]">
                  {fleetType === 'TODOS' ? 'Todas as frotas' : fleetType === 'FROTA PROPRIA' ? 'Frota Própria' : 'Terceiros'}
                  {grupo !== 'TODOS' ? ` · ${grupo}` : ''}
                </span>
              </div>
              <button
                onClick={() => setFilterOpen(v => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <SlidersHorizontal size={13} />
                Filtros
                <ChevronDown size={13} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {/* Painel expandido */}
            {filterOpen && (
              <div className="px-4 py-3 bg-white shadow-lg border-b border-gray-100 flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 tracking-widest">ANO</span>
                  {[2024, 2025, 2026].map(y => (
                    <button key={y} onClick={() => setAno(y)}
                      className={`px-3 py-1 rounded-full text-sm font-semibold border transition-colors ${ano === y ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}>
                      {y}
                    </button>
                  ))}
                  <span className="text-xs font-bold text-gray-400 tracking-widest ml-2">MÊS</span>
                  {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, idx) => (
                    <button key={m} onClick={() => { setMes(idx + 1); setFilterOpen(false); }}
                      className={`px-2.5 py-1 rounded-full text-sm font-semibold border transition-colors ${mes === idx+1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200'}`}>
                      {m}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 flex-wrap">
                  <select className="bg-white text-gray-600 p-2 rounded-lg border border-gray-200 text-sm flex-1"
                    value={fleetType} onChange={(e) => { setFleetType(e.target.value); setFilterOpen(false); }}>
                    <option value="TODOS">Todas as frotas</option>
                    <option value="FROTA PROPRIA">Frota Própria</option>
                    <option value="TERCEIRO">Terceiros</option>
                  </select>
                  <select className="bg-white text-gray-600 p-2 rounded-lg border border-gray-200 text-sm flex-1"
                    value={grupo} onChange={(e) => { setGrupo(e.target.value); setFilterOpen(false); }}>
                    <option value="TODOS">Grupo: Todos</option>
                    {grupos.map((g, idx) => <option key={idx} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main ref={mainRef} className={`flex-1 ml-0 md:ml-56 px-3 sm:px-6 pb-6 overflow-y-auto w-full transition-all md:pt-0 ${['Acompanhamento','Combustível','Analítico'].includes(activePage) ? 'pt-[100px]' : 'pt-14'}`}>

        {/* Página de Combustível */}
        {activePage === 'Combustível' && (
          <CombustivelPage
            ano={anoComb} setAno={setAnoComb}
            grupo={grupoComb} setGrupo={setGrupoComb}
            selectedMonths={selectedMonthsComb} setSelectedMonths={setSelectedMonthsComb}
          />
        )}

        {/* Página Analítico */}
        {activePage === 'Analítico' && (
          <AnaliticoPage
            ano={anoAn} setAno={setAnoAn}
            mes={mesAn} setMes={setMesAn}
          />
        )}

        {/* Páginas em construção */}
        {['Custos', 'Gobrax', 'Pneus', 'Almoxarifado'].includes(activePage) && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-300">{activePage}</p>
              <p className="text-sm mt-2">Página em construção</p>
            </div>
          </div>
        )}

        {/* Dashboard Principal */}
        {activePage === 'Acompanhamento' && (<>
          <div className="hidden md:block sticky top-0 z-50 pt-6 pb-6 bg-[#f3f4f6]">

            {/* Painel completo — só aparece no desktop */}
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
                    onClick={() => { setMes(idx + 1); setFilterOpen(false); }}
                    className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors border ${mes === (idx + 1)
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Dropdowns Row (Fleet, Group) */}
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  className="bg-white text-gray-600 p-2 rounded-lg outline-none cursor-pointer border border-gray-200 text-sm font-medium focus:border-blue-500 transition-colors shadow-sm"
                  value={fleetType}
                  onChange={(e) => { setFleetType(e.target.value); setFilterOpen(false); }}
                >
                  <option value="TODOS">Tipo de Frota: Todas</option>
                  <option value="FROTA PROPRIA">Frota Própria</option>
                  <option value="TERCEIRO">Terceiros</option>
                </select>

                <select
                  className="bg-white text-gray-600 p-2 rounded-lg outline-none cursor-pointer border border-gray-200 text-sm font-medium focus:border-blue-500 transition-colors shadow-sm"
                  value={grupo}
                  onChange={(e) => { setGrupo(e.target.value); setFilterOpen(false); }}
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
                        data={cumulativePlacasData}
                        dayDriverData={cumulativeDriverData}
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
                  <UltimosCarregamentos data={ultimosCarregamentos.sucata || []} title="ÚLTIMOS CARREGAMENTOS SUCATA" showFilter={true} selectedDay={selectedDay} />
                </div>
                <div className="w-full">
                  <UltimosCarregamentosCimento data={ultimosCarregamentos.cimento || []} selectedDay={selectedDay} />
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
