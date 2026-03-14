import React, { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Wrench,
  Car,
  Users,
  Menu,
  X,
  ChevronRight,
  Cog,
  Layers,
  ClipboardList,
} from 'lucide-react'
import novalogo from '../assets/novalogo.png'

const navItems = [
  { label: 'Status da Frota', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Solicitações', icon: ClipboardList, to: '/solicitacoes' },
  { label: 'Manutenções', icon: Wrench, to: '/manutencoes' },
  { type: 'divider', label: 'Cadastros' },
  { label: 'Veículos', icon: Car, to: '/veiculos' },
  { label: 'Motoristas', icon: Users, to: '/motoristas' },
  { label: 'Partes do Veículo', icon: Layers, to: '/partes-veiculo' },
  { label: 'Tipos de Serviço', icon: Cog, to: '/tipos-servico' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'
        } bg-blue-900 text-white flex-shrink-0 transition-all duration-200 flex flex-col`}
      >
        {/* Brand */}
        <div className="flex items-center justify-center px-4 py-3 bg-blue-800 border-b border-blue-700">
          <img src={novalogo} alt="Logo" className="h-10 object-contain" />
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {navItems.map((item, i) => {
            if (item.type === 'divider') {
              return (
                <div key={i} className="px-4 pt-3 pb-1 text-xs text-blue-400 uppercase tracking-wider border-t border-blue-800 mt-1">
                  {item.label}
                </div>
              )
            }
            const Icon = item.icon
            const active = location.pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-blue-700 text-white font-medium'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
                {active && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-3 text-xs text-blue-400 border-t border-blue-700">
          v1.0.0
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navbar */}
        <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 shadow-sm flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-800 transition-colors"
            title="Toggle sidebar"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <img src={novalogo} alt="Logo" className="h-8 object-contain" />
            <span className="text-gray-400 text-xs ml-1">| Gestão de Frotas</span>
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">Online</span>
            <span>Sistema de Manutenção</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
