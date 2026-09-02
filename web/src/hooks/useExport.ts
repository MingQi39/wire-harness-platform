import { useState, useCallback } from 'react'

interface UseExportOptions {
  filename?: string | (() => string)
}

export function useExport<P = void>(
  exportFn: (params: P) => Promise<unknown>,
  options?: UseExportOptions,
) {
  const [loading, setLoading] = useState(false)

  const run = useCallback(
    async (params: P) => {
      setLoading(true)
      try {
        const blob = await exportFn(params)
        if (!(blob instanceof Blob)) {
          return
        }
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const name =
          typeof options?.filename === 'function'
            ? options.filename()
            : options?.filename ?? `export_${Date.now()}.csv`
        a.download = name
        a.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 2000)
      } catch {
        // 拦截器已统一展示后端错误
      } finally {
        setLoading(false)
      }
    },
    [exportFn, options],
  )

  return { run, loading }
}
