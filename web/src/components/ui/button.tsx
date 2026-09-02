import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-xs font-medium leading-none transition-all disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-primary bg-primary text-white shadow-sm shadow-primary/15 hover:bg-primary-600 hover:shadow-md hover:shadow-primary/20 dark:shadow-primary/20",
        success:
          "border border-success bg-success text-white shadow-sm hover:brightness-95",
        destructive: "bg-error text-white shadow-sm hover:opacity-90",
        outline:
          "border border-slate-200 bg-white text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.02)] hover:border-primary hover:bg-primary-50 hover:text-primary active:bg-primary-100 dark:border-white/18 dark:bg-white/7 dark:text-slate-100 dark:hover:border-primary/62 dark:hover:bg-primary/16 dark:hover:text-blue-100",
        brandSoft:
          "border border-primary bg-primary-50 text-primary shadow-[0_1px_1px_rgba(15,23,42,0.02)] hover:bg-primary-100 active:bg-primary-100 dark:border-primary/68 dark:bg-primary/22 dark:text-blue-100 dark:hover:bg-primary/30 dark:hover:text-blue-50",
        secondary:
          "border border-slate-200 bg-white text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.02)] hover:border-primary hover:bg-primary-50 hover:text-primary dark:border-white/18 dark:bg-white/7 dark:text-slate-100 dark:hover:border-primary/58 dark:hover:bg-primary/14 dark:hover:text-blue-100",
        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/12 dark:hover:text-white",
        link: "text-primary underline-offset-4 hover:underline dark:text-blue-200 dark:hover:text-blue-100",
      },
      size: {
        default: "h-[26px] px-2.5 py-0",
        sm: "h-6 px-2 py-0",
        lg: "h-8 px-3",
        icon: "size-[26px] p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
type BaseVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
type BaseSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;
export type ButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> & {
  asChild?: boolean;
  variant?: BaseVariant | "text" | "solid" | "outlined" | string;
  size?:
    | BaseSize
    | "small"
    | "middle"
    | "large"
    | "icon-xs"
    | "icon-sm"
    | string;
  type?:
    | React.ButtonHTMLAttributes<HTMLButtonElement>["type"]
    | "primary"
    | "link"
    | "text"
    | "default";
  htmlType?: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
  icon?: React.ReactNode;
  loading?: boolean;
  danger?: boolean;
  block?: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
};
function normalizeVariant(
  variant?: ButtonProps["variant"],
  type?: ButtonProps["type"],
  danger?: boolean,
): BaseVariant {
  if (
    variant == null &&
    (type == null || type === "button" || type === "submit" || type === "reset")
  )
    return "default";
  if (type === "link" || variant === "link") return "link";
  if (danger) return "destructive";
  if (type === "text" || variant === "text") return "ghost";
  if (type === "primary" || variant === "solid") return "default";
  if (variant === "outlined") return "outline";
  return [
    "default",
    "success",
    "destructive",
    "outline",
    "brandSoft",
    "secondary",
    "ghost",
    "link",
  ].includes(String(variant))
    ? (variant as BaseVariant)
    : "outline";
}
function normalizeSize(size?: ButtonProps["size"]): BaseSize {
  if (size === "small") return "sm";
  if (size === "large") return "lg";
  if (size === "icon-xs" || size === "icon-sm") return "icon";
  return ["default", "sm", "lg", "icon"].includes(String(size))
    ? (size as BaseSize)
    : "default";
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      type,
      htmlType,
      icon,
      loading,
      danger,
      block,
      children,
      title: _title,
      description: _description,
      disabled,
      onClick,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const resolvedType =
      htmlType ??
      (type === "primary" ||
      type === "link" ||
      type === "text" ||
      type === "default"
        ? "button"
        : type);
    const isDisabled = Boolean(disabled || loading);
    if (asChild) {
      return (
        <Comp
          ref={ref}
          {...props}
          aria-disabled={isDisabled || undefined}
          data-disabled={isDisabled || undefined}
          className={cn(
            buttonVariants({
              variant: normalizeVariant(variant, type, danger),
              size: normalizeSize(size),
            }),
            danger &&
              (type === "link" || variant === "link") &&
              "text-error hover:text-error",
            block && "w-full",
            className,
          )}
          onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
            if (isDisabled) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }
            onClick?.(event);
          }}
        >
          {children}
        </Comp>
      );
    }
    return (
      <Comp
        ref={ref}
        {...props}
        type={resolvedType ?? "button"}
        disabled={isDisabled}
        className={cn(
          buttonVariants({
            variant: normalizeVariant(variant, type, danger),
            size: normalizeSize(size),
          }),
          danger &&
            (type === "link" || variant === "link") &&
            "text-error hover:text-error",
          block && "w-full",
          className,
        )}
        onClick={onClick}
      >
        {loading ? (
          <Spinner data-icon="inline-start" />
        ) : (
          icon
        )}
        {children}
      </Comp>
    );
  },
);
Button.displayName = "Button";
