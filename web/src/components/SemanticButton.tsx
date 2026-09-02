import { forwardRef, type ComponentProps, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { extractButtonTextLabel, getSemanticButtonProps } from '@/theme/semanticButtonStyles'

type ButtonVariant = ComponentProps<typeof Button>['variant']
type ButtonSize = ComponentProps<typeof Button>['size']

export type SemanticButtonProps = Omit<ComponentProps<typeof Button>, 'variant' | 'size'> & {
  /** 子节点不是纯文案（如图标按钮、动态文件名）时，用于语义查找的固定锚点 */
  semanticLabel?: string
  variant?: ButtonVariant
  size?: ButtonSize | 'small' | 'middle' | 'large'
  icon?: ReactNode
  loading?: boolean
  block?: boolean
}

function mapSize(size: SemanticButtonProps['size']): ButtonSize | undefined {
  if (size === 'small') return 'sm'
  if (size === 'large') return 'lg'
  if (size === 'middle') return 'default'
  return size
}

export const SemanticButton = forwardRef<HTMLButtonElement, SemanticButtonProps>(
  function SemanticButton({ semanticLabel, children, icon, loading, block, className, variant, size, ...props }, ref) {
    const label = semanticLabel ?? extractButtonTextLabel(children)
    const hasExplicitStyle = props.type != null || variant != null || props.danger != null
    const semantic = !hasExplicitStyle && !props.disabled && label ? getSemanticButtonProps(label) : {}
    return (
      <Button
        ref={ref}
        variant={variant ?? semantic.variant}
        size={mapSize(size)}
        className={cn(block && 'w-full', className)}
        loading={loading}
        icon={icon}
        {...props}
      >
        {children}
      </Button>
    )
  },
)
