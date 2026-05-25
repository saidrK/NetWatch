/**
 * Layout admin — Mantine AppShell (sidebar + header)
 * Contenu des pages via <Outlet />
 */
import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppShell,
  Badge,
  Burger,
  Group,
  NavLink,
  ScrollArea,
  Text,
  ThemeIcon,
  UnstyledButton,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Network,
  Server,
  Wifi,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

const NAV_SECTIONS = [
  {
    label: 'Supervision',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, bf: 'BF03' },
      { to: '/alertes', label: 'Alertes', icon: AlertTriangle, bf: 'BF05' },
      { to: '/anomalies', label: 'Anomalies IA', icon: BrainCircuit, bf: 'BF04' },
    ],
  },
  {
    label: 'Gestion',
    items: [
      { to: '/inventaire', label: 'Inventaire', icon: Server, bf: 'BF02' },
      { to: '/rapports', label: 'Rapports', icon: FileBarChart, bf: 'BF07' },
    ],
  },
]

const PAGE_TITLES = {
  '/dashboard': 'Dashboard temps réel',
  '/alertes': 'Gestion des alertes',
  '/anomalies': 'Détection IA',
  '/inventaire': 'Inventaire réseau',
  '/rapports': 'Rapports',
}

export default function AppLayout() {
  const [opened, { toggle }] = useDisclosure()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout, isAdmin } = useAuth()

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  const pageTitle = PAGE_TITLES[pathname] ?? 'Supervision réseau'

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 280,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="md"
      styles={{
        main: {
          background:
            'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(222 47% 5%) 100%)',
        },
        navbar: {
          backgroundColor: 'hsl(222 47% 7%)',
          borderRight: '1px solid hsl(var(--border))',
        },
        header: {
          backgroundColor: 'hsl(222 47% 8%)',
          borderBottom: '1px solid hsl(var(--border))',
        },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              aria-label="Menu"
            />
            <div>
              <Text size="sm" c="dimmed" lh={1.2}>
                Plateforme de supervision
              </Text>
              <Text fw={600} size="lg" lh={1.2}>
                {pageTitle}
              </Text>
            </div>
          </Group>

          <Group gap="sm">
            <Badge
              variant="light"
              color="teal"
              size="sm"
              radius="xl"
              leftSection={<Activity size={11} strokeWidth={2.25} />}
              styles={{
                root: { paddingInline: 10 },
                label: { letterSpacing: '0.04em', fontWeight: 700 },
              }}
            >
              Live
            </Badge>
            <Badge variant="light" color={isAdmin ? 'blue' : 'gray'}>
              {user?.role ?? '—'}
            </Badge>
            <UnstyledButton
              onClick={handleLogout}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Déconnexion</span>
            </UnstyledButton>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section>
          <Group gap="sm" mb="lg">
            <ThemeIcon
              size={42}
              radius="md"
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan', deg: 135 }}
            >
              <Wifi size={22} />
            </ThemeIcon>
            <div>
              <Text fw={700} size="sm" lh={1.2}>
                Supervision Réseau
              </Text>
              <Text size="xs" c="dimmed" ff="monospace">
                FSBM · PFE 2025/26
              </Text>
            </div>
          </Group>
        </AppShell.Section>

        <AppShell.Section grow component={ScrollArea}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-4">
              <Text
                size="xs"
                tt="uppercase"
                fw={700}
                c="dimmed"
                mb="xs"
                pl="sm"
                style={{ letterSpacing: '0.08em' }}
              >
                {section.label}
              </Text>
              {section.items.map((item) => {
                const Icon = item.icon
                const active =
                  pathname === item.to ||
                  pathname.startsWith(`${item.to}/`)
                return (
                  <NavLink
                    key={item.to}
                    label={item.label}
                    description={item.bf}
                    leftSection={<Icon size={18} strokeWidth={active ? 2.5 : 2} />}
                    active={active}
                    onClick={() => {
                      navigate(item.to)
                      if (opened) toggle()
                    }}
                    mb={4}
                    styles={{
                      root: {
                        borderRadius: 8,
                      },
                      label: { fontWeight: active ? 600 : 500 },
                    }}
                  />
                )
              })}
            </div>
          ))}
        </AppShell.Section>

        <AppShell.Section>
          <Group
            gap="xs"
            p="sm"
            className="rounded-lg border border-border/60 bg-card/40"
          >
            <Network size={16} className="text-primary" />
            <div>
              <Text size="xs" c="dimmed">
                Connecté en tant que
              </Text>
              <Text size="sm" fw={600} truncate>
                {user?.nom ?? 'Utilisateur'}
              </Text>
            </div>
          </Group>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
