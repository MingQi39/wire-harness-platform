import { cn } from "@/lib/utils";
export function FieldGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-3", className)} {...props} />;
}
export function Field({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-0.5", className)} {...props} />;
}
export function FieldLabel({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "flex h-[18px] items-center text-xs font-normal text-base-text",
        className,
      )}
      {...props}
    />
  );
}
export function FieldDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-gray-500", className)} {...props} />;
}
export function FieldError({
  className,
  children,
  errors,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  errors?: Array<{ message?: React.ReactNode } | undefined>;
}) {
  const msg = children ?? errors?.find(Boolean)?.message;
  return (
    <p
      className={cn(
        "min-h-3 text-xs leading-3 text-error",
        !msg && "invisible",
        className,
      )}
      {...props}
    >
      {msg ?? "占位"}
    </p>
  );
}
export function FieldSet({
  className,
  ...props
}: React.FieldsetHTMLAttributes<HTMLFieldSetElement>) {
  return <fieldset className={cn("grid gap-3", className)} {...props} />;
}
export function FieldLegend({
  className,
  ...props
}: React.HTMLAttributes<HTMLLegendElement>) {
  return <legend className={cn("text-sm font-medium", className)} {...props} />;
}
