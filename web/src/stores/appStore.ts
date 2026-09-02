import { create } from 'zustand'
import type { FieldSchema, MenuConfigItem } from '@/api/types'
import { DEFAULT_SIDEBAR_MENU } from '@/constants/defaultMenuConfig'

interface AppState {
  collapsed: boolean
  toggleCollapsed: () => void

  enabledModules: string[]
  subjectFieldSchema: FieldSchema[]
  subjectTypes: { label: string; value: string }[]
  industryLabels: Record<string, string>
  menuConfig: MenuConfigItem[]
  industryConfigLoaded: boolean

  setIndustryConfig: (config: {
    enabledModules: string[]
    subjectFieldSchema: FieldSchema[]
    subjectTypes: { label: string; value: string }[]
    industryLabels: Record<string, string>
    menuConfig: MenuConfigItem[]
  }) => void
  isModuleEnabled: (module: string) => boolean
  resetIndustryConfig: () => void
}

const DEFAULT_MODULES = ['subject', 'task', 'output']

const DEFAULT_MENU: MenuConfigItem[] = DEFAULT_SIDEBAR_MENU

export const useAppStore = create<AppState>()((set, get) => ({
  collapsed: false,
  toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),

  enabledModules: DEFAULT_MODULES,
  subjectFieldSchema: [],
  subjectTypes: [],
  industryLabels: {},
  menuConfig: DEFAULT_MENU,
  industryConfigLoaded: false,

  setIndustryConfig: (config) =>
    set({
      enabledModules: config.enabledModules,
      subjectFieldSchema: config.subjectFieldSchema,
      subjectTypes: config.subjectTypes,
      industryLabels: config.industryLabels,
      menuConfig: config.menuConfig.length > 0 ? config.menuConfig : DEFAULT_MENU,
      industryConfigLoaded: true,
    }),

  isModuleEnabled: (module) => get().enabledModules.includes(module),

  resetIndustryConfig: () =>
    set({
      enabledModules: DEFAULT_MODULES,
      subjectFieldSchema: [],
      subjectTypes: [],
      industryLabels: {},
      menuConfig: DEFAULT_MENU,
      industryConfigLoaded: false,
    }),
}))

if (import.meta.hot) {
  const prev = import.meta.hot.data?.appHmr as Partial<AppState> | undefined
  if (prev?.industryConfigLoaded) {
    useAppStore.setState(prev)
  }
  import.meta.hot.dispose((data) => {
    const { toggleCollapsed, setIndustryConfig, isModuleEnabled, resetIndustryConfig, ...rest } =
      useAppStore.getState()
    data.appHmr = rest
  })
}
