import { useMemo, useState, type ReactNode } from "react";
import { ChevronDownIcon, XIcon } from "lucide-react";

import {
  Combobox,
  ComboboxCollection,
  ComboboxClose,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { chainSelectOpenChange } from "@/hooks/chainSelectOpenChange";

export type ApiSelectOption = { label?: ReactNode; value?: string | number | boolean; disabled?: boolean }
export type ApiSelectProps<ValueType = unknown> = {
  value?: ValueType
  options?: readonly ApiSelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  refetchOnOpen?: () => unknown
  onOpenChange?: (open: boolean) => void
  onChange?: (value: ValueType) => void
  onOptionSelect?: (value: ValueType) => void
  onSearch?: (value: string) => void
  allowClear?: boolean
  showSearch?: boolean
  closeOnSelect?: boolean
  loading?: boolean
  filterOption?: boolean | ((input: string, option?: ApiSelectOption) => boolean)
  allowCustomValue?: boolean
  mode?: "multiple"
  notFoundContent?: ReactNode
  dropdownMinWidth?: number
  [key: string]: unknown
}

/**
 * 选项依赖接口的 Select：每次展开下拉时执行 refetchOnOpen（如 React Query refetch），再调用原有 onOpenChange。
 * 与 {@link FormFields} 中 `type: "select"` 的 `refetchOnOpen` 语义一致。
 */
export function ApiSelect<ValueType = unknown>(props: ApiSelectProps<ValueType>) {
  const { refetchOnOpen, onOpenChange, onChange, onOptionSelect, onSearch, options, value, className, disabled, placeholder, allowClear, showSearch, closeOnSelect, loading, filterOption, allowCustomValue, mode, notFoundContent, dropdownMinWidth } = props;
  const [searchValue, setSearchValue] = useState("");
  const [open, setOpen] = useState(false);
  const mergedOnOpenChange =
    refetchOnOpen != null ? chainSelectOpenChange(refetchOnOpen, onOpenChange) : onOpenChange;
  const optionMap = useMemo(() => {
    const map = new Map<string, ApiSelectOption>();
    for (const option of options ?? []) map.set(String(option.value), option);
    return map;
  }, [options]);
  const isMultiple = mode === "multiple";
  const shouldCloseOnSelect = closeOnSelect ?? !isMultiple;
  const selectedKeys = isMultiple
    ? (Array.isArray(value) ? value.map(String) : [])
    : value == null || value === "" ? [] : [String(value)];
  const selectedValueByKey = useMemo(() => {
    const map = new Map<string, unknown>();
    if (Array.isArray(value)) {
      for (const item of value) map.set(String(item), item);
    }
    return map;
  }, [value]);
  const selectedKey = selectedKeys[0];
  const selectedLabelText = selectedKeys
    .map((key) => {
      const option = optionMap.get(key);
      const label = option?.label ?? option?.value ?? key;
      return typeof label === "string" || typeof label === "number" || typeof label === "boolean" ? String(label) : key;
    })
    .filter(Boolean)
    .join(", ");
  const displayValue = open
    ? isMultiple ? searchValue : searchValue || selectedLabelText
    : selectedLabelText;
  const visibleOptions = useMemo(() => {
    const list = options ?? [];
    if (!searchValue || filterOption === false || onSearch) return list;
    if (typeof filterOption === "function") return list.filter((option) => filterOption(searchValue, option));
    return list.filter((option) => String(option.label ?? option.value ?? "").toLowerCase().includes(searchValue.toLowerCase()));
  }, [filterOption, onSearch, options, searchValue]);
  const normalizedSearchValue = searchValue.trim();
  const canCreateCustomValue = useMemo(() => {
    if (!allowCustomValue || isMultiple || !normalizedSearchValue) return false;
    const needle = normalizedSearchValue.toLowerCase();
    return !visibleOptions.some((option) => {
      const label = String(option.label ?? option.value ?? "").trim().toLowerCase();
      const optionValue = String(option.value ?? "").trim().toLowerCase();
      return label === needle || optionValue === needle;
    });
  }, [allowCustomValue, isMultiple, normalizedSearchValue, visibleOptions]);
  const emitChange = (nextKey: string | undefined) => {
    if (disabled) return;
    setSearchValue("");
    if (nextKey == null || nextKey === "") {
      onChange?.((isMultiple ? [] : undefined) as ValueType);
      return;
    }
    if (isMultiple) {
      const nextKeys = selectedKeys.includes(nextKey)
        ? selectedKeys.filter((key) => key !== nextKey)
        : [...selectedKeys, nextKey];
      const nextValue = nextKeys.map((key) => optionMap.get(key)?.value ?? selectedValueByKey.get(key) ?? key) as ValueType;
      onOptionSelect?.(nextValue);
      onChange?.(nextValue);
      return;
    }
    if (allowCustomValue) {
      const nextValue = (optionMap.get(nextKey)?.value ?? nextKey) as ValueType;
      onOptionSelect?.(nextValue);
      onChange?.(nextValue);
      return;
    }
    const nextValue = optionMap.get(nextKey)?.value as ValueType;
    onOptionSelect?.(nextValue);
    onChange?.(nextValue);
  };
  const commitCustomValue = () => {
    if (!canCreateCustomValue) return;
    emitChange(normalizedSearchValue);
    if (shouldCloseOnSelect) setOpen(false);
  };
  const hasSelectedDisplayValue = selectedLabelText.trim() !== "";
  const showClearButton = allowClear && !disabled && hasSelectedDisplayValue;
  const displayTitle = !open && displayValue ? displayValue : undefined;
  const hasRenderableOptions = visibleOptions.length > 0 || canCreateCustomValue;
  return (
    <Combobox
      value={selectedKey}
      onValueChange={emitChange}
      shouldFilter={false}
      closeOnSelect={shouldCloseOnSelect}
      onOpenChange={
        disabled
          ? undefined
          : (nextOpen) => {
              setOpen(nextOpen);
              if (!nextOpen) setSearchValue("");
              mergedOnOpenChange?.(nextOpen);
            }
      }
    >
      <div className="group relative w-full min-w-0">
        <ComboboxInput
          className={`pr-8 ${className ?? ""}`.trim()}
          disabled={disabled}
          placeholder={placeholder}
          readOnly={!showSearch && !onSearch}
          title={displayTitle}
          value={displayValue}
          onChange={(event) => {
            const next = event.target.value;
            setSearchValue(next);
            onSearch?.(next);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && canCreateCustomValue) {
              event.preventDefault();
              commitCustomValue();
            }
          }}
          showClear
        />
        {showClearButton ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="清空"
            className="pointer-events-none absolute right-1.5 top-1/2 z-10 size-5 -translate-y-1/2 rounded-sm text-slate-400 opacity-0 transition-opacity hover:bg-transparent hover:text-slate-600 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100 dark:text-slate-500 dark:hover:text-slate-300 [&_svg]:size-3"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
              emitChange(undefined);
            }}
          >
            <XIcon className="size-3" aria-hidden="true" />
          </Button>
        ) : null}
        <ChevronDownIcon
          className={`pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400 transition dark:text-slate-500 ${open ? "rotate-180" : ""} ${showClearButton ? "group-focus-within:opacity-0 group-hover:opacity-0" : ""}`}
        />
      </div>
      <ComboboxContent minWidth={dropdownMinWidth}>
        {loading ? <ComboboxEmpty>加载中...</ComboboxEmpty> : null}
        {!loading && !hasRenderableOptions ? <ComboboxEmpty>{notFoundContent ?? "暂无数据"}</ComboboxEmpty> : null}
        <ComboboxList
          className={
            isMultiple
              ? "max-h-[min(16rem,calc(var(--radix-popover-content-available-height)-3.25rem))]"
              : undefined
          }
        >
          <ComboboxCollection>
            {!loading && canCreateCustomValue ? (
              <ComboboxItem value={normalizedSearchValue}>
                使用 "{normalizedSearchValue}"
              </ComboboxItem>
            ) : null}
            {visibleOptions.map((option) => (
              <ComboboxItem
                key={String(option.value)}
                value={String(option.value)}
                disabled={option.disabled}
                selected={selectedKeys.includes(String(option.value))}
              >
                {option.label ?? String(option.value)}
              </ComboboxItem>
            ))}
          </ComboboxCollection>
        </ComboboxList>
        {isMultiple ? (
          <div className="border-t border-border bg-container p-2">
            <ComboboxClose>
              {(close) => (
                <Button
                  type="button"
                  className="w-full"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={close}
                >
                  确定
                </Button>
              )}
            </ComboboxClose>
          </div>
        ) : null}
      </ComboboxContent>
    </Combobox>
  )
}
