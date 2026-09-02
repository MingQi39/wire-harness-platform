import { cn } from '@/lib/utils'

const LOGO_SRC = `${import.meta.env.BASE_URL}logo.svg`

type AppLogoProps = {
  size?: number
  className?: string
  alt?: string
}

export function AppLogo({ size = 24, className, alt = '线束管理平台' }: AppLogoProps) {
  return (
    <img
      src={LOGO_SRC}
      alt={alt}
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      draggable={false}
    />
  )
}

export const APP_LOGO_SRC = LOGO_SRC
