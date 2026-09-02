import { InboxIcon, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type EmptySize = "sm" | "md" | "lg";

/**
 * `variant` 控制外层包裹样式：
 *   - default / bare：透明背景，适合嵌入表格、卡片、抽屉等已有容器
 *   - card：带虚线边框 + 浅底色，适合在裸露区域单独占位
 */
export type EmptyVariant = "default" | "card" | "bare";

const SIZE_TOKENS: Record<
  EmptySize,
  {
    wrapper: string;
    iconWrap: string;
    icon: string;
    title: string;
    description: string;
    gap: string;
  }
> = {
  sm: {
    wrapper: "min-h-20 py-3",
    iconWrap: "size-9",
    icon: "size-[18px]",
    title: "text-xs",
    description: "text-[11px] leading-snug",
    gap: "gap-1.5",
  },
  md: {
    wrapper: "min-h-28 py-6",
    iconWrap: "size-11",
    icon: "size-5",
    title: "text-sm",
    description: "text-xs leading-relaxed",
    gap: "gap-2",
  },
  lg: {
    wrapper: "min-h-40 py-8",
    iconWrap: "size-14",
    icon: "size-6",
    title: "text-base",
    description: "text-sm leading-relaxed",
    gap: "gap-2.5",
  },
};

export interface EmptyProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** 自定义图标节点；优先级最高 */
  icon?: ReactNode;
  /** 传入 lucide 图标组件，自动套上圆形浅色底 */
  Icon?: LucideIcon;
  /** 是否隐藏图标，适合极简场景 */
  hideIcon?: boolean;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  variant?: EmptyVariant;
  size?: EmptySize;
}

export function Empty({
  className,
  icon,
  Icon,
  hideIcon,
  title = "暂无数据",
  description,
  action,
  variant = "default",
  size = "md",
  children,
  ...props
}: EmptyProps) {
  const tokens = SIZE_TOKENS[size];
  const variantClass =
    variant === "card"
      ? "rounded-lg border border-dashed border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/5"
      : "bg-transparent";

  const renderedIcon = hideIcon
    ? null
    : (icon ??
      (Icon ? (
        <Icon
          aria-hidden
          className={cn("text-slate-400 dark:text-slate-300", tokens.icon)}
        />
      ) : (
        <InboxIcon
          aria-hidden
          className={cn("text-slate-400 dark:text-slate-300", tokens.icon)}
        />
      )));

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center justify-center px-4 text-center",
        tokens.wrapper,
        tokens.gap,
        variantClass,
        className,
      )}
      {...props}
    >
      {renderedIcon ? (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-slate-100/90 ring-1 ring-inset ring-slate-200/70 dark:bg-white/10 dark:ring-white/10",
            tokens.iconWrap,
          )}
        >
          {renderedIcon}
        </span>
      ) : null}
      {children ? (
        children
      ) : (
        <>
          {title ? (
            <span
              className={cn(
                "font-medium text-slate-600 dark:text-slate-200",
                tokens.title,
              )}
            >
              {title}
            </span>
          ) : null}
          {description ? (
            <span
              className={cn(
                "max-w-xs text-slate-400 dark:text-slate-500",
                tokens.description,
              )}
            >
              {description}
            </span>
          ) : null}
          {action ? <div className="mt-1">{action}</div> : null}
        </>
      )}
    </div>
  );
}

export function EmptyHeader(props: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} />;
}
export function EmptyTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-sm font-medium text-slate-700 dark:text-slate-100",
        className,
      )}
      {...props}
    />
  );
}
export function EmptyDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-slate-500", className)} {...props} />;
}
