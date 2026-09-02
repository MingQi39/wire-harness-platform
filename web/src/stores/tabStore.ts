import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { arrayMove } from '@dnd-kit/sortable'

export type TabItem = {
  key: string
  title: string
  pinned: boolean
}

const HOME_TAB: TabItem = { key: '/', title: '首页', pinned: false }

function pinnedBoundary(tabs: TabItem[]): number {
  const idx = tabs.findIndex((t) => !t.pinned)
  return idx === -1 ? tabs.length : idx
}

function ensureHome(tabs: TabItem[]): TabItem[] {
  if (tabs.some((t) => t.key === '/')) return tabs
  return [HOME_TAB, ...tabs]
}

function pickNavigateAfterClose(prev: TabItem[], closedKey: string, activeKey: string): string | null {
  if (closedKey !== activeKey) return null
  const idx = prev.findIndex((t) => t.key === closedKey)
  const next = prev.filter((t) => t.key !== closedKey)
  const left = idx > 0 ? prev[idx - 1] : undefined
  return left?.key ?? next[0]?.key ?? '/'
}

interface TabState {
  tabs: TabItem[]
  /** Bumped when UI should scroll the tab bar to a key (e.g. re-click sidebar menu). */
  scrollRequestAt: number
  scrollRequestKey: string
  requestScrollTo: (key: string) => void
  /** Open or focus by pathname. Returns whether a new tab was added. */
  openTab: (key: string, title: string) => void
  /** Update title for an existing tab key. */
  updateTabTitle: (key: string, title: string) => void
  /** Sync titles from a pathname→title map (async menu labels). */
  syncTitles: (pageTitles: Record<string, string>, resolve: (path: string) => string) => void
  /**
   * Close a tab. Home and pinned tabs are ignored.
   * Returns the pathname to navigate to when the closed tab was active, else null.
   */
  closeTab: (key: string, activeKey: string) => string | null
  /**
   * Keep pinned tabs + the given key (+ home). Returns navigate target if active was removed.
   */
  closeOtherTabs: (keepKey: string, activeKey: string) => string | null
  togglePin: (key: string) => void
  moveTab: (fromIndex: number, toIndex: number) => void
  reset: () => void
}

export const useTabStore = create<TabState>()(
  persist(
    (set, get) => ({
      tabs: [HOME_TAB],
      scrollRequestAt: 0,
      scrollRequestKey: '',

      requestScrollTo: (key) => {
        if (!key) return
        set({ scrollRequestKey: key, scrollRequestAt: Date.now() })
      },

      openTab: (key, title) => {
        if (!key) return
        set((state) => {
          const existing = state.tabs.find((t) => t.key === key)
          if (existing) {
            if (existing.title === title) return state
            return {
              tabs: state.tabs.map((t) => (t.key === key ? { ...t, title } : t)),
            }
          }
          const nextTab: TabItem = { key, title, pinned: false }
          return { tabs: [...state.tabs, nextTab] }
        })
      },

      updateTabTitle: (key, title) => {
        set((state) => {
          const tab = state.tabs.find((t) => t.key === key)
          if (!tab || tab.title === title) return state
          return {
            tabs: state.tabs.map((t) => (t.key === key ? { ...t, title } : t)),
          }
        })
      },

      syncTitles: (pageTitles, resolve) => {
        set((state) => {
          let changed = false
          const tabs = state.tabs.map((t) => {
            const title = resolve(t.key) || pageTitles[t.key] || t.title
            if (title === t.title) return t
            changed = true
            return { ...t, title }
          })
          return changed ? { tabs } : state
        })
      },

      closeTab: (key, activeKey) => {
        if (key === '/') return null
        const { tabs } = get()
        const target = tabs.find((t) => t.key === key)
        if (!target || target.pinned) return null

        const navigateTo = pickNavigateAfterClose(tabs, key, activeKey)
        set({ tabs: ensureHome(tabs.filter((t) => t.key !== key)) })
        return navigateTo
      },

      closeOtherTabs: (keepKey, activeKey) => {
        const { tabs } = get()
        const next = ensureHome(
          tabs.filter((t) => t.key === '/' || t.pinned || t.key === keepKey),
        )
        const removedActive = !next.some((t) => t.key === activeKey)
        set({ tabs: next })
        if (removedActive) {
          return next.find((t) => t.key === keepKey)?.key ?? '/'
        }
        return null
      },

      togglePin: (key) => {
        set((state) => {
          const index = state.tabs.findIndex((t) => t.key === key)
          if (index < 0) return state
          const current = state.tabs[index]!
          const nextTab: TabItem = { ...current, pinned: !current.pinned }
          const without = [...state.tabs.slice(0, index), ...state.tabs.slice(index + 1)]
          const insertAt = pinnedBoundary(without)
          return {
            tabs: [...without.slice(0, insertAt), nextTab, ...without.slice(insertAt)],
          }
        })
      },

      moveTab: (fromIndex, toIndex) => {
        if (fromIndex === toIndex) return
        set((state) => {
          const { tabs } = state
          if (fromIndex < 0 || fromIndex >= tabs.length) return state
          const boundary = pinnedBoundary(tabs)
          const source = tabs[fromIndex]!
          let clampedTo: number
          if (source.pinned) {
            clampedTo = Math.max(0, Math.min(toIndex, Math.max(boundary - 1, 0)))
          } else {
            clampedTo = Math.max(boundary, Math.min(toIndex, tabs.length - 1))
          }
          if (clampedTo === fromIndex) return state
          return { tabs: arrayMove(tabs, fromIndex, clampedTo) }
        })
      },

      reset: () => set({ tabs: [HOME_TAB] }),
    }),
    {
      name: 'lims-desktop-tabs',
      partialize: (state) => ({ tabs: state.tabs }),
      merge: (persisted, current) => {
        const raw = persisted as { tabs?: TabItem[] } | undefined
        const tabs = ensureHome(
          (raw?.tabs ?? current.tabs).map((t) => ({
            key: t.key,
            title: t.title || '页面',
            pinned: Boolean(t.pinned),
          })),
        )
        // Restore pinned-first order
        const pinned = tabs.filter((t) => t.pinned)
        const unpinned = tabs.filter((t) => !t.pinned)
        return { ...current, tabs: [...pinned, ...unpinned] }
      },
    },
  ),
)
