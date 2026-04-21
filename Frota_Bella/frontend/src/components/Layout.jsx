import React, { useState, useEffect, useRef } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import axios from 'axios'
import { useUser, useClerk } from '@clerk/clerk-react'
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
  RefreshCw,
  Bell,
  Moon,
  Sun,
  Store,
  Package,
  DatabaseBackup,
  CheckCircle,
  AlertTriangle,
  Loader2,
  LogOut,
} from 'lucide-react'
import novalogo from '../assets/novalogo.png'
import { API } from '../lib/config'


const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Solicitações', icon: ClipboardList, to: '/solicitacoes' },
  { label: 'Manutenções', icon: Wrench, to: '/manutencoes' },
  { label: 'Vencimentos', icon: Bell, to: '/vencimentos' },
  { type: 'divider', label: 'Cadastros' },
  { label: 'Veículos', icon: Car, to: '/veiculos' },
  { label: 'Motoristas', icon: Users, to: '/motoristas' },
  { label: 'Partes do Veículo', icon: Layers, to: '/partes-veiculo' },
  { label: 'Tipos de Serviço', icon: Cog, to: '/tipos-servico' },
  { label: 'Oficinas / Prestadores', icon: Store, to: '/oficinas-prestadores' },
  { label: 'Ativos / Equipamentos', icon: Package, to: '/ativos' },
]


export default function Layout() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const syncFileRef = useRef()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [vencBadge, setVencBadge] = useState({ vencido: 0, proximo: 0 })
  const [toast, setToast] = useState(null) // { vencido, proximo }
  const [backupState, setBackupState] = useState(null) // null | 'loading' | { ok, msg }
  const [syncState, setSyncState] = useState(null) // null | 'loading' | { ok, msg }
  const location = useLocation()

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])


  // Busca vencimentos para badge e toast
  useEffect(() => {
    axios.get(`${API}/vencimentos`)
      .then(r => {
        const items = r.data || []
        const vencido = items.filter(i => i.status === 'Vencido').length
        const proximo = items.filter(i => i.status === 'Próximo').length
        setVencBadge({ vencido, proximo })
        // Toast apenas uma vez por sessão e só se houver vencidos
        if (vencido > 0 && !sessionStorage.getItem('toast_venc_shown')) {
          setTimeout(() => setToast({ vencido, proximo }), 800)
          sessionStorage.setItem('toast_venc_shown', '1')
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      {/* Backdrop mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-56' : 'w-0'
        } fixed md:relative inset-y-0 left-0 z-40 bg-blue-900 text-white flex-shrink-0 transition-all duration-200 flex flex-col overflow-hidden`}
      >
        {/* Nav */}
        <nav className="flex-1 py-2 overflow-y-auto w-56 min-w-[224px]">
          {navItems.map((item, i) => {
            if (item.type === 'divider') {
              return (
                <div key={i} className="px-4 pt-3 pb-1 text-xs text-blue-400 uppercase tracking-wider border-t border-blue-800 mt-1 whitespace-nowrap">
                  {item.label}
                </div>
              )
            }
            const Icon = item.icon
            const active = location.pathname.startsWith(item.to)
            const isVenc = item.to === '/vencimentos'
            const badgeCount = isVenc ? vencBadge.vencido + vencBadge.proximo : 0
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-700 text-white font-medium'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Icon className="w-4 h-4" />
                  {badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 flex items-center justify-center rounded-full text-[9px] font-bold leading-none"
                      style={{ background: vencBadge.vencido > 0 ? '#ef4444' : '#f97316', color: '#fff' }}>
                      {badgeCount}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
                {active && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer com sync e backup */}
        <div className="px-3 py-3 border-t border-blue-700 space-y-2 w-56 min-w-[224px]">
          {/* Botão Sync KM */}
          <input
            ref={syncFileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              setSyncState('loading')
              try {
                const fd = new FormData()
                fd.append('file', file)
                const r = await axios.post(`${API}/veiculos/sync-km`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
                const msg = `${r.data.atualizados} veículo(s) atualizado(s)`
                const extra = r.data.nao_encontrados?.length ? ` · ${r.data.nao_encontrados.length} não encontrado(s)` : ''
                setSyncState({ ok: true, msg: msg + extra })
              } catch (e) {
                setSyncState({ ok: false, msg: e.response?.data?.detail || 'Erro ao sincronizar' })
              }
              setTimeout(() => setSyncState(null), 6000)
            }}
          />
          <button
            onClick={() => syncFileRef.current?.click()}
            disabled={syncState === 'loading'}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-800 hover:bg-blue-700 text-blue-200 hover:text-white text-xs transition-colors disabled:opacity-60"
          >
            {syncState === 'loading'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
              : syncState?.ok === true
              ? <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
              : syncState?.ok === false
              ? <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              : <RefreshCw className="w-3.5 h-3.5 flex-shrink-0" />}
            <span className="leading-tight">
              {syncState === 'loading' ? 'Sincronizando KM...'
                : syncState?.ok === true ? <span className="text-green-300">{syncState.msg}</span>
                : syncState?.ok === false ? <span className="text-red-300">{syncState.msg}</span>
                : 'Sincronizar KM'}
            </span>
          </button>

          {/* Botão de Backup */}
          <button
            onClick={async () => {
              setBackupState('loading')
              try {
                const r = await axios.post(`${API}/backup`)
                const destinos = r.data.destinos || []
                const local = destinos.find(d => !d.includes('OneDrive')) ? '✓ Local' : ''
                const od = destinos.find(d => d.includes('OneDrive')) ? '✓ OneDrive' : ''
                const aviso = r.data.avisos?.length ? ' (OneDrive indisponível)' : ''
                setBackupState({ ok: true, msg: `${r.data.arquivo} · ${r.data.tamanho_kb} KB\n${[local, od].filter(Boolean).join(' · ')}${aviso}` })
              } catch (e) {
                setBackupState({ ok: false, msg: e.response?.data?.detail || 'Erro ao fazer backup' })
              }
              setTimeout(() => setBackupState(null), 6000)
            }}
            disabled={backupState === 'loading'}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-800 hover:bg-blue-700 text-blue-200 hover:text-white text-xs transition-colors disabled:opacity-60"
          >
            {backupState === 'loading'
              ? <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
              : backupState?.ok === true
              ? <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
              : backupState?.ok === false
              ? <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
              : <DatabaseBackup className="w-3.5 h-3.5 flex-shrink-0" />}
            <span className="leading-tight">
              {backupState === 'loading' ? 'Fazendo backup...'
                : backupState?.ok === true ? <span className="text-green-300 whitespace-pre-wrap">{backupState.msg}</span>
                : backupState?.ok === false ? <span className="text-red-300">{backupState.msg}</span>
                : 'Fazer Backup'}
            </span>
          </button>

          <div className="text-xs text-blue-400">v1.1.0 · by Jimmy Ricardo</div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top navbar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-3 shadow-sm flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
            title="Toggle sidebar"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <img src={novalogo} alt="Logo" className="h-8 object-contain" />
            <span className="hidden sm:inline text-gray-400 text-xs ml-1">| Gestão de Frotas</span>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
            <button
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-gray-500" />}
            </button>
            <span className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 px-2 py-0.5 rounded font-medium">Online</span>

            {/* Usuário logado */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-600">
                {user.imageUrl ? (
                  <img src={user.imageUrl} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                    {(user.firstName?.[0] || user.emailAddresses?.[0]?.emailAddress?.[0] || '?').toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline text-gray-700 dark:text-gray-200 font-medium max-w-[120px] truncate">
                  {user.firstName || user.emailAddresses?.[0]?.emailAddress}
                </span>
                <button
                  onClick={() => signOut()}
                  title="Sair"
                  className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-2 sm:p-4">
          <Outlet />
        </main>
      </div>

      {/* Toast de vencimentos críticos */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-1 animate-slide-up">
          <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded-xl shadow-xl p-4 w-72 sm:w-80 max-w-[calc(100vw-2.5rem)] flex gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <Bell className="w-5 h-5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Atenção — Vencimentos</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {toast.vencido > 0 && <span className="text-red-500 font-medium">{toast.vencido} vencido{toast.vencido > 1 ? 's' : ''}</span>}
                {toast.vencido > 0 && toast.proximo > 0 && ' · '}
                {toast.proximo > 0 && <span className="text-orange-500 font-medium">{toast.proximo} a vencer</span>}
              </p>
              <Link
                to="/vencimentos"
                onClick={() => setToast(null)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
              >
                Ver vencimentos →
              </Link>
            </div>
            <button
              onClick={() => setToast(null)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 self-start"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
