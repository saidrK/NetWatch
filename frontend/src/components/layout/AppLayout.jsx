import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  ScrollArea,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  Heart,
  LayoutDashboard,
  Server,
  AlertTriangle,
  BrainCircuit,
  FileBarChart,
  LogOut,
  User,
  MonitorCheck,
  Users
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { alertesAPI, equipementsAPI } from '@/services/api'

const NAV_SECTIONS = [
  {
    label: 'Navigation',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, extra: 'LIVE' },
      { to: '/inventaire', label: 'Inventaire', icon: Server, extra: 'NODES' },
      { to: '/alertes', label: 'Alertes', icon: AlertTriangle, extra: 'ALERTS' },
      { to: '/anomalies', label: 'Anomalies IA', icon: BrainCircuit, extra: 'ACTIVE' },
      { to: '/rapports', label: 'Rapports', icon: FileBarChart, extra: 'POSTGRES' },
      { to: '/utilisateurs', label: 'Utilisateurs', icon: Users, extra: 'RBAC', adminOnly: true },
      { to: '/profil', label: 'Mon Profil', icon: User, extra: 'CLÉ' },
    ],
  },
]

export default function AppLayout() {
  const [opened, { toggle }] = useDisclosure()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout, isAdmin } = useAuth()
  const [alertCount, setAlertCount] = useState(0)
  const [equipmentCount, setEquipmentCount] = useState(0)

  // Real-time visual online effect
  const connected = true
  const isScanning = false

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  useEffect(() => {
    const fetchAlertCount = async () => {
      try {
        const { data } = await alertesAPI.lister()
        const nonAcquittees = data.filter((a) => !a.acquittee).length
        setAlertCount(nonAcquittees)
      } catch (error) {
        console.error('Erreur chargement compteur alertes:', error)
      }
    }

    const fetchEquipmentCount = async () => {
      try {
        const { data } = await equipementsAPI.lister()
        setEquipmentCount(Array.isArray(data) ? data.length : 0)
      } catch (error) {
        console.error('Erreur chargement compteur équipements:', error)
      }
    }

    fetchAlertCount()
    fetchEquipmentCount()
    const interval = setInterval(() => {
      fetchAlertCount()
      fetchEquipmentCount()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const isActive = (path) => {
    if (path === '/dashboard' && (pathname === '/dashboard' || pathname === '/')) return true;
    return pathname.startsWith(path)
  }

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{
        width: 256, // 64 * 4 for standard Tailwind sizing w-64
        breakpoint: 'md',
        collapsed: { mobile: !opened },
      }}
      padding="0" // We handle padding in Main
      styles={{
        main: {
          backgroundColor: '#050505',
          color: '#E0E0E0',
          fontFamily: '"JetBrains Mono", ui-sans-serif, system-ui, sans-serif',
        },
        navbar: {
          backgroundColor: '#0D0D0D',
          borderRight: '1px solid #222222',
        },
        header: {
          backgroundColor: '#0D0D0D',
          borderBottom: '1px solid #222222',
        },
      }}
      className="font-mono"
    >
      <AppShell.Header className="flex justify-between items-center px-4 md:px-6 select-none border-none">
        <Group gap="sm" className="h-full">
          <Burger
            opened={opened}
            onClick={toggle}
            hiddenFrom="md"
            size="sm"
            color="#00FFD1"
            className="border border-[#222] p-1 bg-[#050505]"
          />
          <div className="flex items-center gap-2 md:gap-3">
            <Heart className="w-5 h-5 text-[#00FFD1] fill-[#00FFD1]/10 animate-pulse" />
            <h1 className="text-sm md:text-[15px] font-bold text-white tracking-[0.25em] uppercase flex items-center gap-1 m-0">
              MISSION_CONTROL<span className="text-[#00FFD1] text-xs">_v1.0.4</span>
            </h1>
            {connected ? (
              <span className="hidden sm:inline-block border border-[#00FFD1]/50 text-[#00FFD1] bg-[#00FFD1]/10 text-[8.5px] px-1.5 py-0.5 font-bold tracking-wider">
                ONLINE
              </span>
            ) : (
              <span className="hidden sm:inline-block border border-[#FF4E00]/50 text-[#FF4E00] bg-[#FF4E00]/10 text-[8.5px] px-1.5 py-0.5 font-bold tracking-wider animate-pulse">
                OFFLINE_SYNC
              </span>
            )}
          </div>
        </Group>

        <Group gap="sm" className="h-full items-center text-xs">
          <div className="hidden sm:flex flex-col text-right text-[10px]">
            <span className="text-white font-bold uppercase">{user?.nom || user?.login || 'Utilisateur'}</span>
            <span className="text-gray-500 text-[9px] uppercase tracking-widest">{user?.role || 'Admin'}</span>
          </div>

          <div className="w-8 h-8 rounded-none border border-[#222] bg-[#111] flex items-center justify-center text-xs text-[#E0E0E0] font-bold">
            {(user?.nom || user?.login || 'U').substring(0, 2).toUpperCase()}
          </div>

          <button
            onClick={handleLogout}
            className="hover:bg-red-500/15 border border-dashed border-[#222] hover:border-[#FF4E00] text-gray-500 hover:text-[#FF4E00] px-2 py-1.5 text-[10px] uppercase font-bold flex items-center gap-1 cursor-pointer transition-all bg-transparent"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Sortir</span>
          </button>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="0" className="flex flex-col justify-between border-none">
        <div className="p-4 flex flex-col gap-6">
          {/* Quick Session Overview badge */}
          <div className="bg-[#050505] border border-[#222] p-3 text-[11px] text-[#888] flex flex-col gap-1.5 select-none">
            <div className="flex items-center gap-1 w-full text-white font-bold opacity-80 text-[10px] tracking-wider uppercase border-b border-[#222] pb-1">
              <MonitorCheck className="w-4 h-4 text-[#00FFD1]" />
              INFRA_FSBM_CASABLANCA
            </div>
            <p className="m-0">Hôte: <strong className="text-[#00FFD1] select-all">192.168.1.103</strong></p>
            <p className="m-0">Rôle: <strong className="text-white">{user?.role}</strong></p>
            <p className="m-0">Scan Nmap: <strong className={isScanning ? 'text-[#FFD700]' : 'text-[#666]'}>
              {isScanning ? 'EN COURS...' : 'STANDBY'}
            </strong></p>
          </div>

          <ScrollArea type="never" className="flex-1">
            {NAV_SECTIONS.map((section) => (
              <div key={section.label} className="flex flex-col gap-1.5">
                <div className="text-[10px] text-[#444] px-2 mb-1.5 uppercase tracking-[0.2em]">{section.label}</div>
                {section.items.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.to)
                  
                  if (item.adminOnly && !isAdmin) {
                    return null
                  }
                  
                  // Custom rendering for NavLink to match v6 precisely
                  return (
                    <NavLink
                      key={item.to}
                      label={
                        <span className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                          <Icon className={`w-4 h-4 ${item.to === '/dashboard' ? 'animate-pulse' : ''}`} />
                          {item.label}
                        </span>
                      }
                      rightSection={
                        <span className={`bg-transparent border text-[10px] font-mono uppercase px-1 ${
                          item.to === '/inventaire' ? 'border-[#00FFD1] text-[#00FFD1]' :
                          item.to === '/alertes' ? (alertCount > 0 ? 'border-red-500 text-red-500' : 'border-[#00FFD1] text-[#00FFD1]') :
                          item.to === '/anomalies' ? 'border-green-500 text-green-500' :
                          item.to === '/rapports' ? 'border-cyan-600 text-cyan-600' :
                          item.to === '/utilisateurs' ? 'border-gray-500 text-gray-500' :
                          item.to === '/profil' ? 'border-gray-500 text-gray-500' :
                          'border-[#666] text-[#666]'
                        }`}>
                          {item.to === '/inventaire' ? `${equipmentCount} NODES` :
                           item.to === '/alertes' ? alertCount :
                           item.to === '/anomalies' ? 'ACTIVE' :
                           item.to === '/rapports' ? 'POSTGRES' :
                           item.to === '/utilisateurs' ? 'RBAC' :
                           item.to === '/profil' ? 'CLÉ' :
                           item.extra}
                        </span>
                      }
                      active={active}
                      onClick={() => {
                        navigate(item.to)
                        if (opened) toggle()
                      }}
                      className="m-0 rounded-none bg-transparent"
                      styles={{
                        root: {
                          backgroundColor: active ? '#1A1A1A' : 'transparent',
                          borderLeft: `2px solid ${active ? '#00FFD1' : 'transparent'}`,
                          color: active ? '#00FFD1' : '#666',
                          transition: 'all 0.2s',
                          padding: '8px 12px',
                          '&:hover': {
                            backgroundColor: active ? '#1A1A1A' : '#111',
                            color: active ? '#00FFD1' : '#AAA'
                          }
                        },
                        label: {
                          color: 'inherit',
                        }
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Academic Footer detail */}
        <div className="p-4 border-t border-[#222] text-[9.5px] text-gray-500 flex flex-col gap-1 select-none">
          <p className="m-0"><strong>PFE :</strong> Supervision Réseau</p>
          <p className="m-0 text-[9px] uppercase text-[#00FFD1] leading-tight">Université Hassan II, FSBM</p>
        </div>
      </AppShell.Navbar>

      <AppShell.Main className="p-4 md:p-8">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
