import { useCallback, useRef, useState } from 'react'

export function useResizablePanel({
  defaultWidth,
  minWidth,
  maxWidth,
}: {
  defaultWidth: number
  minWidth: number
  maxWidth: number
}) {
  const [width, setWidth] = useState(defaultWidth)
  const widthRef = useRef(width)
  widthRef.current = width

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      const startX = e.clientX
      const startW = widthRef.current
      const onMove = (ev: MouseEvent) => {
        const next = Math.round(Math.min(Math.max(startW + ev.clientX - startX, minWidth), maxWidth))
        widthRef.current = next
        setWidth(next)
      }
      const onUp = () => {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
        document.body.style.removeProperty('user-select')
        document.body.style.removeProperty('cursor')
      }
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [minWidth, maxWidth],
  )

  return { width, onMouseDown } as const
}
