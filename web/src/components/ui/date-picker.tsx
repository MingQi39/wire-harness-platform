import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
} from "react";
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import dayjs, { type Dayjs } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { UI } from "react-day-picker";
import { cn } from "@/lib/utils";
import { DISPLAY_DATE_FORMAT } from "@/utils/format";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Input } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

dayjs.extend(customParseFormat);

const DEFAULT_DATE_FORMAT = DISPLAY_DATE_FORMAT;
const FALLBACK_PARSE_FORMAT = "YYYY-MM-DD";
const FOCUS_REOPEN_SUPPRESSION_MS = 350;
const YEAR_SELECT_START = 1970;
const YEAR_SELECT_END = 2100;
const YEAR_PANEL_GRID_SIZE = 12;

type DatePickerProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value?: Dayjs | string | null;
  onChange?: (value: Dayjs | null, dateString?: string) => void;
  format?: string;
  allowClear?: boolean;
  showTime?: boolean;
};

function formatDisplayValue(
  value: Dayjs | string | null | undefined,
  format: string,
) {
  if (value == null || value === "") return "";
  if (typeof value !== "string" && "format" in value)
    return value.isValid?.() ? value.format(format) : "";
  const text = String(value).trim();
  if (!text) return "";
  const parsed = dayjs(text, format, true);
  if (parsed.isValid()) return parsed.format(format);
  const fallback = dayjs(text, FALLBACK_PARSE_FORMAT, true);
  if (fallback.isValid()) return fallback.format(format);
  return text;
}

function parseDateInput(raw: string, format: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = dayjs(trimmed, format, true);
  if (parsed.isValid()) return parsed;
  const fallback = dayjs(trimmed, FALLBACK_PARSE_FORMAT, true);
  if (fallback.isValid()) return fallback;
  return undefined;
}

function getDecadeStart(year: number) {
  return Math.floor(year / 10) * 10;
}

export function DatePicker({
  value,
  onChange,
  className,
  format = DEFAULT_DATE_FORMAT,
  disabled,
  readOnly,
  placeholder = DEFAULT_DATE_FORMAT,
  allowClear = true,
  showTime: _showTime,
  ...props
}: DatePickerProps) {
  const displayValue = useMemo(
    () => formatDisplayValue(value, format),
    [format, value],
  );
  const [draftValue, setDraftValue] = useState(displayValue);
  const [isOpen, setIsOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"date" | "year" | "month">("date");
  const [viewMonth, setViewMonth] = useState(() => dayjs().toDate());
  const [yearPanelStart, setYearPanelStart] = useState(() =>
    getDecadeStart(dayjs().year()),
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const suppressFocusOpenRef = useRef(false);
  const suppressFocusOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    setDraftValue(displayValue);
  }, [displayValue]);

  useEffect(() => {
    return () => {
      if (suppressFocusOpenTimerRef.current) {
        clearTimeout(suppressFocusOpenTimerRef.current);
      }
    };
  }, []);

  const selectedDate = useMemo(() => {
    const parsed =
      parseDateInput(draftValue, format) ||
      parseDateInput(displayValue, format);
    return parsed || null;
  }, [displayValue, draftValue, format]);
  const selectedDateKey = selectedDate?.valueOf() ?? null;

  useEffect(() => {
    if (isOpen) return;
    const base = selectedDateKey != null ? dayjs(selectedDateKey) : dayjs();
    setViewMonth(base.toDate());
    setYearPanelStart(getDecadeStart(base.year()));
    setPanelMode("date");
  }, [isOpen, selectedDateKey]);

  const suppressNextFocusOpen = () => {
    suppressFocusOpenRef.current = true;
    if (suppressFocusOpenTimerRef.current) {
      clearTimeout(suppressFocusOpenTimerRef.current);
    }
    suppressFocusOpenTimerRef.current = setTimeout(() => {
      suppressFocusOpenRef.current = false;
      suppressFocusOpenTimerRef.current = null;
    }, FOCUS_REOPEN_SUPPRESSION_MS);
  };

  const closeCalendarPanel = () => {
    suppressNextFocusOpen();
    setPanelMode("date");
    setIsOpen(false);
  };

  const emitParsedValue = (raw: string) => {
    setDraftValue(raw);
    const parsed = parseDateInput(raw, format);
    if (parsed === undefined) return;
    const nextText = parsed ? parsed.format(format) : "";
    setDraftValue(nextText);
    onChange?.(parsed, nextText);
  };

  const selectDate = (date: Date | undefined) => {
    if (!date) return;
    const nextDay = dayjs(date);
    const nextText = nextDay.format(format);
    setDraftValue(nextText);
    onChange?.(nextDay, nextText);
    closeCalendarPanel();
  };

  const clearValue = () => {
    setDraftValue("");
    onChange?.(null, "");
    closeCalendarPanel();
  };

  const viewDay = dayjs(viewMonth);
  const viewYear = viewDay.year();
  const viewMonthIndex = viewDay.month();
  const yearPanelLabelStart = yearPanelStart + 1;
  const yearPanelLabelEnd = yearPanelStart + 10;
  const monthItems = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        month: index,
        label: `${index + 1}月`,
      })),
    [],
  );
  const yearItems = useMemo(
    () =>
      Array.from({ length: YEAR_PANEL_GRID_SIZE }, (_, index) => {
        const year = yearPanelStart - 1 + index;
        const isOutDecade = year < yearPanelLabelStart || year > yearPanelLabelEnd;
        return { year, isOutDecade };
      }),
    [yearPanelLabelEnd, yearPanelLabelStart, yearPanelStart],
  );
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div className="relative w-full">
        <PopoverTrigger asChild>
          <Input
            {...props}
            ref={inputRef}
            type="text"
            value={draftValue}
            disabled={disabled}
            readOnly={readOnly}
            placeholder={placeholder}
            inputMode="numeric"
            className={cn("pr-8", className)}
            onBlur={(event) => {
              props.onBlur?.(event);
              if (
                parseDateInput(event.currentTarget.value, format) === undefined
              ) {
                setDraftValue(displayValue);
              }
            }}
            onPointerDown={(event) => {
              props.onPointerDown?.(event);
              if (event.defaultPrevented) return;
              if (disabled || readOnly) {
                event.preventDefault();
                return;
              }
            }}
            onClick={(event) => {
              props.onClick?.(event);
              if (!event.defaultPrevented && (disabled || readOnly || isOpen)) {
                event.preventDefault();
              }
            }}
            onFocus={(event) => {
              props.onFocus?.(event);
            }}
            onChange={(event) => emitParsedValue(event.currentTarget.value)}
          />
        </PopoverTrigger>
        <CalendarIcon
          className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-500 dark:text-slate-400"
          aria-hidden="true"
        />
      </div>
      <PopoverContent
        align="start"
        sideOffset={4}
        collisionPadding={8}
        className="w-auto p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => {
          if (!suppressFocusOpenRef.current) return;
          event.preventDefault();
          inputRef.current?.focus({ preventScroll: true });
        }}
      >
        <div className="rounded-lg border border-primary/20 bg-container p-2">
          <div className="mb-2 flex items-center justify-between gap-2 whitespace-nowrap">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-slate-500 hover:bg-primary-50 hover:text-primary dark:text-slate-400 dark:hover:bg-primary/14 dark:hover:text-primary-200"
              onClick={() =>
                panelMode === "year"
                  ? setYearPanelStart((prev) => prev - 10)
                  : panelMode === "month"
                    ? setViewMonth(dayjs(viewMonth).subtract(1, "year").toDate())
                  : setViewMonth(dayjs(viewMonth).subtract(1, "month").toDate())
              }
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <div className="flex items-center gap-1 whitespace-nowrap">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-sm font-medium whitespace-nowrap text-slate-700 hover:bg-primary-50 hover:text-primary dark:text-slate-200 dark:hover:bg-primary/14 dark:hover:text-primary-200"
                onClick={() => {
                  setYearPanelStart(getDecadeStart(viewYear));
                  setPanelMode("year");
                }}
              >
                {viewYear}年
                <ChevronDownIcon className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-sm font-medium whitespace-nowrap text-slate-700 hover:bg-primary-50 hover:text-primary dark:text-slate-200 dark:hover:bg-primary/14 dark:hover:text-primary-200"
                onClick={() => setPanelMode("month")}
              >
                {viewMonthIndex + 1}月
                <ChevronDownIcon className="size-3.5" />
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 text-slate-500 hover:bg-primary-50 hover:text-primary dark:text-slate-400 dark:hover:bg-primary/14 dark:hover:text-primary-200"
              onClick={() =>
                panelMode === "year"
                  ? setYearPanelStart((prev) => prev + 10)
                  : panelMode === "month"
                    ? setViewMonth(dayjs(viewMonth).add(1, "year").toDate())
                  : setViewMonth(dayjs(viewMonth).add(1, "month").toDate())
              }
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
          {panelMode === "year" ? (
            <div className="px-1 pb-1 pt-2">
              <div className="mb-4 text-center text-sm font-semibold text-slate-800 dark:text-slate-100">
                {yearPanelLabelStart}年-{yearPanelLabelEnd}年
              </div>
              <div className="grid grid-cols-3 gap-y-3">
                {yearItems.map((item) => {
                  const isDisabled =
                    item.year < YEAR_SELECT_START || item.year > YEAR_SELECT_END;
                  const isSelected = item.year === viewYear;
                  return (
                    <Button
                      key={item.year}
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isDisabled}
                      className={cn(
                        "h-9 rounded-md text-base font-medium",
                        isSelected &&
                          "bg-primary-50 text-primary dark:bg-primary/18 dark:text-primary-200",
                        item.isOutDecade &&
                          "text-slate-400 dark:text-slate-500",
                      )}
                      onClick={() => {
                        setViewMonth(dayjs(viewMonth).year(item.year).toDate());
                        setPanelMode("date");
                      }}
                    >
                      {item.year}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : panelMode === "month" ? (
            <div className="px-1 pb-1 pt-2">
              <div className="mb-4 text-center text-sm font-semibold text-slate-800 dark:text-slate-100">
                {viewYear}年
              </div>
              <div className="grid grid-cols-3 gap-y-3">
                {monthItems.map((item) => {
                  const isSelected = item.month === viewMonthIndex;
                  return (
                    <Button
                      key={item.month}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-9 rounded-md text-base font-medium",
                        isSelected &&
                          "bg-primary-50 text-primary dark:bg-primary/18 dark:text-primary-200",
                      )}
                      onClick={() => {
                        setViewMonth(dayjs(viewMonth).month(item.month).toDate());
                        setPanelMode("date");
                      }}
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <Calendar
              mode="single"
              required
              captionLayout="label"
              hideNavigation
              startMonth={new Date(YEAR_SELECT_START, 0)}
              endMonth={new Date(YEAR_SELECT_END, 11)}
              selected={selectedDate?.toDate()}
              month={viewMonth}
              onMonthChange={setViewMonth}
              onSelect={selectDate}
              className="p-0"
              classNames={{
                [UI.MonthCaption]: "hidden",
                [UI.Nav]: "hidden",
              }}
            />
          )}
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2">
            {allowClear ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-500 hover:bg-primary-50 hover:text-primary dark:text-slate-400 dark:hover:bg-primary/14 dark:hover:text-primary-200"
                onClick={clearValue}
              >
                清除
              </Button>
            ) : (
              <span />
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-slate-500 hover:bg-primary-50 hover:text-primary dark:text-slate-400 dark:hover:bg-primary/14 dark:hover:text-primary-200"
              onClick={() => {
                const today = dayjs();
                setViewMonth(today.toDate());
                setYearPanelStart(getDecadeStart(today.year()));
                selectDate(today.toDate());
              }}
            >
              今天
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
