import * as React from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

export function Pagination({
  className,
  ...props
}: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

export const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
));
PaginationContent.displayName = "PaginationContent";

export const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const PaginationLink = React.forwardRef<
  HTMLButtonElement,
  PaginationLinkProps
>(({ className, isActive, size = "icon", ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }),
      "h-7 min-w-7 px-2 text-xs",
      isActive
        ? "border-primary bg-container text-primary shadow-sm dark:border-primary/70 dark:bg-primary/22 dark:text-blue-50 dark:shadow-[0_0_0_1px_rgba(79,156,255,0.12)]"
        : "text-gray-600 hover:border-primary/40 hover:text-primary dark:text-slate-300 dark:hover:border-primary/55 dark:hover:text-primary-200",
      className,
    )}
    {...props}
  />
));
PaginationLink.displayName = "PaginationLink";

export const PaginationPrevious = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof PaginationLink> & { text?: React.ReactNode }
>(({ className, text, ...props }, ref) => (
  <PaginationLink
    ref={ref}
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 px-2.5", className)}
    {...props}
  >
    <ChevronLeftIcon className="size-3.5" />
    {text ? <span>{text}</span> : null}
  </PaginationLink>
));
PaginationPrevious.displayName = "PaginationPrevious";

export const PaginationNext = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof PaginationLink> & { text?: React.ReactNode }
>(({ className, text, ...props }, ref) => (
  <PaginationLink
    ref={ref}
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 px-2.5", className)}
    {...props}
  >
    {text ? <span>{text}</span> : null}
    <ChevronRightIcon className="size-3.5" />
  </PaginationLink>
));
PaginationNext.displayName = "PaginationNext";

export function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-7 w-7 items-center justify-center text-gray-400 dark:text-slate-500",
        className,
      )}
      {...props}
    >
      <MoreHorizontalIcon className="size-3.5" />
      <span className="sr-only">More pages</span>
    </span>
  );
}
