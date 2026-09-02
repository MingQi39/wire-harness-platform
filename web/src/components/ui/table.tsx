import { cn } from "@/lib/utils";
type TableProps = React.TableHTMLAttributes<HTMLTableElement> & {
  wrapperClassName?: string;
  wrapperProps?: React.HTMLAttributes<HTMLDivElement>;
};
export function Table({
  className,
  wrapperClassName,
  wrapperProps,
  ...props
}: TableProps) {
  const { className: wrapperPropsClassName, ...restWrapperProps } =
    wrapperProps ?? {};
  return (
    <div
      className={cn("w-full overflow-auto", wrapperClassName, wrapperPropsClassName)}
      {...restWrapperProps}
    >
      <table
        className={cn("w-full caption-bottom text-[13px]", className)}
        {...props}
      />
    </div>
  );
}
export function TableHeader(
  props: React.HTMLAttributes<HTMLTableSectionElement>,
) {
  return <thead {...props} />;
}
export function TableBody(
  props: React.HTMLAttributes<HTMLTableSectionElement>,
) {
  return <tbody {...props} />;
}
export function TableFooter(
  props: React.HTMLAttributes<HTMLTableSectionElement>,
) {
  return <tfoot {...props} />;
}
export function TableRow({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "group transition-colors hover:bg-primary-50/60 data-[selected=true]:bg-primary-100/70 dark:hover:bg-[#1b2a3c] dark:data-[selected=true]:bg-[#264764]",
        className,
      )}
      {...props}
    />
  );
}
export function TableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-[26px] whitespace-nowrap border-b border-primary-100 bg-primary-100 px-2 text-left align-middle text-[13px] font-semibold text-slate-700 dark:border-[#46566b] dark:bg-[#1f2a37] dark:text-[#f3f7fb]",
        className,
      )}
      {...props}
    />
  );
}
export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        "whitespace-nowrap border-b border-border/70 px-2 py-1 align-middle text-[13px] text-slate-600 dark:border-[#2f3b4c] dark:text-[#e7eef7]",
        className,
      )}
      {...props}
    />
  );
}
export function TableCaption({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption
      className={cn(
        "mt-4 text-sm text-slate-500 dark:text-slate-400",
        className,
      )}
      {...props}
    />
  );
}
