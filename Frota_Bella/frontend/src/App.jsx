import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './components/Dashboard.jsx'
import ListagemManutencoes from './components/manutencoes/ListagemManutencoes.jsx'
import FormManutencao from './components/manutencoes/FormManutencao.jsx'
import ExtratoManutencao from './components/manutencoes/ExtratoManutencao.jsx'
import ArquivosManutencao from './components/manutencoes/ArquivosManutencao.jsx'
import ListagemVeiculos from './components/veiculos/ListagemVeiculos.jsx'
import ListagemMotoristas from './components/motoristas/ListagemMotoristas.jsx'
import CadastroParteVeiculo from './components/partesveiculo/CadastroParteVeiculo.jsx'
import CadastroTipoServico from './components/tiposservico/CadastroTipoServico.jsx'
import CadastroOficinaPrestador from './components/oficinasprestadores/CadastroOficinaPrestador.jsx'
import Solicitacoes from './components/solicitacoes/Solicitacoes.jsx'
import Vencimentos from './components/vencimentos/Vencimentos.jsx'
import { Cog } from 'lucide-react'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="manutencoes" element={<ListagemManutencoes />} />
          <Route path="manutencoes/nova" element={<FormManutencao />} />
          <Route path="manutencoes/:id/editar" element={<FormManutencao />} />
          <Route path="manutencoes/:id/extrato" element={<ExtratoManutencao />} />
          <Route path="manutencoes/:id/arquivos" element={<ArquivosManutencao />} />
          <Route path="veiculos" element={<ListagemVeiculos />} />
          <Route path="motoristas" element={<ListagemMotoristas />} />
          <Route path="partes-veiculo" element={<CadastroParteVeiculo />} />
          <Route path="tipos-servico" element={<CadastroTipoServico />} />
          <Route path="oficinas-prestadores" element={<CadastroOficinaPrestador />} />
          <Route path="solicitacoes" element={<Solicitacoes />} />
          <Route path="vencimentos" element={<Vencimentos />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
