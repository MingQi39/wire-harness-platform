import { ChevronDownIcon } from 'lucide-react'
import { HARNESS_STATUS_OPTIONS } from '@/api/harnessLedger'
import { Tag } from '@/components/ui/app-ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const STATUS_TAG_COLOR: Record<string, string | undefined> = {
  in_use: 'blue',
  idle: 'success',
  scrapped: undefined,
}

type HarnessStatusSelectProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function HarnessStatusSelect({ value, onChange, disabled }: HarnessStatusSelectProps) {
  const label =
    HARNESS_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            'inline-flex max-w-full items-center gap-0.5 rounded outline-none transition-opacity',
            'focus-visible:ring-2 focus-visible:ring-primary/30',
            disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:opacity-90',
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <Tag color={STATUS_TAG_COLOR[value]} className="shrink-0">
            {label}
          </Tag>
          <ChevronDownIcon className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[96px] p-1">
        {HARNESS_STATUS_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            className={cn(
              'cursor-pointer rounded px-2 py-1.5 text-xs',
              option.value === value && 'bg-primary/5',
            )}
            onClick={(event) => {
              event.stopPropagation()
              onChange(option.value)
            }}
          >
            <Tag color={STATUS_TAG_COLOR[option.value]}>{option.label}</Tag>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
