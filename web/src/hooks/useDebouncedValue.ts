import { useEffect, useState } from 'react'

/** 将快速变化的值防抖后再用于请求等副作用，减轻接口压力、避免输入中途的无效查询 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(t)
  }, [value, delayMs])
  return debounced
}
