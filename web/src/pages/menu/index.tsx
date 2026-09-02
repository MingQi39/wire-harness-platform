import { Link } from 'react-router-dom'
import { ArchiveIcon, CableIcon, PackageIcon, ScrollTextIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, Empty, Spinner } from '@/components/ui/app-ui'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useDashboardStats } from '@/hooks/useDashboard'
import { getGreeting } from '@/utils/format'
import styles from './DashboardPage.module.scss'

const STATUS_ITEMS = [
  { key: 'in_use', label: '在用', color: 'text-blue-600' },
  { key: 'idle', label: '空闲', color: 'text-emerald-600' },
  { key: 'scrapped', label: '报废', color: 'text-slate-500' },
] as const

export default function DashboardPage() {
  const userName = useAuthStore((s) => s.userName)
  const greeting = getGreeting()
  const { data, isLoading } = useDashboardStats()

  const status = data?.status

  return (
    <div className={styles.page}>
      <Card className={cn(styles.heroCard, 'border-none')} styles={{ body: { padding: '22px 24px' } }}>
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center">
          <div
            className={cn(
              styles.avatar,
              'flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-xl font-bold text-primary',
            )}
          >
            {(userName || '用').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <Badge className="mb-2 rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary ring-0">
              今日工作概览
            </Badge>
            <h2 className="m-0 text-[20px] font-semibold tracking-tight text-slate-900 lg:text-[22px]">
              {greeting}，{userName || '用户'}，欢迎使用线束管理平台
            </h2>
            <p className="mt-2 mb-0 max-w-xl text-sm leading-6 text-slate-500">
              项目与线束台账统计已整理在这里，可快速进入线束台账维护数据。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 self-stretch sm:grid-cols-2 lg:flex lg:self-auto">
            <div className={cn(styles.statCard, 'text-center')}>
              <div className="text-xs text-slate-500">项目数</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                {isLoading ? '—' : data?.project_count ?? 0}
              </div>
            </div>
            <div className={cn(styles.statCard, 'text-center')}>
              <div className="text-xs text-slate-500">线束总数</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                {isLoading ? '—' : data?.item_count ?? 0}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card
        title={
          <span className="inline-flex items-center gap-2 text-slate-800">
            <span className={styles.cardTitleIcon}>
              <CableIcon />
            </span>
            <span>线束状态统计</span>
          </span>
        }
        className={cn(styles.sectionCard, 'border-none')}
        styles={{ body: { padding: '16px' } }}
      >
        {isLoading ? (
          <div className="flex min-h-[88px] items-center justify-center gap-2 text-sm text-slate-500">
            <Spinner />
            加载中
          </div>
        ) : (
          <div className={styles.statGrid}>
            {STATUS_ITEMS.map((item) => (
              <div key={item.key} className={styles.statTile}>
                <div className={styles.statTileLabel}>{item.label}</div>
                <div className={cn(styles.statTileValue, item.color)}>{status?.[item.key] ?? 0}</div>
              </div>
            ))}
            <div className={styles.statTile}>
              <div className={styles.statTileLabel}>项目数</div>
              <div className={styles.statTileValue}>{data?.project_count ?? 0}</div>
            </div>
            <div className={styles.statTile}>
              <div className={styles.statTileLabel}>线束总数</div>
              <div className={styles.statTileValue}>{data?.item_count ?? 0}</div>
            </div>
            <div className={styles.statTile}>
              <div className={styles.statTileLabel}>在用占比</div>
              <div className={styles.statTileValue}>
                {data?.item_count
                  ? `${Math.round(((status?.in_use ?? 0) / data.item_count) * 100)}%`
                  : '0%'}
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title={
            <span className="inline-flex items-center gap-2 text-slate-800">
              <span className={styles.cardTitleIcon}>
                <ArchiveIcon />
              </span>
              <span>近期项目</span>
            </span>
          }
          extra={
            <Badge className="rounded-full border-transparent bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary ring-0">
              {data?.recent_projects.length ?? 0} 项
            </Badge>
          }
          className={cn(styles.sectionCard, 'border-none')}
          styles={{ body: { padding: '12px 16px 14px', minHeight: 220 } }}
        >
          {isLoading ? (
            <div className="flex min-h-[180px] items-center justify-center gap-2 text-sm text-slate-500">
              <Spinner />
              加载中
            </div>
          ) : !data?.recent_projects.length ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无项目，请在线束台账中新增" />
          ) : (
            <div className="space-y-1">
              {data.recent_projects.map((item) => (
                <Link
                  key={item.id}
                  to="/management"
                  className={cn(
                    styles.listItem,
                    'flex items-center justify-between gap-3 px-2 py-2.5 no-underline',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{item.project_name}</div>
                    <div className="mt-1 truncate text-xs text-slate-500">
                      {item.platform_model || '—'} · {item.item_count} 条线束
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card
          title={
            <div>
              <div className="text-sm font-semibold text-slate-900">快捷操作</div>
              <div className="mt-1 text-xs font-normal text-slate-400">常用功能入口</div>
            </div>
          }
          className={cn(styles.sectionCard, 'border-none')}
          styles={{ body: { padding: '16px' }, header: { minHeight: 62 } }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/management"
              className={cn(
                styles.actionCard,
                'group flex cursor-pointer flex-col items-start justify-between rounded-2xl p-4 no-underline transition-all hover:-translate-y-0.5',
              )}
            >
              <div
                className={cn(
                  styles.actionIcon,
                  'flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 text-lg transition-transform group-hover:scale-105',
                )}
              >
                <PackageIcon />
              </div>
              <span className="relative mt-3 text-sm font-medium text-slate-700">线束管理</span>
            </Link>
            <Link
              to="/ledger"
              className={cn(
                styles.actionCard,
                'group flex cursor-pointer flex-col items-start justify-between rounded-2xl p-4 no-underline transition-all hover:-translate-y-0.5',
              )}
            >
              <div
                className={cn(
                  styles.actionIcon,
                  'flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 text-lg transition-transform group-hover:scale-105',
                )}
              >
                <ScrollTextIcon />
              </div>
              <span className="relative mt-3 text-sm font-medium text-slate-700">线束台账</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
