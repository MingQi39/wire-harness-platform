import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { isFromAppFloatingContent } from "./dialog";
import { cn } from "@/lib/utils";

type SheetSide = "left" | "right" | "top" | "bottom";

type SheetContentProps = React.ComponentPropsWithoutRef<
  typeof DialogPrimitive.Content
> & {
  side?: SheetSide;
  onClose?: () => void;
  showCloseButton?: boolean;
};

const sheetSideClassName: Record<SheetSide, string> = {
  left: "inset-y-0 left-0 h-full w-[min(90vw,420px)] border-r",
  right: "inset-y-0 right-0 h-full w-[min(90vw,420px)] border-l",
  top: "inset-x-0 top-0 border-b",
  bottom: "inset-x-0 bottom-0 border-t",
};

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

export const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[100] cursor-auto bg-black/35 dark:bg-black/60",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(
  (
    {
      className,
      children,
      side = "right",
      onClose,
      showCloseButton = true,
      onEscapeKeyDown,
      onPointerDownOutside,
      onFocusOutside,
      onInteractOutside,
      ...props
    },
    ref,
  ) => {
    const isMacDesktop =
      typeof window !== "undefined" &&
      window.electronAPI?.platform === "darwin";
    const hasMacTitlebarSafeArea =
      isMacDesktop && (side === "left" || side === "right");
    return (
      <SheetPortal>
        <SheetOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed z-[100] cursor-auto overflow-auto border-border bg-container p-5 text-base-text shadow-lg outline-none dark:bg-slate-950",
            sheetSideClassName[side],
            className,
          )}
          onEscapeKeyDown={(event) => {
            onEscapeKeyDown?.(event);
            if (!event.defaultPrevented) onClose?.();
          }}
          onPointerDownOutside={(event) => {
            if (isFromAppFloatingContent(event)) event.preventDefault();
            onPointerDownOutside?.(event);
            if (!event.defaultPrevented) onClose?.();
          }}
          onFocusOutside={(event) => {
            if (isFromAppFloatingContent(event)) event.preventDefault();
            onFocusOutside?.(event);
          }}
          onInteractOutside={(event) => {
            if (isFromAppFloatingContent(event)) event.preventDefault();
            onInteractOutside?.(event);
          }}
          {...props}
        >
          {hasMacTitlebarSafeArea ? (
            <div className="h-8 shrink-0" aria-hidden="true" />
          ) : null}
          {children}
          {showCloseButton ? (
            <SheetClose asChild>
              <button
                type="button"
                className={cn(
                  "absolute right-2 z-[60] flex size-8 cursor-pointer items-center justify-center rounded-md bg-container/80 text-slate-400 transition-colors hover:bg-muted hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 [&_*]:pointer-events-none dark:bg-slate-950/80 dark:hover:bg-white/10 dark:hover:text-slate-200",
                  hasMacTitlebarSafeArea ? "top-7" : "top-2",
                )}
                aria-label="关闭"
                onClick={() => onClose?.()}
              >
                <XIcon className="pointer-events-none size-4" />
              </button>
            </SheetClose>
          ) : null}
        </DialogPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = DialogPrimitive.Content.displayName;

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4 flex flex-col gap-1.5", className)} {...props} />
  );
}

export function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-4 flex justify-end gap-2", className)} {...props} />
  );
}

export const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-base font-semibold text-slate-950 dark:text-slate-100",
      className,
    )}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

export const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn(
      "text-xs leading-5 text-slate-500 dark:text-slate-400",
      className,
    )}
    {...props}
  />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;
