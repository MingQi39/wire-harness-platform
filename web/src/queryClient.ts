import { QueryClient } from '@tanstack/react-query'

/** 与 main.tsx 共用，便于在非 React 上下文（如 axios 401）清理缓存 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false
        const isBizError = error && typeof error === 'object' && 'traceId' in error
        if (isBizError) return false
        return true
      },
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
    },
    mutations: {
      retry: false,
    },
  },
})
