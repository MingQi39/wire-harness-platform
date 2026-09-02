import * as React from "react";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import {
  DayFlag,
  DayPicker,
  SelectionState,
  UI,
  getDefaultClassNames,
  type DayButton,
} from "react-day-picker";
import { zhCN } from "react-day-picker/locale";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "./button";

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  locale,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?:
    | "default"
    | "success"
    | "destructive"
    | "outline"
    | "brandSoft"
    | "secondary"
    | "ghost"
    | "link";
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      locale={locale ?? zhCN}
      className={cn("bg-container p-2", className)}
      formatters={{
        formatMonthDropdown: (date) => `${date.getMonth() + 1}月`,
        ...formatters,
      }}
      classNames={{
        [UI.Root]: cn("w-fit", defaultClassNames[UI.Root]),
        [UI.Months]: cn(
          "relative flex flex-col gap-4",
          defaultClassNames[UI.Months],
        ),
        [UI.Month]: cn(
          "flex w-full flex-col gap-2",
          defaultClassNames[UI.Month],
        ),
        [UI.Nav]: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
          defaultClassNames[UI.Nav],
        ),
        [UI.PreviousMonthButton]: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-7 p-0 aria-disabled:opacity-50",
          defaultClassNames[UI.PreviousMonthButton],
        ),
        [UI.NextMonthButton]: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-7 p-0 aria-disabled:opacity-50",
          defaultClassNames[UI.NextMonthButton],
        ),
        [UI.MonthCaption]: cn(
          "flex h-7 w-full items-center justify-center px-7",
          defaultClassNames[UI.MonthCaption],
        ),
        [UI.CaptionLabel]: cn(
          "text-sm font-medium",
          defaultClassNames[UI.CaptionLabel],
        ),
        [UI.Dropdowns]: cn(
          "flex h-7 w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames[UI.Dropdowns],
        ),
        [UI.DropdownRoot]: cn(
          "relative rounded-md border border-border bg-container shadow-sm",
          defaultClassNames[UI.DropdownRoot],
        ),
        [UI.Dropdown]: cn(
          "absolute inset-0 opacity-0",
          defaultClassNames[UI.Dropdown],
        ),
        [UI.MonthGrid]: "w-full border-collapse",
        [UI.Weekdays]: cn("flex", defaultClassNames[UI.Weekdays]),
        [UI.Weekday]: cn(
          "flex-1 text-center text-[11px] font-normal text-slate-500 select-none dark:text-slate-400",
          defaultClassNames[UI.Weekday],
        ),
        [UI.Week]: cn("mt-1 flex w-full", defaultClassNames[UI.Week]),
        [UI.Day]: cn(
          "group/day relative h-8 w-8 p-0 text-center select-none",
          defaultClassNames[UI.Day],
        ),
        [SelectionState.range_start]: cn(
          "rounded-l-md bg-primary text-white",
          defaultClassNames[SelectionState.range_start],
        ),
        [SelectionState.range_middle]: cn(
          "rounded-none bg-primary-50 text-primary dark:bg-primary/18 dark:text-primary-200",
          defaultClassNames[SelectionState.range_middle],
        ),
        [SelectionState.range_end]: cn(
          "rounded-r-md bg-primary text-white",
          defaultClassNames[SelectionState.range_end],
        ),
        [DayFlag.today]: cn(
          "bg-primary-50 text-primary dark:bg-primary/18 dark:text-primary-200",
          defaultClassNames[DayFlag.today],
        ),
        [DayFlag.outside]: cn(
          "text-slate-400 dark:text-slate-500",
          defaultClassNames[DayFlag.outside],
        ),
        [DayFlag.disabled]: cn(
          "text-slate-400 opacity-50 dark:text-slate-500",
          defaultClassNames[DayFlag.disabled],
        ),
        [DayFlag.hidden]: cn("invisible", defaultClassNames[DayFlag.hidden]),
        ...classNames,
      }}
      components={{
        Chevron: ({ className: iconClassName, orientation, ...iconProps }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon
                className={cn("size-4", iconClassName)}
                {...iconProps}
              />
            );
          }
          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", iconClassName)}
                {...iconProps}
              />
            );
          }
          return (
            <ChevronDownIcon
              className={cn("size-4", iconClassName)}
              {...iconProps}
            />
          );
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "size-8 rounded-md text-xs font-normal data-[range-end=true]:rounded-r-md data-[range-end=true]:bg-primary data-[range-end=true]:text-white data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-primary-50 data-[range-middle=true]:text-primary data-[range-start=true]:rounded-l-md data-[range-start=true]:bg-primary data-[range-start=true]:text-white data-[selected-single=true]:bg-primary data-[selected-single=true]:text-white dark:data-[range-middle=true]:bg-primary/18 dark:data-[range-middle=true]:text-primary-200",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}
