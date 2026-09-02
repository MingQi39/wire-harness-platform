import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function isFromAppFloatingContent(event: Event) {
  const originalTarget =
    event instanceof CustomEvent
      ? (event.detail as { originalEvent?: Event } | undefined)?.originalEvent?.target
      : null;
  const target = originalTarget ?? event.target;
  return target instanceof Element
    ? Boolean(target.closest("[data-app-floating-content]"))
    : false;
}

export function DialogContent({
  className,
  children,
  showCloseButton = true,
  onPointerDownOutside,
  onFocusOutside,
  onInteractOutside,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-[100] cursor-auto bg-black/45 dark:bg-black/62" />
      <DialogPrimitive.Content
        data-app-dialog-content
        className={cn(
          "fixed left-1/2 top-1/2 z-[100] flex max-h-[90vh] w-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 cursor-auto flex-col overflow-hidden rounded-lg border border-border bg-container p-5 shadow-lg dark:border-white/12 dark:shadow-black/45",
          className,
        )}
        onPointerDownOutside={(event) => {
          if (isFromAppFloatingContent(event)) event.preventDefault();
          onPointerDownOutside?.(event);
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
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close className="absolute right-3 top-3 rounded text-slate-400 opacity-70 hover:text-slate-600 hover:opacity-100 dark:text-slate-500 dark:hover:text-slate-200">
            <XIcon className="size-4" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "mb-3 flex flex-col gap-1.5 text-base font-semibold",
        className,
      )}
      {...props}
    />
  );
}
export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-4 flex justify-end gap-2", className)} {...props} />
  );
}
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
