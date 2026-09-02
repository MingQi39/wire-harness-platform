import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { maybeRenderRichInline } from "@/components/RichInlineText";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

function hasTooltipContent(content: ReactNode) {
  return (
    content !== undefined &&
    content !== null &&
    content !== false &&
    content !== ""
  );
}

export function hasHorizontalOverflow(
  element: Pick<HTMLElement, "scrollWidth" | "clientWidth"> | null,
) {
  if (!element) return false;
  return element.scrollWidth > element.clientWidth;
}

export function supportsInputOverflowTooltipType(type: string | undefined) {
  return ![
    "button",
    "checkbox",
    "color",
    "file",
    "hidden",
    "image",
    "password",
    "radio",
    "range",
    "reset",
    "submit",
  ].includes(type ?? "text");
}

function toPixelValue(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getInputVisibleTextWidth(element: HTMLInputElement) {
  if (typeof window === "undefined") return element.clientWidth;
  const style = window.getComputedStyle(element);
  return Math.max(
    0,
    element.clientWidth -
      toPixelValue(style.paddingLeft) -
      toPixelValue(style.paddingRight),
  );
}

function getInputTextWidth(element: HTMLInputElement, text: string) {
  if (typeof document === "undefined") return undefined;
  const canvas = document.createElement("canvas");
  let context: CanvasRenderingContext2D | null = null;
  try {
    context = canvas.getContext("2d");
  } catch {
    return undefined;
  }
  if (!context) return undefined;

  const style =
    typeof window === "undefined" ? undefined : window.getComputedStyle(element);
  context.font =
    style?.font ||
    `${style?.fontStyle ?? "normal"} ${style?.fontVariant ?? "normal"} ${
      style?.fontWeight ?? "400"
    } ${style?.fontSize ?? "12px"} / ${style?.lineHeight ?? "normal"} ${
      style?.fontFamily ?? "sans-serif"
    }`;

  return context.measureText(text).width;
}

export function hasInputValueHorizontalOverflow(
  element: HTMLInputElement | null,
) {
  if (!element) return false;

  const text = element.value;
  if (!text) return false;

  const textWidth = getInputTextWidth(element, text);
  if (textWidth == null) return hasHorizontalOverflow(element);

  return textWidth > getInputVisibleTextWidth(element) + 1;
}

function isOverflowing(element: HTMLElement | null) {
  if (!element) return false;
  return (
    hasHorizontalOverflow(element) ||
    element.scrollHeight > element.clientHeight
  );
}

export function OverflowTooltip({
  content,
  children,
  className,
  contentClassName,
  force = false,
}: {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  force?: boolean;
}) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const hasContent = hasTooltipContent(content);

  const measure = () => {
    const nextOverflowing =
      hasContent && (force || isOverflowing(triggerRef.current));
    setOverflowing(nextOverflowing);
    return nextOverflowing;
  };

  const showIfOverflowing = () => {
    setOpen(measure());
  };

  useEffect(() => {
    const update = () => {
      const nextOverflowing =
        hasContent && (force || isOverflowing(triggerRef.current));
      setOverflowing(nextOverflowing);
      if (!nextOverflowing) setOpen(false);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [children, force, hasContent]);

  // 把字符串型 children/content 统一升级为白名单富文本（`<i><b><sub><sup>`），
  // 让所有走 OverflowTooltip 的列表 cell、表单浮层、修改记录浮层自动兼容富文本字段，
  // 不再因为缺少 RichInlineText 包裹而在 cell / hover 浮层里出现 `<i>U</i>` 字面值。
  // 非字符串节点原样透传，避免破坏调用方已经搭好的 ReactNode 结构。
  const renderedChildren = maybeRenderRichInline(children);
  const renderedContent = maybeRenderRichInline(content);

  if (!hasContent) {
    return className ? (
      <span className={cn("inline-block max-w-full", className)}>
        {renderedChildren}
      </span>
    ) : (
      <>{renderedChildren}</>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip
        disableHoverableContent={false}
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setOpen(false);
            return;
          }
          setOpen(measure());
        }}
      >
        <TooltipTrigger asChild>
          <span
            ref={triggerRef}
            className={cn(
              "inline-block max-w-full",
              className,
              overflowing && "cursor-pointer",
            )}
            onBlur={() => setOpen(false)}
            onFocus={showIfOverflowing}
            onMouseEnter={showIfOverflowing}
          >
            {renderedChildren}
          </span>
        </TooltipTrigger>
        <TooltipContent
          className={cn(
            "max-w-[520px] whitespace-normal break-words",
            contentClassName,
          )}
        >
          {renderedContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
