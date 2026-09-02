import { useCallback } from 'react'
import { useAppStore } from '@/stores/appStore'

/**
 * 根据当前租户的行业配置返回对应术语。
 * 术语表由后端 system_config 的 industry_labels 统一维护。
 *
 * 配置未加载完成时返回 fallback（避免首帧显示 key 闪烁）。
 *
 * @example
 * const label = useLabel()
 * label('subject')                   // 计量 → "仪器"，检测 → "样品"
 * label('subject', '样品')    // 未加载时显示 fallback
 */
export function useLabel() {
  const industryLabels = useAppStore((s) => s.industryLabels)
  const loaded = useAppStore((s) => s.industryConfigLoaded)

  return useCallback(
    (key: string, fallback?: string): string => {
      if (!loaded) return fallback ?? key
      return industryLabels[key] ?? fallback ?? key
    },
    [industryLabels, loaded],
  )
}
