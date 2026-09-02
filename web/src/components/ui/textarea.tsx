import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-[60px] w-full rounded-md border border-border bg-container px-2 py-1 text-xs text-base-text outline-none placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/14 dark:bg-[#101923] dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:ring-primary/20 dark:disabled:bg-white/6 dark:disabled:text-slate-500",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
