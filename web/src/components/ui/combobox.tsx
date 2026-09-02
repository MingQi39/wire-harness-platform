import { createContext, useContext, useMemo, useRef, useState } from "react";
import { Input } from "./input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "./command";
import { OverflowTooltip } from "./overflow-tooltip";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";
import { cn } from "@/lib/utils";

type Ctx = {
  value?: string;
  open: boolean;
  query: string;
  shouldFilter: boolean;
  closeOnSelect: boolean;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  setOpen: (open: boolean) => void;
  setQuery: (query: string) => void;
  setValue: (v: string) => void;
};

const ComboboxContext = createContext<Ctx | null>(null);

export function Combobox({
  value,
  onValueChange,
  onOpenChange,
  shouldFilter = true,
  closeOnSelect = true,
  children,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  shouldFilter?: boolean;
  closeOnSelect?: boolean;
  children?: React.ReactNode;
}) {
  const [internal, setInternal] = useState(value);
  const [open, setOpenState] = useState(false);
  const [query, setQuery] = useState("");
  const anchorRef = useRef<HTMLDivElement>(null);
  const setOpen = (next: boolean) => {
    if (open === next) return;
    setOpenState(next);
    onOpenChange?.(next);
    if (!next) setQuery("");
  };
  const setValue = (next: string) => {
    if (value == null) setInternal(next);
    onValueChange?.(next);
    if (closeOnSelect) setOpen(false);
  };
  return (
    <ComboboxContext.Provider
      value={{
        value: value ?? internal,
        open,
        query,
        shouldFilter,
        closeOnSelect,
        anchorRef,
        setOpen,
        setQuery,
        setValue,
      }}
    >
      <Popover open={open} onOpenChange={setOpen}>
        {children}
      </Popover>
    </ComboboxContext.Provider>
  );
}

export function ComboboxInput({
  showClear: _showClear,
  onPointerDown,
  onFocus,
  onKeyDown,
  onChange,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  showClear?: boolean;
}) {
  const ctx = useContext(ComboboxContext);
  return (
    <PopoverAnchor asChild>
      <div ref={ctx?.anchorRef} className="w-full">
        <Input
          {...props}
          value={props.value ?? ctx?.query ?? ""}
          className={className}
          onPointerDown={(event) => {
            onPointerDown?.(event);
            if (event.defaultPrevented || props.disabled) return;
            if (ctx?.open && props.readOnly) {
              ctx.setOpen(false);
              return;
            }
            ctx?.setOpen(true);
          }}
          onFocus={(event) => {
            onFocus?.(event);
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event);
            if (event.defaultPrevented || props.disabled) return;
            if (event.key === "Escape" && ctx?.open) {
              event.preventDefault();
              ctx.setOpen(false);
              return;
            }
            if ((event.key === "ArrowDown" || event.key === "Enter") && !ctx?.open) {
              ctx?.setOpen(true);
            }
          }}
          onChange={(event) => {
            onChange?.(event);
            if (!event.defaultPrevented) {
              ctx?.setQuery(event.currentTarget.value);
              if (!props.disabled && !ctx?.open) {
                ctx?.setOpen(true);
              }
            }
          }}
        />
      </div>
    </PopoverAnchor>
  );
}

export function ComboboxContent({
  children,
  minWidth,
}: {
  children?: React.ReactNode;
  minWidth?: number;
}) {
  const ctx = useContext(ComboboxContext);
  if (!ctx?.open) return null;
  const anchorElement = ctx.anchorRef.current;
  const inputWidth =
    anchorElement?.querySelector("input")?.getBoundingClientRect().width ??
    anchorElement?.getBoundingClientRect().width;
  const contentMinWidth = inputWidth
    ? Math.max(Math.ceil(inputWidth), minWidth ?? 0)
    : minWidth;
  const ignoreAnchorInteraction = (event: Event) => {
    const target = event.target;
    if (target instanceof Node && ctx.anchorRef.current?.contains(target)) {
      event.preventDefault();
    }
  };
  return (
    <PopoverContent
      align="start"
      sideOffset={4}
      collisionPadding={8}
      className="z-[110] min-w-0 p-0"
      style={{
        width: "max-content",
        minWidth: contentMinWidth,
        maxWidth: "min(420px, calc(100vw - 16px))",
      }}
      onOpenAutoFocus={(event) => event.preventDefault()}
      onInteractOutside={ignoreAnchorInteraction}
    >
      <Command shouldFilter={false}>{children}</Command>
    </PopoverContent>
  );
}

export function ComboboxEmpty({ children }: { children?: React.ReactNode }) {
  return (
    <CommandEmpty className="px-2 py-2 text-xs text-gray-500 dark:text-slate-400">
      {children}
    </CommandEmpty>
  );
}

export function ComboboxList({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <CommandList
      className={cn(
        "max-h-[min(16rem,var(--radix-popover-content-available-height))] overscroll-contain scroll-pb-2 p-1.5",
        className,
      )}
    >
      {children}
    </CommandList>
  );
}

export function ComboboxClose({
  children,
}: {
  children: (close: () => void) => React.ReactNode;
}) {
  const ctx = useContext(ComboboxContext);
  return <>{children(() => ctx?.setOpen(false))}</>;
}

export function ComboboxCollection({
  children,
}: {
  children?: React.ReactNode;
}) {
  return <CommandGroup>{children}</CommandGroup>;
}

export function ComboboxItem({
  value,
  disabled,
  selected: selectedProp,
  children,
}: {
  value: string;
  disabled?: boolean;
  selected?: boolean;
  children?: React.ReactNode;
}) {
  const ctx = useContext(ComboboxContext);
  const selected = selectedProp ?? ctx?.value === value;
  const matchText = useMemo(() => {
    if (typeof children === "string" || typeof children === "number")
      return String(children);
    return String(value);
  }, [children, value]);
  const normalizedQuery = (ctx?.query ?? "").trim().toLowerCase();
  if (ctx?.shouldFilter && normalizedQuery && !matchText.toLowerCase().includes(normalizedQuery)) {
    return null;
  }
  return (
    <CommandItem
      value={value}
      disabled={disabled}
      className={cn(
        "w-full justify-start rounded-md px-2 py-1.5 text-left text-xs text-base-text dark:text-slate-100",
        selected &&
          "bg-primary-50 font-medium text-primary ring-1 ring-inset ring-primary/25 data-[selected=true]:bg-primary-100 data-[selected=true]:text-primary dark:bg-primary/24 dark:text-slate-50 dark:ring-primary/45 dark:data-[selected=true]:bg-primary/30 dark:data-[selected=true]:text-slate-50",
      )}
      onSelect={() => ctx?.setValue(value)}
    >
      <OverflowTooltip
        content={children}
        className="block min-w-0 flex-1 truncate text-left"
      >
        {children}
      </OverflowTooltip>
    </CommandItem>
  );
}
