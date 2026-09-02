import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { appMessage } from '@/utils/appMessage'
import type { ImportResp } from '@/api/types'

export interface UseImportOptions {
  /** 导入成功后失效的 Query Key；列表页请传当前页的 `xxxKeys.list(params)`，避免整类列表全量重拉 */
  invalidateKey: readonly unknown[]
  entityName?: string
}

export function useImport(importFn: (file: File) => Promise<ImportResp>, options: UseImportOptions) {
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()
  const entityName = options.entityName ?? '数据'

  const run = useCallback(
    async (file: File) => {
      setLoading(true)
      try {
        const result = await importFn(file)
        if (result.failed > 0) {
          toast.warning('导入完成', {
            description: `成功 ${result.success} 条，失败 ${result.failed} 条。\n${result.errors?.join('\n') || ''}`,
          })
        } else {
          appMessage().success(`成功导入 ${result.success} 条${entityName}`)
        }
        queryClient.invalidateQueries({ queryKey: options.invalidateKey })
      } catch {
        // 拦截器已统一展示后端错误
      } finally {
        setLoading(false)
      }
      return false
    },
    [importFn, entityName, queryClient, options.invalidateKey],
  )

  return { run, loading }
}
