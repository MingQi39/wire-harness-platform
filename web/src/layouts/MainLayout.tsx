import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LayoutGridIcon, LogOutIcon, PackageIcon, ScrollTextIcon, UserIcon } from 'lucide-react'
import { AppLogo } from '@/components/AppLogo'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

export const MAIN_LAYOUT_SIDEBAR_WIDTH = 200

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

export function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const userName = useAuthStore((s) => s.userName)
  const logout = useAuthStore((s) => s.logout)
  const pageTitle = resolvePageTitle(location.pathname)

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore
    }
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-white">
      <aside
        className="fixed bottom-0 left-0 top-0 z-20 flex flex-col border-r border-slate-200/80 bg-[#f1f3f8]"
        style={{ width: MAIN_LAYOUT_SIDEBAR_WIDTH }}
      >
        <div className="flex h-10 shrink-0 items-center gap-2 overflow-hidden border-b border-slate-200/80 px-3">
          <AppLogo size={24} className="rounded" />
          <span className="overflow-hidden whitespace-nowrap text-xs font-semibold text-primary">
            线束管理平台
          </span>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden py-2">
          <div className="flex flex-col gap-0.5">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active =
                location.pathname === item.key || location.pathname.startsWith(`${item.key}/`)
              return (
                <Link
                  key={item.key}
                  to={item.key}
                  className={cn(
                    'mx-1 flex h-[30px] w-[calc(100%-8px)] items-center gap-2 rounded-md px-3 text-left text-xs transition-colors',
                    active
                      ? 'bg-primary/10 font-medium text-primary shadow-sm shadow-primary/5'
                      : 'text-slate-600 hover:bg-primary/5 hover:text-primary',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-slate-200/80 bg-[#f1f3f8] p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-slate-600 transition-colors hover:bg-primary/5 hover:text-primary"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserIcon className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{userName || '用户'}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-44">
              <DropdownMenuItem
                className="text-xs text-red-600 focus:text-red-600"
                onClick={() => void handleLogout()}
              >
                <LogOutIcon className="mr-2 h-3.5 w-3.5" />
                退出登录
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div
        className="relative flex min-w-0 flex-col overflow-hidden bg-white"
        style={{ marginLeft: MAIN_LAYOUT_SIDEBAR_WIDTH, height: '100vh' }}
      >
        <header className="z-10 flex h-10 shrink-0 items-center border-b border-slate-200/80 bg-white px-3">
          <span className="truncate text-[15px] font-semibold text-slate-950">{pageTitle}</span>
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
