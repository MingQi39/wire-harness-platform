import { cn } from "@/lib/utils";
export function Progress({
  value,
  percent,
  className,
}: {
  value?: number;
  percent?: number;
  status?: string;
  className?: string;
}) {
  const v = value ?? percent ?? 0;
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-primary-100",
        className,
      )}
    >
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${Math.max(0, Math.min(100, v))}%` }}
      />
    </div>
  );
}
