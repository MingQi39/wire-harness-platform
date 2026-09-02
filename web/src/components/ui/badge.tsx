import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
  {
    variants: {
      variant: {
        default:
          "bg-primary-50 text-primary ring-primary/15 dark:bg-primary/18 dark:text-primary-100 dark:ring-primary/35",
        secondary:
          "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-white/10 dark:text-slate-200 dark:ring-white/16",
        destructive:
          "bg-red-50 text-red-600 ring-red-100 dark:bg-red-500/16 dark:text-red-200 dark:ring-red-400/30",
        outline:
          "bg-white text-slate-600 ring-slate-200 dark:bg-white/6 dark:text-slate-200 dark:ring-white/16",
      },
    },
    defaultVariants: { variant: "secondary" },
  },
);
export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
