import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { injectThemeVars } from '@/theme/colors'

export type AppearanceMode = 'light' | 'dark' | 'system'
export type ResolvedAppearance = 'light' | 'dark'

interface AppearanceContextValue {
  mode: AppearanceMode
  resolvedMode: ResolvedAppearance
  setMode: (mode: AppearanceMode) => void
}

const STORAGE_KEY = 'lims-appearance-mode'
const AppearanceContext = createContext<AppearanceContextValue | null>(null)

function getSystemAppearance(): ResolvedAppearance {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function loadAppearanceMode(): AppearanceMode {
  if (typeof window === 'undefined') return 'system'
  const stored = (() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })()
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
}

function resolveAppearance(mode: AppearanceMode): ResolvedAppearance {
  return mode === 'system' ? getSystemAppearance() : mode
}

function applyAppearance(resolvedMode: ResolvedAppearance) {
  const root = document.documentElement
  root.classList.toggle('dark', resolvedMode === 'dark')
  root.dataset.theme = resolvedMode
  root.style.colorScheme = resolvedMode
  injectThemeVars(resolvedMode)
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppearanceMode>(() => loadAppearanceMode())
  const [resolvedMode, setResolvedMode] = useState<ResolvedAppearance>(() => resolveAppearance(loadAppearanceMode()))

  useEffect(() => {
    const updateResolvedMode = () => {
      setResolvedMode(resolveAppearance(mode))
    }

    updateResolvedMode()
    if (mode !== 'system') return undefined

    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!media) return undefined
    media.addEventListener('change', updateResolvedMode)
    return () => {
      media.removeEventListener('change', updateResolvedMode)
    }
  }, [mode])

  useEffect(() => {
    applyAppearance(resolvedMode)
  }, [resolvedMode])

  const setMode = useCallback((nextMode: AppearanceMode) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, nextMode)
    } catch {
      // 无痕/受限环境下仍允许本次会话切换外观。
    }
    setModeState(nextMode)
  }, [])

  const value = useMemo(
    () => ({ mode, resolvedMode, setMode }),
    [mode, resolvedMode, setMode],
  )

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function useAppearance() {
  const value = useContext(AppearanceContext)
  if (!value) {
    throw new Error('useAppearance must be used within AppearanceProvider')
  }
  return value
}
