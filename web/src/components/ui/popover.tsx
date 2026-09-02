import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;

export const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & {
    container?: HTMLElement | null;
  }
>(({ className, align = "center", sideOffset = 4, container, ...props }, ref) => (
  <PopoverPrimitive.Portal container={container ?? undefined}>
    <PopoverPrimitive.Content
      ref={ref}
      data-app-floating-content=""
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-[110] w-72 rounded-lg border border-primary/20 bg-container p-3 text-base-text shadow-xl shadow-slate-900/12 ring-1 ring-slate-900/5 outline-none dark:border-white/14 dark:bg-[#101923] dark:shadow-black/45 dark:ring-white/10",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export function PopoverHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-1 text-sm", className)} {...props} />
  );
}

export function PopoverTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return <h2 className={cn("font-medium", className)} {...props} />;
}

export function PopoverDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-slate-500 dark:text-slate-400", className)}
      {...props}
    />
  );
}
