import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Layout from './components/Layout.jsx'
import Login from './components/Login.jsx'
import Dashboard from './components/Dashboard.jsx'
import ListagemManutencoes from './components/manutencoes/ListagemManutencoes.jsx'
import FormManutencao from './components/manutencoes/FormManutencao.jsx'
import ExtratoManutencao from './components/manutencoes/ExtratoManutencao.jsx'
import ArquivosManutencao from './components/manutencoes/ArquivosManutencao.jsx'
import ListagemVeiculos from './components/veiculos/ListagemVeiculos.jsx'
import HistoricoVeiculo from './components/veiculos/HistoricoVeiculo.jsx'
import ListagemMotoristas from './components/motoristas/ListagemMotoristas.jsx'
import CadastroParteVeiculo from './components/partesveiculo/CadastroParteVeiculo.jsx'
import CadastroTipoServico from './components/tiposservico/CadastroTipoServico.jsx'
import CadastroOficinaPrestador from './components/oficinasprestadores/CadastroOficinaPrestador.jsx'
import CadastroAtivos from './components/ativos/CadastroAtivos.jsx'
import Solicitacoes from './components/solicitacoes/Solicitacoes.jsx'
import Vencimentos from './components/vencimentos/Vencimentos.jsx'
import Estoque from './components/estoque/Estoque.jsx'
import PainelAdmin from './components/admin/PainelAdmin.jsx'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen bg-blue-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="manutencoes" element={<ListagemManutencoes />} />
            <Route path="manutencoes/nova" element={<FormManutencao />} />
            <Route path="manutencoes/:id/editar" element={<FormManutencao />} />
            <Route path="manutencoes/:id/extrato" element={<ExtratoManutencao />} />
            <Route path="manutencoes/:id/arquivos" element={<ArquivosManutencao />} />
            <Route path="veiculos" element={<ListagemVeiculos />} />
            <Route path="veiculos/:id/historico" element={<HistoricoVeiculo />} />
            <Route path="motoristas" element={<ListagemMotoristas />} />
            <Route path="partes-veiculo" element={<CadastroParteVeiculo />} />
            <Route path="tipos-servico" element={<CadastroTipoServico />} />
            <Route path="oficinas-prestadores" element={<CadastroOficinaPrestador />} />
            <Route path="ativos" element={<CadastroAtivos />} />
            <Route path="solicitacoes" element={<Solicitacoes />} />
            <Route path="vencimentos" element={<Vencimentos />} />
            <Route path="estoque" element={<Estoque />} />
            <Route path="admin" element={<PainelAdmin />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
