import { useState } from 'react'
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react'

import { AppLogo } from '@/components/AppLogo'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface SidebarCollapseButtonProps {
  collapsed: boolean
  onToggle: () => void
}

export function SidebarCollapseButton({ collapsed, onToggle }: SidebarCollapseButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const label = collapsed ? '展开侧栏' : '收起侧栏'

  return (
    <Tooltip delayDuration={350}>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          aria-pressed={!collapsed}
          onClick={onToggle}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="size-8 shrink-0 text-muted-foreground hover:text-primary"
        >
          {collapsed && !isHovered ? (
            <AppLogo size={20} className="rounded" alt="" />
          ) : collapsed ? (
            <PanelLeftOpenIcon />
          ) : (
            <PanelLeftCloseIcon />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side={collapsed ? 'right' : 'bottom'}>{label}</TooltipContent>
    </Tooltip>
  )
}
