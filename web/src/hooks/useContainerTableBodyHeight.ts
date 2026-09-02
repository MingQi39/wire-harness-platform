import { useCallback, useLayoutEffect, useState } from 'react'

const TABLE_BOTTOM_GAP_PX = 0
const TABLE_BODY_SAFE_RESERVE_PX = 0
/** 亚像素 / 边框容差，避免 scroll.y 贴边时仍出现 1px 假纵向滚动条 */
const CONTENT_SCROLL_SLACK_PX = 2
/** 横向滚动条占位兜底（Windows 非覆盖式滚动条常见高度） */
const HORIZONTAL_SCROLLBAR_FALLBACK_PX = 12

function parsePx(value: string) {
  const n = Number.parseFloat(value)
  return Number.isFinite(n) ? n : 0
}

function getOuterHeight(el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  const style = window.getComputedStyle(el)
  return rect.height + parsePx(style.marginTop) + parsePx(style.marginBottom)
}

function getHorizontalScrollbarHeight(el: HTMLElement) {
  const h = el.offsetHeight - el.clientHeight
  return Math.max(0, h)
}

function measureDataTableBodyMaxY(container: HTMLElement) {
  const viewport = container.querySelector<HTMLElement>('.ui-data-table-viewport')
  const tableElement = viewport?.querySelector<HTMLElement>('table') ?? container.querySelector<HTMLElement>('table')
  if (!tableElement) return null

  const containerRect = container.getBoundingClientRect()
  const tableScrollHost = tableElement.parentElement instanceof HTMLElement ? tableElement.parentElement : null
  // 不能用 <table> 本身的 top（会受 scrollTop 影响）；
  // 改为滚动容器 top，保证翻页时高度测量不随“当前滚动位置”漂移。
  const tableTop = (tableScrollHost ?? tableElement).getBoundingClientRect().top - containerRect.top
  const tableHeader = tableElement.querySelector<HTMLElement>('thead') ?? container.querySelector<HTMLElement>('thead')
  const pagination = container.querySelector<HTMLElement>('[data-pagination], nav')
  // Windows 非覆盖式滚动条会占据实际高度；不扣除会把分页挤出可点击区域。
  const horizontalScrollbarHeight = tableScrollHost ? getHorizontalScrollbarHeight(tableScrollHost) : 0
  const viewportBottomBorder = viewport ? parsePx(window.getComputedStyle(viewport).borderBottomWidth) : 0
  const headerHeight = tableHeader?.getBoundingClientRect().height ?? 0
  const paginationHeight = pagination ? getOuterHeight(pagination) : 0
  const bodyMaxY = Math.floor(
    containerRect.height
      - tableTop
      - headerHeight
      - paginationHeight
      - horizontalScrollbarHeight
      - viewportBottomBorder
      - TABLE_BOTTOM_GAP_PX
      - TABLE_BODY_SAFE_RESERVE_PX,
  )

  return Math.max(0, bodyMaxY)
}

/** 实测 tbody 行高之和，避免经验 rowHeight 偏小导致假纵向滚动条 */
function measureTableBodyContentHeight(container: HTMLElement): number | null {
  const tbody =
    container.querySelector<HTMLElement>('.ui-data-table-viewport tbody') ??
    container.querySelector<HTMLElement>('tbody')
  if (!tbody) return null
  const rows = tbody.querySelectorAll('tr')
  if (rows.length === 0) return 0
  let total = 0
  rows.forEach((row) => {
    total += row.getBoundingClientRect().height
  })
  return Math.ceil(total)
}

function getTableScrollHost(container: HTMLElement): HTMLElement | null {
  const viewport = container.querySelector<HTMLElement>('.ui-data-table-viewport')
  const tableElement = viewport?.querySelector<HTMLElement>('table') ?? container.querySelector<HTMLElement>('table')
  if (!tableElement) return null
  return tableElement.parentElement instanceof HTMLElement ? tableElement.parentElement : null
}

/** 与 size=small 表体行高、表头高度经验值对齐，用于按行数封顶 scroll.y */
export type TableBodyScrollCap = {
  /** 当前页数据行数；>0 时表体高度不超过内容高度，避免行数少于可视容量时出现大块空白 */
  rowCount: number
  /** 单行高度（含边框），默认按紧凑 small 表估算；仅作 DOM 未就绪时的兜底 */
  rowHeightPx?: number
  /** 表头区域 + 表体上沿等占用（非数据行） */
  nonDataBodyPx?: number
  /** 表体最小滚动高度；空间很紧的详情区可调低，避免分页被裁掉 */
  minScrollY?: number
}

/**
 * 测量容器高度，供数据表格的滚动高度计算使用。
 * 优先按实际 DOM 测量工具栏、表头和分页高度，避免工具栏换行时分页被挤出。
 * @param reserve DOM 尚未可测时的兜底预留像素（工具栏/表头/分页等，由调用方微调）
 * @param cap 传入 rowCount 时：有数据则 scroll.y = min(容器可用高度, 内容实际高度)，消除「半屏空白」；
 *            空数据则铺满容器可用高度（与不传 cap 的列表页一致，纵向条由 DataTable 在 isEmpty 时关闭）
 */
export function useContainerTableBodyHeight(reserve = 0, deps: unknown[] = [], cap?: TableBodyScrollCap) {
  // callback ref：表格区可能晚于 hook 挂载（如先选客户再渲染右侧分栏），
  // 若仅用 useRef，ref 附着时 deps 不变会导致测量不重跑、scrollY 卡在初始 280。
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const ref = useCallback((el: HTMLDivElement | null) => {
    setNode((prev) => (prev === el ? prev : el))
  }, [])
  const [scrollY, setScrollY] = useState(280)

  const hasCap = cap != null
  const rowCount = cap?.rowCount ?? 0
  const rowH = cap?.rowHeightPx ?? 33
  const overhead = cap?.nonDataBodyPx ?? 40
  const minScrollY = cap?.minScrollY ?? 120

  useLayoutEffect(() => {
    const el = node
    if (!el) return

    const measure = () => {
      const h = el.getBoundingClientRect().height
      const measuredMaxY = measureDataTableBodyMaxY(el)
      const measuredOrFallbackY = measuredMaxY ?? Math.floor(h - reserve)
      // 正常测量到可用高度时，直接采用测量值；仅在不可测时才使用 minScrollY 兜底，
      // 避免小窗口下把分页区域再次挤压到不可点击。
      const maxY =
        measuredMaxY == null
          ? Math.max(minScrollY, measuredOrFallbackY)
          : Math.max(0, measuredOrFallbackY)
      if (hasCap) {
        if (rowCount <= 0) {
          // 空数据：铺满容器（与 customer/user 等列表一致）；不出现纵向滚动条由 DataTable 保证
          setScrollY(maxY)
          return
        }
        // 按内容封顶；优先实测 tbody，避免经验行高偏小
        const estimatedY = Math.ceil(overhead + rowCount * rowH)
        const measuredBodyY = measureTableBodyContentHeight(el)
        let contentY =
          measuredBodyY != null && measuredBodyY > 0 ? measuredBodyY : estimatedY

        // overflow-auto 出现横向滚动条时会挤占纵向空间，进而挤出假纵向滚动条
        const scrollHost = getTableScrollHost(el)
        if (scrollHost && scrollHost.scrollWidth > scrollHost.clientWidth + 1) {
          contentY += Math.max(
            getHorizontalScrollbarHeight(scrollHost),
            HORIZONTAL_SCROLLBAR_FALLBACK_PX,
          )
        }
        contentY += CONTENT_SCROLL_SLACK_PX
        setScrollY(Math.min(maxY, contentY))
      } else {
        setScrollY(maxY)
      }
    }

    measure()
    // 双 rAF：等表格/横向滚动条完成布局后再测一次，避免首帧漏计横向条高度
    let raf2 = 0
    const raf1 = window.requestAnimationFrame(() => {
      measure()
      raf2 = window.requestAnimationFrame(measure)
    })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    const scrollHost = getTableScrollHost(el)
    if (scrollHost) ro.observe(scrollHost)
    const viewport = el.querySelector<HTMLElement>('.ui-data-table-viewport')
    if (viewport) ro.observe(viewport)
    const mo = new MutationObserver(measure)
    mo.observe(el, { childList: true, subtree: true })
    return () => {
      window.cancelAnimationFrame(raf1)
      window.cancelAnimationFrame(raf2)
      ro.disconnect()
      mo.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps 由调用方传入以在布局变化时重绑
  }, [node, reserve, hasCap, rowCount, rowH, overhead, minScrollY, ...deps])

  return { ref, scrollY }
}
