import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type DivProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
  size?: string;
  variant?: string;
  title?: React.ReactNode;
  extra?: React.ReactNode;
  styles?: { body?: React.CSSProperties; header?: React.CSSProperties };
  bodyStyle?: React.CSSProperties;
};
const make = (name: string, cls: string) => {
  const C = forwardRef<HTMLDivElement, DivProps>(
    (
      {
        className,
        title: _title,
        extra: _extra,
        styles: _styles,
        bodyStyle: _bodyStyle,
        ...props
      },
      ref,
    ) => <div ref={ref} className={cn(cls, className)} {...props} />,
  );
  C.displayName = name;
  return C;
};
export const Card = forwardRef<HTMLDivElement, DivProps>(
  (
    { className, title, extra, children, styles, bodyStyle, size, ...props },
    ref,
  ) => {
    const small = size === "small";
    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden rounded-[10px] border border-border bg-container text-base-text shadow-[var(--shadow-card)] dark:border-border",
          small && "shadow-none",
          className,
        )}
        {...props}
      >
        {title || extra ? (
          <div
            className={cn(
              "flex items-center justify-between border-b border-border py-0",
              small ? "min-h-9 px-3" : "min-h-[52px] px-6",
            )}
            style={styles?.header}
          >
            <div className={cn("font-medium", small ? "text-xs" : "text-sm")}>
              {title}
            </div>
            {extra}
          </div>
        ) : null}
        {title || extra || styles?.body || bodyStyle ? (
          <div
            style={styles?.body ?? bodyStyle}
            className={cn(small ? "px-3 py-2" : "p-2 pb-0")}
          >
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    );
  },
);
Card.displayName = "Card";
export const CardHeader = make("CardHeader", "flex flex-col gap-1.5 p-3");
export const CardTitle = make(
  "CardTitle",
  "text-base font-semibold leading-none",
);
export const CardDescription = make(
  "CardDescription",
  "text-sm text-muted-foreground",
);
export const CardContent = make("CardContent", "p-3 pt-0");
export const CardFooter = make("CardFooter", "flex items-center p-3 pt-0");
export const CardAction = make("CardAction", "ml-auto");
