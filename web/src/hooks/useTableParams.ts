import { useState, useCallback, useMemo } from 'react'
import type { TablePaginationConfig } from '@/components/ConfigurableTable/types'
import type { PageParams } from '@/api/types'

interface UseTableParamsOptions<P extends PageParams> {
  defaultParams?: Partial<P>
  defaultPageSize?: number
  pageSizeOptions?: number[]
}

/** 列表默认每页条数：首屏尽量多展示（仍可通过分页器切换） */
const DEFAULT_LIST_PAGE_SIZE = 50

export function useTableParams<P extends PageParams>(options?: UseTableParamsOptions<P>) {
  const { defaultParams, defaultPageSize = DEFAULT_LIST_PAGE_SIZE, pageSizeOptions } = options ?? {}

  const [params, setParams] = useState<P>({
    page: 1,
    page_size: defaultPageSize,
    ...defaultParams,
  } as P)

  const updateParams = useCallback((patch: Partial<P>) => {
    setParams((p) => ({ ...p, ...patch }))
  }, [])

  const setFilter = useCallback(<K extends keyof P>(key: K, value: P[K]) => {
    setParams((p) => ({ ...p, [key]: value, page: 1 }))
  }, [])

  const handleTableChange = useCallback(
    (_pagination: unknown, _filters: unknown, sorter: unknown) => {
      const s = sorter as { field?: string; order?: string }
      if (s.field && s.order) {
        setParams((p) => ({
          ...p,
          sort_by: s.field,
          sort_order: s.order === 'ascend' ? 'asc' : 'desc',
        }))
      } else {
        setParams((p) => {
          const { sort_by, sort_order, ...rest } = p as unknown as Record<string, unknown>
          return { ...rest } as unknown as P
        })
      }
    },
    [],
  )

  const pagination = useCallback(
    (total?: number): TablePaginationConfig => ({
      current: params.page,
      pageSize: params.page_size,
      total,
      showSizeChanger: true,
      pageSizeOptions: pageSizeOptions ?? [20, 50, 100],
      showTotal: (t) => `共 ${t} 条`,
      onChange: (page, pageSize) => setParams((p) => ({ ...p, page, page_size: pageSize })),
    }),
    [pageSizeOptions, params.page, params.page_size],
  )

  const resetParams = useCallback(() => {
    setParams({
      page: 1,
      page_size: defaultPageSize,
      ...defaultParams,
    } as P)
  }, [defaultPageSize, defaultParams])

  return useMemo(
    () => ({ params, setParams, updateParams, setFilter, handleTableChange, pagination, resetParams }),
    [params, updateParams, setFilter, handleTableChange, pagination, resetParams],
  )
}
