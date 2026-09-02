import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { systemConfigApi } from '@/api/systemConfig'
import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'
import type { FieldSchema, MenuConfigItem } from '@/api/types'
import { mergeMenuWithDefaults } from '@/constants/defaultMenuConfig'
import { isBuiltInDeveloperUser } from '@/constants/developerUser'

/**
 * 内置开发者登录后从 system_config 加载行业相关配置（模块开关、动态字段、类型选项、菜单结构），
 * 解析后写入 appStore 供全局使用；普通用户使用前端默认配置，避免访问开发者专用接口触发 403。
 */
export function useIndustryConfig() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const userId = useAuthStore((s) => s.userId)
  const setIndustryConfig = useAppStore((s) => s.setIndustryConfig)
  const canReadSystemConfig = isBuiltInDeveloperUser(userId)

  const { data: configs } = useQuery({
    queryKey: ['system-configs'],
    queryFn: () => systemConfigApi.getList(),
    enabled: isAuthenticated && canReadSystemConfig,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!configs) return

    const configMap = Object.fromEntries(configs.map((c) => [c.key, c.value]))

    const enabledModules = safeParse<string[]>(configMap['enabled_modules'], ['subject', 'task', 'output'])
    const subjectFieldSchema = safeParse<FieldSchema[]>(configMap['subject_field_schema'], [])
    const subjectTypes = safeParse<{ label: string; value: string }[]>(configMap['subject_types'], [])
    const industryLabels = safeParse<Record<string, string>>(configMap['industry_labels'], {})
    const parsedMenu = safeParse<MenuConfigItem[]>(configMap['menu_config'], [])
    const menuConfig = mergeMenuWithDefaults(parsedMenu)

    setIndustryConfig({ enabledModules, subjectFieldSchema, subjectTypes, industryLabels, menuConfig })
  }, [configs, setIndustryConfig])
}

function safeParse<T>(json: string | undefined, fallback: T): T {
  if (!json) return fallback
  try {
    const parsed = JSON.parse(json)
    if (parsed == null || typeof parsed !== typeof fallback) return fallback
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback
    return parsed as T
  } catch {
    return fallback
  }
}
