import { MoonIcon, SunIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAppearance } from '@/theme/appearance'

export function AppearanceToggle() {
  const { resolvedMode, setMode } = useAppearance()
  const isDark = resolvedMode === 'dark'
  const nextMode = isDark ? 'light' : 'dark'
  const label = isDark ? '切换到白天模式' : '切换到黑夜模式'

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={() => setMode(nextMode)}
      className="text-muted-foreground hover:text-primary"
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
    </Button>
  )
}
