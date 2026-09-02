import { useCallback, useEffect, useRef, useState } from 'react'

type Options = {
  /** 内容变化时可能撑高滚动区域，用于触发跟随滚动 */
  deps: unknown[]
  rootMargin?: string
  /** 为 false 时不挂载 Observer（如面板关闭） */
  enabled?: boolean
}

export function useStickToBottomScroll({ deps, rootMargin = '80px 0px', enabled = true }: Options) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const bottomSentinelRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const [stickToBottom, setStickToBottom] = useState(true)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'instant') => {
    const el = scrollContainerRef.current
    if (!el) return
    if (behavior === 'instant') {
      el.scrollTop = el.scrollHeight
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior })
    }
  }, [])

  const forceStickToBottom = useCallback(() => {
    stickToBottomRef.current = true
    setStickToBottom(true)
    requestAnimationFrame(() => scrollToBottom('instant'))
  }, [scrollToBottom])

  const resumeStickToBottom = useCallback(() => {
    stickToBottomRef.current = true
    setStickToBottom(true)
    scrollToBottom('smooth')
  }, [scrollToBottom])

  useEffect(() => {
    if (!enabled) return
    const root = scrollContainerRef.current
    const sentinel = bottomSentinelRef.current
    if (!root || !sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        const atBottom = entry.isIntersecting
        stickToBottomRef.current = atBottom
        setStickToBottom(atBottom)
      },
      { root, threshold: 0, rootMargin },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [rootMargin, enabled])

  useEffect(() => {
    if (!stickToBottomRef.current) return
    requestAnimationFrame(() => scrollToBottom('instant'))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps 由调用方传入
  }, deps)

  return {
    scrollContainerRef,
    bottomSentinelRef,
    stickToBottom,
    forceStickToBottom,
    resumeStickToBottom,
  }
}
