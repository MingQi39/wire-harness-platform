import { cn } from "@/lib/utils";
export function Alert({
  className,
  type: _type,
  variant: _variant,
  message,
  description,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  type?: string;
  variant?: string;
  showIcon?: boolean;
  message?: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border border-border bg-container p-3 text-sm",
        className,
      )}
      {...props}
    >
      {message ? <AlertTitle>{message}</AlertTitle> : null}
      {description ? <AlertDescription>{description}</AlertDescription> : null}
      {children}
    </div>
  );
}
export function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn("mb-1 font-medium", className)} {...props} />;
}
export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("text-sm text-gray-500 dark:text-slate-400", className)}
      {...props}
    />
  );
}
