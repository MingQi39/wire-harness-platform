import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutGridIcon,
  LogOutIcon,
  PackageIcon,
  PanelLeftIcon,
  ScrollTextIcon,
  UserIcon,
} from 'lucide-react'
import { AppLogo } from '@/components/AppLogo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import { useIsMobile } from '@/hooks/useIsMobile'
import { SidebarCollapseButton } from '@/layouts/SidebarCollapseButton'
import { cn } from '@/lib/utils'

export const MAIN_LAYOUT_SIDEBAR_WIDTH = 200
export const SIDEBAR_COLLAPSED_WIDTH = 64

const PAGE_TITLES: Record<string, string> = {
  '/menu': '主菜单',
  '/management': '线束管理',
  '/ledger': '线束台账',
}

const menuItems = [
  { key: '/menu', label: '主菜单', icon: LayoutGridIcon },
  { key: '/ledger', label: '线束台账', icon: ScrollTextIcon },
  { key: '/management', label: '线束管理', icon: PackageIcon },
]

function resolvePageTitle(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  const matched = Object.keys(PAGE_TITLES)
    .filter((key) => key !== '/' && pathname.startsWith(key))
    .sort((a, b) => b.length - a.length)[0]
  return matched ? PAGE_TITLES[matched] : '线束管理平台'
}

function SidebarNav({
  collapsed,
  pathname,
  onNavigate,
}: {
  collapsed: boolean
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-2">
      <div className="flex flex-col gap-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = pathname === item.key || pathname.startsWith(`${item.key}/`)
          const link = (
            <Link
              key={item.key}
              to={item.key}
              onClick={onNavigate}
              className={cn(
                'mx-1 flex h-[30px] w-[calc(100%-8px)] items-center gap-2 rounded-md text-left text-xs transition-colors',
                collapsed ? 'justify-center px-0' : 'px-3',
                active
                  ? 'bg-primary/10 font-medium text-primary shadow-sm shadow-primary/5'
                  : 'text-slate-600 hover:bg-primary/5 hover:text-primary',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          )

          if (!collapsed) return link

          return (
            <Tooltip key={item.key} delayDuration={350}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </nav>
  )
}

function SidebarUserMenu({
  collapsed,
  userName,
  onLogout,
}: {
  collapsed: boolean
  userName: string | null
  onLogout: () => void
}) {
  const trigger = (
    <button
      type="button"
      className={cn(
        'flex w-full items-center rounded-md text-left text-xs text-slate-600 transition-colors hover:bg-primary/5 hover:text-primary',
        collapsed ? 'justify-center px-0 py-2' : 'gap-2 px-2 py-2',
      )}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <UserIcon className="h-3.5 w-3.5" />
      </span>
      {!collapsed ? <span className="min-w-0 flex-1 truncate font-medium">{userName || '用户'}</span> : null}
    </button>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {collapsed ? (
          <Tooltip delayDuration={350}>
            <TooltipTrigger asChild>{trigger}</TooltipTrigger>
            <TooltipContent side="right">{userName || '用户'}</TooltipContent>
          </Tooltip>
        ) : (
          trigger
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={collapsed ? 'center' : 'start'} side={collapsed ? 'right' : 'top'} className="w-44">
        <DropdownMenuItem className="text-xs text-red-600 focus:text-red-600" onClick={onLogout}>
          <LogOutIcon className="mr-2 h-3.5 w-3.5" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SidebarPanel({
  collapsed,
  showCollapseButton,
  onToggleCollapsed,
  pathname,
  userName,
  onLogout,
  onNavigate,
}: {
  collapsed: boolean
  showCollapseButton: boolean
  onToggleCollapsed?: () => void
  pathname: string
  userName: string | null
  onLogout: () => void
  onNavigate?: () => void
}) {
  return (
    <>
      <div
        className={cn(
          'flex h-10 shrink-0 items-center overflow-hidden border-b border-slate-200/80 transition-all',
          collapsed ? 'justify-center px-2' : 'justify-between gap-2 px-3',
        )}
      >
        {!collapsed ? (
          <div className="flex min-w-0 items-center gap-2">
            <AppLogo size={24} className="rounded" />
            <span className="overflow-hidden whitespace-nowrap text-xs font-semibold text-primary">
              线束管理平台
            </span>
          </div>
        ) : null}
        {showCollapseButton && onToggleCollapsed ? (
          <SidebarCollapseButton collapsed={collapsed} onToggle={onToggleCollapsed} />
        ) : null}
      </div>

      <SidebarNav collapsed={collapsed} pathname={pathname} onNavigate={onNavigate} />

      <div className={cn('shrink-0 border-t border-slate-200/80 bg-[#f1f3f8]', collapsed ? 'px-2 py-2' : 'p-2')}>
        <SidebarUserMenu collapsed={collapsed} userName={userName} onLogout={onLogout} />
      </div>
    </>
  )
}

export function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const userName = useAuthStore((s) => s.userName)
  const logout = useAuthStore((s) => s.logout)
  const collapsed = useAppStore((s) => s.collapsed)
  const toggleCollapsed = useAppStore((s) => s.toggleCollapsed)
  const isMobile = useIsMobile()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const pageTitle = resolvePageTitle(location.pathname)

  useEffect(() => {
    if (!isMobile) return
    setMobileNavOpen(false)
  }, [location.pathname, isMobile])

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore
    }
    logout()
    navigate('/login', { replace: true })
  }

  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED_WIDTH : MAIN_LAYOUT_SIDEBAR_WIDTH

  return (
    <div className={cn('bg-white', isMobile ? 'flex h-dvh flex-col overflow-hidden' : 'min-h-screen')}>
      {!isMobile ? (
        <aside
          className="fixed bottom-0 left-0 top-0 z-20 flex flex-col border-r border-slate-200/80 bg-[#f1f3f8] transition-[width] duration-300 ease-in-out"
          style={{ width: sidebarWidth }}
        >
          <SidebarPanel
            collapsed={collapsed}
            showCollapseButton
            onToggleCollapsed={toggleCollapsed}
            pathname={location.pathname}
            userName={userName}
            onLogout={() => void handleLogout()}
          />
        </aside>
      ) : (
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent
            side="left"
            showCloseButton
            onClose={() => setMobileNavOpen(false)}
            className="flex h-full w-[min(90vw,280px)] max-w-[280px] flex-col overflow-hidden border-slate-200 bg-[#f1f3f8] p-0"
          >
            <SidebarPanel
              collapsed={false}
              showCollapseButton={false}
              pathname={location.pathname}
              userName={userName}
              onLogout={() => void handleLogout()}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </SheetContent>
        </Sheet>
      )}

      <div
        className={cn(
          'relative flex min-w-0 flex-col overflow-hidden bg-white transition-[margin-left] duration-300 ease-in-out',
          isMobile ? 'min-h-0 flex-1' : undefined,
        )}
        style={
          isMobile
            ? undefined
            : { marginLeft: sidebarWidth, height: '100vh' }
        }
      >
        <header className="z-10 flex h-10 shrink-0 items-center gap-2 border-b border-slate-200/80 bg-white px-3">
          {isMobile ? (
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              onClick={() => setMobileNavOpen(true)}
              aria-label="打开菜单"
            >
              <PanelLeftIcon className="h-4 w-4" />
            </Button>
          ) : null}
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-slate-950">{pageTitle}</span>
        </header>
        <main className="min-h-0 flex-1 overflow-hidden bg-[#f5f7fb] p-3">
          <div className="h-full min-h-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
