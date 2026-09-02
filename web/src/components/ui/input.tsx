import {
  forwardRef,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
import {
  hasInputValueHorizontalOverflow,
  supportsInputOverflowTooltipType,
} from "./overflow-tooltip";
import { RichInlineText } from "@/components/RichInlineText";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  overflowTooltip?: boolean;
  overflowTooltipContent?: ReactNode;
  overflowTooltipContentClassName?: string;
};

function setForwardedRef<T>(ref: Ref<T>, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }
  if (ref) ref.current = value;
}

function hasTooltipContent(content: ReactNode) {
  return (
    content !== undefined &&
    content !== null &&
    content !== false &&
    content !== ""
  );
}

/**
 * 仅对「白名单内联富文本（i/b/sub/sup）」做轻量字符串识别——和 RichInlineText 的解析保持对称。
 * 用来决定 disabled/readOnly Input 是否需要叠一层 RichInlineText 视图，避免原生 input 在
 * 「`<i>U</i>=5HLD`」这样的回显值上露出 HTML 字面值（用户报「数据里看到 html 标签」的根因之一）。
 */
function valueContainsInlineRichText(raw: unknown): boolean {
  if (typeof raw !== "string" || !raw || raw.indexOf("<") < 0) return false;
  return /<\/?(?:i|b|sub|sup)\s*>/i.test(raw);
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      overflowTooltip,
      overflowTooltipContent,
      overflowTooltipContentClassName,
      type,
      value,
      defaultValue,
      disabled,
      readOnly,
      ...props
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [tooltipOpen, setTooltipOpen] = useState(false);
    const [currentTooltipContent, setCurrentTooltipContent] =
      useState<ReactNode>(null);
    const initialTooltipContent =
      overflowTooltipContent ?? String(value ?? defaultValue ?? "");
    const shouldEnableOverflowTooltip =
      (overflowTooltip ?? true) && supportsInputOverflowTooltipType(type);

    const getTooltipContent = () =>
      overflowTooltipContent ?? inputRef.current?.value ?? "";

    const showOverflowTooltip = () => {
      const nextTooltipContent = getTooltipContent();
      if (!hasTooltipContent(nextTooltipContent)) {
        setTooltipOpen(false);
        return;
      }
      setCurrentTooltipContent(nextTooltipContent);
      setTooltipOpen(hasInputValueHorizontalOverflow(inputRef.current));
    };
    const hideOverflowTooltip = () => setTooltipOpen(false);

    // 只在 disabled/readOnly 时叠加富文本视图：编辑态保持原生 input 的 caret / IME / 受控行为不变；
    // 仅当 value 实际含 i/b/sub/sup 时才包一层 overlay，纯文本时零开销。
    const showRichOverlay =
      (Boolean(disabled) || Boolean(readOnly)) &&
      supportsInputOverflowTooltipType(type) &&
      valueContainsInlineRichText(value);

    const input = (
      <input
        ref={(node) => {
          inputRef.current = node;
          setForwardedRef(ref, node);
        }}
        type={type}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        readOnly={readOnly}
        className={cn(
          "h-[26px] w-full rounded-md border border-border bg-container px-2 py-0 text-xs text-base-text shadow-none outline-none transition placeholder:text-slate-400 hover:border-primary-300 focus:border-primary focus:bg-container focus:ring-2 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-muted disabled:text-slate-400 dark:border-white/14 dark:bg-[#101923] dark:text-slate-100 dark:placeholder:text-slate-400 dark:hover:border-primary/55 dark:focus:ring-primary/20 dark:disabled:bg-white/6 dark:disabled:text-slate-500",
          // 富文本叠层模式下让原生 input 文字变透明（保留 caret/选区 DOM 行为），由覆盖层负责展示。
          showRichOverlay && "text-transparent caret-transparent selection:bg-transparent",
          className,
        )}
        {...props}
      />
    );

    // disabled/readOnly + 含 i/b/sub/sup 时叠加 RichInlineText 视图。
    // 用 `pointer-events-none` 让事件透传到底层 input，保持 focus/tab 顺序不变；
    // 与 input 同 padding（px-2）以避免视觉错位。
    const wrappedInput = showRichOverlay ? (
      <span className="relative inline-flex w-full min-w-0 align-middle">
        {input}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center overflow-hidden truncate px-2 text-xs",
            disabled ? "text-slate-400 dark:text-slate-500" : "text-base-text dark:text-slate-100",
          )}
        >
          <RichInlineText value={typeof value === "string" ? value : String(value ?? "")} />
        </span>
      </span>
    ) : (
      input
    );

    if (!shouldEnableOverflowTooltip) return wrappedInput;

    return (
      <TooltipProvider>
        <Tooltip
          open={tooltipOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) hideOverflowTooltip();
          }}
        >
          <TooltipTrigger asChild>
            <span
              className={cn(
                "inline-flex w-full min-w-0",
                disabled && "cursor-not-allowed",
              )}
              tabIndex={
                disabled && hasTooltipContent(initialTooltipContent)
                  ? 0
                  : undefined
              }
              onBlur={hideOverflowTooltip}
              onFocus={showOverflowTooltip}
              onMouseEnter={showOverflowTooltip}
              onMouseLeave={hideOverflowTooltip}
            >
              {wrappedInput}
            </span>
          </TooltipTrigger>
          <TooltipContent
            className={cn(
              "max-w-[520px] whitespace-normal break-words",
              overflowTooltipContentClassName,
            )}
          >
            {/* Tooltip 显示的也走富文本，避免 hover 浮层依然出现 `<i>U</i>` 字面值 */}
            {typeof (currentTooltipContent ?? initialTooltipContent) === "string"
              ? (
                <RichInlineText
                  value={String(currentTooltipContent ?? initialTooltipContent)}
                />
              )
              : (currentTooltipContent ?? initialTooltipContent)}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
);
Input.displayName = "Input";
