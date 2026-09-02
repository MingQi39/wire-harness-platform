import { Spinner } from '@/components/ui/spinner'

export function PageLoading() {
  return (
    <div className="flex h-full min-h-[200px] items-center justify-center gap-2 text-sm text-slate-500">
      <Spinner />
      <span>加载中...</span>
    </div>
  )
}
