/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "./alert";
import { Badge } from "./badge";
import { Empty as EmptyState } from "./empty";
import {
  Button as UiButton,
  buttonVariants,
  type ButtonProps as UiButtonProps,
} from "./button";
import { Card as UiCard } from "./card";
import { Input as UiInput } from "./input";
import { DatePicker } from "./date-picker";
import { Textarea } from "./textarea";
import { Progress as UiProgress } from "./progress";
import { Spinner } from "./spinner";
import { ApiSelect } from "@/components/ApiSelect";
import { maybeRenderRichInline } from "@/components/RichInlineText";
import {
  hasInputValueHorizontalOverflow,
  OverflowTooltip,
  supportsInputOverflowTooltipType,
} from "./overflow-tooltip";
import {
  Tooltip as PrimitiveTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";
import * as PrimitiveTabs from "./tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "./sheet";
import {
  Pagination as UiPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";
import {
  Table as UiTable,
  TableBody as UiTableBody,
  TableCell as UiTableCell,
  TableHead as UiTableHead,
  TableHeader as UiTableHeader,
  TableRow as UiTableRow,
} from "./table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";
import { Checkbox as PrimitiveCheckbox } from "./checkbox";
import {
  RadioGroup as PrimitiveRadioGroup,
  RadioGroupItem as PrimitiveRadioGroupItem,
} from "./radio-group";
import { Switch as PrimitiveSwitch } from "./switch";

export { DatePicker } from "./date-picker";
export { Spinner } from "./spinner";

type AnyRecord = Record<string, unknown>;
type NamePath = string | number | Array<string | number>;
type FormRule = {
  required?: boolean;
  message?: string;
  min?: number;
  max?: number;
  type?: string;
  validator?: (rule: FormRule, value: any) => void | Promise<void>;
};
type FieldMeta = {
  name: NamePath;
  label?: React.ReactNode;
  rules?: FormRule | FormRule[];
};
export type Key = React.Key;
export type UploadFile<T = unknown> = {
  uid?: string;
  name?: string;
  status?: string;
  url?: string;
  originFileObj?: File;
  response?: T;
  [key: string]: unknown;
};
export type DataNode = {
  key: Key;
  title?: React.ReactNode;
  children?: DataNode[];
  [key: string]: unknown;
};
export type TreeProps<T extends DataNode = DataNode> = {
  treeData?: T[];
  checkedKeys?: Key[] | { checked: Key[]; halfChecked: Key[] };
  selectedKeys?: Key[];
  expandedKeys?: Key[];
  checkable?: boolean;
  onCheck?: (
    keys: Key[] | { checked: Key[]; halfChecked: Key[] },
    info?: unknown,
  ) => void;
  onSelect?: (keys: Key[], info?: unknown) => void;
  onExpand?: (keys: Key[]) => void;
  className?: string;
  [key: string]: any;
};
export type ColumnsType<T = unknown> = ColumnType<T>[];
export type ColumnType<T = unknown> = {
  key?: Key;
  title?: React.ReactNode;
  dataIndex?: string | number | Array<string | number>;
  width?: number | string;
  align?: "left" | "center" | "right";
  fixed?: "left" | "right" | boolean;
  ellipsis?: boolean | object;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  onCell?: (record: T, rowIndex?: number) => React.HTMLAttributes<HTMLElement>;
  [key: string]: unknown;
};
export type TablePaginationConfig = {
  current?: number;
  pageSize?: number;
  total?: number;
  onChange?: (page: number, pageSize: number) => void;
  showSizeChanger?: boolean;
  pageSizeOptions?: number[];
  showTotal?: (total: number) => React.ReactNode;
  size?: "small" | "middle" | "large";
  [key: string]: unknown;
};
export type TableProps<T = unknown> = {
  columns?: ColumnsType<T>;
  dataSource?: T[];
  rowKey?: string | ((record: T) => Key);
  loading?: boolean;
  pagination?: false | TablePaginationConfig;
  rowSelection?: {
    type?: "checkbox" | "radio";
    selectedRowKeys?: Key[];
    onChange?: (keys: Key[], rows: T[]) => void;
    columnWidth?: number;
    fixed?: boolean;
    preserveSelectedRowKeys?: boolean;
    [key: string]: any;
  };
  onRow?: (
    record: T,
    index?: number,
  ) => React.HTMLAttributes<HTMLTableRowElement>;
  rowClassName?: string | ((record: T, index: number) => string);
  className?: string;
  size?: "small" | "middle" | "large";
  bordered?: boolean;
  scroll?: { x?: number | string | true; y?: number | string };
  [key: string]: unknown;
};
export type FormInstance<_T = any> = {
  getFieldValue: (name: NamePath) => any;
  getFieldsValue: () => any;
  setFieldValue: (name: NamePath, value: any) => void;
  setFieldsValue: (values: any) => void;
  setFields: (
    fields: Array<{
      name: NamePath;
      value?: unknown;
      touched?: boolean;
      errors?: string[];
    }>,
  ) => void;
  submit: () => void;
  resetFields: () => void;
  validateFields: () => Promise<any>;
  scrollToField: () => void;
  focusField: () => void;
  getFieldInstance: () => undefined;
  isFieldTouched: (name: NamePath) => boolean;
};
type FormStore = {
  values: AnyRecord;
  setValues: React.Dispatch<React.SetStateAction<AnyRecord>>;
  errors: Record<string, string[]>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  fields: Map<string, FieldMeta>;
  touched: Set<string>;
  submit?: () => void;
};
const TABLE_MULTIPLE_SELECTION_COLUMN_WIDTH_PX = 32;
const TABLE_SINGLE_SELECTION_COLUMN_WIDTH_PX = 28;
const FormContext = createContext<(FormInstance & FormStore) | null>(null);
const ModalTableDefaultsContext = createContext(false);
function pathParts(name: NamePath | undefined): Array<string | number> {
  if (Array.isArray(name)) return name;
  return name == null ? [] : [name];
}
function pathKey(name: NamePath | undefined) {
  return pathParts(name).join(".");
}
function getValue(values: AnyRecord, name: NamePath | undefined) {
  const parts = pathParts(name);
  return parts.reduce<any>(
    (acc, part) =>
      acc != null && typeof acc === "object" ? acc[part] : undefined,
    values,
  );
}
function setValueAtPath(
  values: AnyRecord,
  name: NamePath,
  value: unknown,
): AnyRecord {
  const parts = pathParts(name);
  if (parts.length === 0) return values;
  const next: AnyRecord = { ...values };
  let cursor: AnyRecord = next;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i]!;
    const current = cursor[key];
    cursor[key] =
      current != null && typeof current === "object"
        ? { ...(current as AnyRecord) }
        : {};
    cursor = cursor[key] as AnyRecord;
  }
  cursor[parts[parts.length - 1]!] = value;
  return next;
}
function isEmptyValue(value: unknown) {
  return (
    value == null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}
async function validateField(meta: FieldMeta, value: unknown) {
  const rules = Array.isArray(meta.rules)
    ? meta.rules
    : meta.rules
      ? [meta.rules]
      : [];
  const errors: string[] = [];
  for (const rule of rules) {
    if (rule.required && isEmptyValue(value)) {
      errors.push(
        rule.message ??
          `${typeof meta.label === "string" ? meta.label : "该字段"}不能为空`,
      );
      continue;
    }
    if (
      rule.type === "email" &&
      !isEmptyValue(value) &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))
    ) {
      errors.push(rule.message ?? "邮箱格式不正确");
    }
    if (rule.type === "number" && !isEmptyValue(value)) {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) {
        errors.push(rule.message ?? "请输入数字");
        continue;
      }
      if (rule.min != null && numericValue < rule.min) {
        errors.push(rule.message ?? `不能小于 ${rule.min}`);
      }
      if (rule.max != null && numericValue > rule.max) {
        errors.push(rule.message ?? `不能大于 ${rule.max}`);
      }
      continue;
    }
    if (
      rule.min != null &&
      !isEmptyValue(value) &&
      String(value).length < rule.min
    ) {
      errors.push(rule.message ?? `长度不能小于 ${rule.min}`);
    }
    if (
      rule.max != null &&
      !isEmptyValue(value) &&
      String(value).length > rule.max
    ) {
      errors.push(rule.message ?? `长度不能大于 ${rule.max}`);
    }
    if (rule.validator) {
      try {
        await rule.validator(rule, value);
      } catch (error) {
        errors.push(
          error instanceof Error
            ? error.message
            : (rule.message ?? "校验未通过"),
        );
      }
    }
  }
  return errors;
}
function createFormInstance(store: FormStore): FormInstance & FormStore {
  const inst: FormInstance & FormStore = {
    values: store.values,
    setValues: store.setValues,
    errors: store.errors,
    setErrors: store.setErrors,
    fields: store.fields,
    touched: store.touched,
    getFieldValue: (name: NamePath) => getValue(inst.values, name),
    getFieldsValue: () => inst.values,
    setFieldValue: (name: NamePath, value: unknown) => {
      const key = pathKey(name);
      inst.touched.add(key);
      inst.setValues((prev) => setValueAtPath(prev, name, value));
      inst.setErrors((prev) => {
        if (!prev[key]?.length) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    setFieldsValue: (values: AnyRecord) =>
      inst.setValues((prev) => ({ ...prev, ...values })),
    resetFields: () => {
      inst.touched.clear();
      inst.setErrors({});
      inst.setValues({});
    },
    setFields: (
      fields: Array<{
        name: NamePath;
        value?: unknown;
        touched?: boolean;
        errors?: string[];
      }>,
    ) => {
      // 与 antd Form.setFields 的语义对齐：单次调用同时支持 value / touched / errors。
      // 历史实现只处理 errors，导致 picker 新增、批量删除、字典就绪后的 hydration 补丁等
      // 通过 setFields 写值的路径完全失效（用户表现为「确定后数据加不上」）。
      const valueUpdates = fields.filter(
        (f): f is { name: NamePath; value: unknown; touched?: boolean; errors?: string[] } =>
          f != null && Object.prototype.hasOwnProperty.call(f, "value"),
      );
      if (valueUpdates.length > 0) {
        inst.setValues((prev) => {
          let next = prev;
          for (const f of valueUpdates) {
            next = setValueAtPath(next, f.name, f.value);
          }
          return next;
        });
      }
      // 写值即标 touched，保持与项目里 setFieldValue 一致的语义；显式传 touched 则以显式值为准。
      for (const f of valueUpdates) {
        inst.touched.add(pathKey(f.name));
      }
      for (const f of fields) {
        if (typeof f.touched === "boolean") {
          const key = pathKey(f.name);
          if (f.touched) inst.touched.add(key);
          else inst.touched.delete(key);
        }
      }
      inst.setErrors((prev) => {
        const next = { ...prev };
        for (const field of fields) {
          const key = pathKey(field.name);
          if (field.errors?.length) next[key] = field.errors;
          else delete next[key];
        }
        return next;
      });
    },
    submit: () => inst.submit?.(),
    validateFields: async () => {
      const nextErrors: Record<string, string[]> = {};
      for (const [key, meta] of inst.fields) {
        const errors = await validateField(
          meta,
          getValue(inst.values, meta.name),
        );
        if (errors.length) nextErrors[key] = errors;
      }
      inst.setErrors(nextErrors);
      if (Object.keys(nextErrors).length > 0) {
        throw {
          values: inst.values,
          errorFields: Object.entries(nextErrors).map(([name, errors]) => ({
            name,
            errors,
          })),
        };
      }
      return inst.values;
    },
    scrollToField: () => undefined,
    focusField: () => undefined,
    getFieldInstance: () => undefined,
    isFieldTouched: (name: NamePath) => inst.touched.has(pathKey(name)),
  } satisfies FormInstance & FormStore;
  return inst;
}
function useAppForm<T = AnyRecord>(): [FormInstance<T>] {
  const [values, setValues] = useState<AnyRecord>({});
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const instanceRef = useRef<(FormInstance & FormStore) | null>(null);
  if (!instanceRef.current) {
    instanceRef.current = createFormInstance({
      values,
      setValues,
      errors,
      setErrors,
      fields: new Map(),
      touched: new Set(),
    });
  }
  instanceRef.current.values = values;
  instanceRef.current.setValues = setValues;
  instanceRef.current.errors = errors;
  instanceRef.current.setErrors = setErrors;
  return [instanceRef.current as FormInstance<T>];
}
function useFormInstance<T = AnyRecord>() {
  const ctx = useContext(FormContext);
  const [fallback] = useAppForm<T>();
  return (ctx ?? fallback) as unknown as FormInstance<T>;
}
function useWatch(name: NamePath, form?: FormInstance) {
  return form?.getFieldValue(name);
}
function FormRoot<T = AnyRecord>({
  form,
  initialValues,
  children,
  className,
  onFinish,
  layout: _layout,
  labelCol: _labelCol,
  wrapperCol: _wrapperCol,
  ...props
}: React.FormHTMLAttributes<HTMLFormElement> & {
  form?: FormInstance<T>;
  initialValues?: Partial<T>;
  onFinish?: (values: T) => void;
  layout?: string;
  labelCol?: unknown;
  wrapperCol?: unknown;
  [key: string]: any;
}) {
  const [internal] = useAppForm<T>();
  const inst = (form ?? internal) as FormInstance & FormStore;
  const didApplyInitialValuesRef = useRef(false);
  inst.submit = () => {
    void inst.validateFields().then((values) => onFinish?.(values as T));
  };
  useEffect(() => {
    if (!initialValues || didApplyInitialValuesRef.current) return;
    didApplyInitialValuesRef.current = true;
    inst.setFieldsValue(initialValues as AnyRecord);
  }, [initialValues, inst]);
  return (
    <FormContext.Provider value={inst}>
      <form
        className={className}
        {...props}
        onSubmit={(e) => {
          e.preventDefault();
          inst.submit?.();
        }}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
}
function FormItem({
  name,
  label,
  children,
  hidden,
  valuePropName = "value",
  className,
  rules: _rules,
  initialValue,
  required,
  style,
  extra,
  getValueFromEvent,
}: {
  name?: NamePath;
  label?: React.ReactNode;
  children?: React.ReactNode;
  hidden?: boolean;
  valuePropName?: string;
  rules?: unknown;
  className?: string;
  span?: number;
  initialValue?: unknown;
  required?: boolean;
  style?: React.CSSProperties;
  extra?: React.ReactNode;
  getValueFromEvent?: (...args: unknown[]) => unknown;
  [key: string]: any;
}) {
  const form = useContext(FormContext);
  const rules = _rules as FormRule | FormRule[] | undefined;
  const key = pathKey(name);
  useEffect(() => {
    if (!form || name == null) return undefined;
    form.fields.set(key, { name, label, rules });
    if (
      initialValue !== undefined &&
      isEmptyValue(getValue(form.values, name))
    ) {
      form.setFieldValue(name, initialValue);
    }
    return () => {
      form.fields.delete(key);
    };
  }, [form, initialValue, key, label, name, rules]);
  if (hidden) return null;
  const value = form ? getValue(form.values, name) : undefined;
  const controlledValue =
    valuePropName === "checked" ? Boolean(value) : (value ?? "");
  const child =
    isValidElement(children) && name != null
      ? React.cloneElement(
          children as React.ReactElement<Record<string, unknown>>,
          {
            [valuePropName]: controlledValue,
            onChange: (...args: unknown[]) => {
              const arg = args[0];
              const next = getValueFromEvent
                ? getValueFromEvent(...args)
                : arg &&
                    typeof arg === "object" &&
                    "target" in (arg as AnyRecord)
                  ? (
                      (arg as React.ChangeEvent<HTMLInputElement>)
                        .target as HTMLInputElement
                    )[valuePropName === "checked" ? "checked" : "value"]
                  : arg;
              form?.setFieldValue(name, next);
              (
                (children.props as AnyRecord).onChange as
                  | ((...eventArgs: unknown[]) => void)
                  | undefined
              )?.(...args);
            },
          },
        )
      : children;
  const errors = key ? form?.errors[key] : undefined;
  const requiredMark =
    required ||
    (Array.isArray(rules) ? rules : rules ? [rules] : []).some((rule) =>
      Boolean(rule?.required),
    );
  return (
    <div className={cn("mb-0 grid gap-0.5", className)} style={style}>
      {label ? (
        <label className="flex h-[18px] items-center text-xs font-normal text-base-text">
          {requiredMark ? <span className="mr-1 text-error">*</span> : null}
          {label}
        </label>
      ) : null}
      {child}
      {extra ? (
        <div className="text-xs leading-3 text-gray-400">{extra}</div>
      ) : null}
      <p
        className={cn(
          "min-h-3 text-xs leading-3 text-error",
          !errors?.[0] && "invisible",
        )}
      >
        {errors?.[0] ?? "占位"}
      </p>
    </div>
  );
}
export const Form = Object.assign(FormRoot, {
  Item: FormItem,
  useForm: useAppForm,
  useFormInstance,
  useWatch,
});

export type ButtonProps = UiButtonProps & {
  type?: "primary" | "link" | "text" | "default";
  htmlType?: string;
  danger?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  block?: boolean;
  color?: string;
  variant?: string;
};
export function Button({
  type,
  htmlType,
  danger,
  loading,
  icon,
  block,
  className,
  children,
  variant,
  ...props
}: ButtonProps) {
  const v =
    type === "link"
      ? "link"
      : danger
        ? "destructive"
        : type === "text"
          ? "ghost"
          : type === "primary" || variant === "solid"
            ? "default"
            : variant === "outlined"
              ? "outline"
              : ((variant as UiButtonProps["variant"]) ?? "outline");
  return (
    <UiButton
      type={(htmlType as any) ?? "button"}
      className={cn(
        danger && type === "link" && "text-error hover:text-error",
        block && "w-full",
        className,
      )}
      variant={v}
      {...props}
      disabled={loading || props.disabled}
    >
      {loading ? <Spinner data-icon="inline-start" /> : icon}
      {children}
    </UiButton>
  );
}
export function Space({
  children,
  className,
  direction = "horizontal",
  size = "small",
  wrap,
}: {
  children?: React.ReactNode;
  className?: string;
  direction?: "horizontal" | "vertical";
  size?: "small" | "middle" | "large" | number;
  wrap?: boolean;
  [key: string]: any;
}) {
  const gap =
    typeof size === "number"
      ? undefined
      : size === "large"
        ? "gap-4"
        : size === "middle"
          ? "gap-3"
          : "gap-2";
  return (
    <div
      className={cn(
        wrap ? "flex" : "inline-flex",
        direction === "vertical" ? "flex-col" : "items-center",
        wrap && "min-w-0 flex-wrap",
        gap,
        className,
      )}
      style={typeof size === "number" ? { gap: size } : undefined}
    >
      {children}
    </div>
  );
}
export function Card({ className, bodyStyle, variant, ...props }: any) {
  return (
    <UiCard
      className={cn(variant === "borderless" && "border-0", className)}
      bodyStyle={bodyStyle}
      {...props}
    />
  );
}
function splitInputClassName(className: unknown): {
  wrapperClassName?: string;
  inputClassName?: string;
} {
  if (typeof className !== "string")
    return { wrapperClassName: undefined, inputClassName: undefined };
  const wrapperClasses: string[] = [];
  const inputClasses: string[] = [];
  for (const token of className.split(/\s+/).filter(Boolean)) {
    const baseClass =
      token.split(":").pop()?.replace(/^!/, "").replace(/^-/, "") ?? token;
    if (/^(?:m|mx|my|mt|mr|mb|ml)-/.test(baseClass)) wrapperClasses.push(token);
    else inputClasses.push(token);
  }
  return {
    wrapperClassName: wrapperClasses.join(" ") || undefined,
    inputClassName: inputClasses.join(" ") || undefined,
  };
}
function InputCompat({
  allowClear,
  prefix,
  suffix,
  precision: _precision,
  className,
  value,
  defaultValue,
  onChange,
  onPressEnter,
  onKeyDown,
  onFocus,
  onBlur,
  ...props
}: any) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [tooltipContent, setTooltipContent] = useState("");
  const hasWidthClass =
    typeof className === "string" &&
    /(?:^|\\s)!?(?:w-|max-w-|min-w-)/.test(className);
  const { wrapperClassName, inputClassName } = splitInputClassName(className);
  const showClear =
    allowClear &&
    value != null &&
    String(value) !== "" &&
    !props.disabled &&
    !props.readOnly;
  const initialTooltipText = String(value ?? defaultValue ?? "");
  const tooltipEnabled = supportsInputOverflowTooltipType(props.type);
  const getTooltipText = () =>
    String(inputRef.current?.value ?? value ?? defaultValue ?? "");
  const hasSuffix = Boolean(suffix);
  const hasTrailingAddon = showClear || hasSuffix;
  const showOverflowTooltip = () => {
    const nextTooltipText = getTooltipText();
    if (!tooltipEnabled || !nextTooltipText || !inputRef.current) {
      setTooltipOpen(false);
      return;
    }
    setTooltipContent(nextTooltipText);
    setTooltipOpen(hasInputValueHorizontalOverflow(inputRef.current));
  };
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") onPressEnter?.(event);
    onKeyDown?.(event);
  };
  return (
    <TooltipProvider>
      <PrimitiveTooltip
        open={tooltipOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setTooltipOpen(false);
        }}
      >
        <TooltipTrigger asChild>
          <div
            className={cn(
              "relative inline-flex items-center",
              !hasWidthClass && "w-full",
              wrapperClassName,
            )}
            onMouseEnter={showOverflowTooltip}
            onMouseLeave={() => setTooltipOpen(false)}
            onFocus={showOverflowTooltip}
            onBlur={() => setTooltipOpen(false)}
            tabIndex={
              props.disabled && tooltipEnabled && initialTooltipText
                ? 0
                : undefined
            }
            aria-disabled={props.disabled || undefined}
          >
            {prefix ? (
              <span
                data-input-prefix
                className="absolute left-2 text-gray-400 [&_svg]:size-3.5"
              >
                {prefix}
              </span>
            ) : null}
            <UiInput
              ref={inputRef}
              overflowTooltip={false}
              value={value}
              defaultValue={defaultValue}
              onChange={onChange}
              onKeyDown={handleKeyDown}
              onFocus={(event) => {
                showOverflowTooltip();
                onFocus?.(event);
              }}
              onBlur={(event) => {
                setTooltipOpen(false);
                onBlur?.(event);
              }}
              className={cn(
                prefix && "pl-8",
                hasTrailingAddon && (showClear && hasSuffix ? "pr-14" : "pr-8"),
                inputClassName,
              )}
              {...props}
            />
            {showClear ? (
              <button
                type="button"
                className={cn(
                  "absolute top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-xs text-gray-300 transition-colors hover:bg-slate-100 hover:text-gray-600 dark:hover:bg-white/10 dark:hover:text-slate-200",
                  hasSuffix ? "right-7" : "right-1.5",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onChange?.({ target: { value: "" } })}
                aria-label="清空"
              >
                ×
              </button>
            ) : null}
            {hasSuffix ? (
              <span
                data-input-suffix
                className="absolute right-2 text-gray-400 [&_svg]:size-3.5"
              >
                {suffix}
              </span>
            ) : null}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-[520px] whitespace-normal break-words">
          {/* Input 走原生 TooltipContent，需要手动套 maybeRenderRichInline；与 OverflowTooltip
              的兜底保持一致，让回显值里的 `<i><b><sub><sup>` 在 hover 浮层里显示成富文本而非字面值。 */}
          {maybeRenderRichInline(tooltipContent || initialTooltipText)}
        </TooltipContent>
      </PrimitiveTooltip>
    </TooltipProvider>
  );
}
function PasswordCompat({
  className,
  prefix,
  suffix,
  allowClear: _allowClear,
  disabled,
  readOnly,
  ...props
}: any) {
  const [visible, setVisible] = useState(false);
  const VisibilityIcon = visible ? EyeOffIcon : EyeIcon;
  const visibilityButton = (
    <span className="inline-flex items-center gap-1">
      {suffix}
      <button
        type="button"
        className="inline-flex size-4 items-center justify-center text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-gray-200"
        disabled={disabled}
        aria-label={visible ? "隐藏密码" : "显示密码"}
        aria-pressed={visible}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setVisible((prev) => !prev)}
      >
        <VisibilityIcon className="size-3.5" />
      </button>
    </span>
  );
  return (
    <InputCompat
      {...props}
      type={visible ? "text" : "password"}
      className={className}
      prefix={prefix}
      suffix={visibilityButton}
      disabled={disabled}
      readOnly={readOnly}
    />
  );
}
function TextAreaCompat({
  allowClear: _allowClear,
  autoSize: _autoSize,
  showCount,
  className,
  value,
  defaultValue,
  maxLength,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  allowClear?: boolean;
  autoSize?: unknown;
  showCount?: boolean;
}) {
  const currentLength = String(value ?? defaultValue ?? "").length;
  return (
    <div className="w-full">
      <Textarea
        className={className}
        value={value}
        defaultValue={defaultValue}
        maxLength={maxLength}
        {...props}
      />
      {showCount ? (
        <div className="mt-1 text-right text-xs leading-none text-slate-400">
          {currentLength}
          {maxLength != null ? ` / ${maxLength}` : ""}
        </div>
      ) : null}
    </div>
  );
}
export const Input = Object.assign(InputCompat, {
  Password: PasswordCompat,
  TextArea: TextAreaCompat,
});
type AppSelectValue = string | number | boolean;
type AppSelectOption = {
  label: React.ReactNode;
  value: AppSelectValue;
  disabled?: boolean;
};
type AppSelectProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "value" | "onChange" | "children"
> & {
  options?: AppSelectOption[];
  value?: unknown;
  onChange?: (value: any, option?: unknown) => void;
  mode?: string;
  children?: React.ReactNode;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
  showSearch?: boolean;
  filterOption?: unknown;
  optionFilterProp?: string;
  loading?: boolean;
  notFoundContent?: React.ReactNode;
  onSearch?: (value: string) => void;
};
function AppSelect({
  options,
  value,
  onChange,
  mode,
  children,
  placeholder,
  className,
  disabled,
  allowClear: _allowClear,
  showSearch: _showSearch,
  filterOption: _filterOption,
  optionFilterProp: _optionFilterProp,
  loading: _loading,
  notFoundContent: _notFoundContent,
  onSearch: _onSearch,
  ...props
}: AppSelectProps) {
  const list = options ?? [];
  const childOptions: AppSelectOption[] = [];
  const optionValueMap = new Map<string, unknown>();
  for (const option of list)
    optionValueMap.set(String(option.value), option.value);
  React.Children.forEach(children, (child) => {
    const element = isValidElement(child)
      ? (child as React.ReactElement<{
          value?: unknown;
          children?: React.ReactNode;
          disabled?: boolean;
        }>)
      : undefined;
    const props = element?.props;
    if (props && "value" in props) {
      optionValueMap.set(String(props.value), props.value);
      childOptions.push({
        label: props.children,
        value: props.value as AppSelectValue,
        disabled: props.disabled,
      });
    }
  });
  const allOptions = [...list, ...childOptions];
  const restoreValue = (raw: string) =>
    optionValueMap.has(raw) ? optionValueMap.get(raw) : raw;
  const normalizedValue =
    mode === "multiple"
      ? Array.isArray(value)
        ? value.map((item) => restoreValue(String(item)))
        : []
      : value == null || value === ""
        ? undefined
        : restoreValue(String(value));
  return (
    <ApiSelect
      {...props}
      disabled={disabled}
      value={normalizedValue}
      mode={mode === "multiple" ? "multiple" : undefined}
      options={allOptions}
      placeholder={placeholder || "请选择"}
      className={className}
      allowClear={_allowClear}
      showSearch={_showSearch}
      filterOption={_filterOption as any}
      loading={_loading}
      notFoundContent={_notFoundContent}
      onSearch={_onSearch}
      onChange={(nextValue) => {
        if (Array.isArray(nextValue)) {
          const selectedOptions = allOptions.filter((option) =>
            nextValue.map(String).includes(String(option.value)),
          );
          onChange?.(nextValue, selectedOptions);
          return;
        }
        const option = allOptions.find((candidate) => candidate.value === nextValue);
        onChange?.(nextValue, option);
      }}
    />
  );
}
AppSelect.Option = (_props: {
  value: string | number | boolean;
  children: React.ReactNode;
  disabled?: boolean;
}) => null;
export { AppSelect as Select };
export const InputNumber = Input;

export function Checkbox({
  checked,
  indeterminate,
  onChange,
  children,
  className,
  inputClassName,
  ...props
}: {
  checked?: boolean;
  /** 半选态：底层 Radix Checkbox 支持，"checked === false && indeterminate === true" 时显示横线样式。
   *  典型用法：当前页部分选中、整张表分页中存在跨页混合选中等。 */
  indeterminate?: boolean;
  value?: string | number;
  onChange?: (e: { target: { checked: boolean } }) => void;
  children?: React.ReactNode;
  className?: string;
  inputClassName?: string;
  [key: string]: any;
}) {
  // indeterminate 优先级高于 checked：半选状态下 Radix 接受字符串字面量 "indeterminate"。
  // onCheckedChange 收到字符串时一律按未勾选处理（让父级显式切换到「全选」分支）。
  const resolvedChecked = indeterminate ? "indeterminate" : checked;
  return (
    <label
      className={cn(
        "inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300",
        className,
      )}
    >
      <PrimitiveCheckbox
        className={cn("size-4", inputClassName)}
        checked={resolvedChecked as boolean | "indeterminate" | undefined}
        onCheckedChange={(nextChecked) =>
          onChange?.({ target: { checked: nextChecked === true } })
        }
        {...props}
      />
      {children}
    </label>
  );
}
Checkbox.Group = ({
  options = [],
  value = [],
  onChange,
}: {
  options?: Array<{ label: React.ReactNode; value: string | number }>;
  value?: Array<string | number>;
  onChange?: (v: Array<string | number>) => void;
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map((o) => (
      <Checkbox
        key={String(o.value)}
        checked={value.includes(o.value)}
        onChange={(e) =>
          onChange?.(
            e.target.checked
              ? [...value, o.value]
              : value.filter((v) => v !== o.value),
          )
        }
      >
        {o.label}
      </Checkbox>
    ))}
  </div>
);

export function Radio({
  checked,
  onChange,
  children,
  value,
  className,
  disabled,
  name,
}: {
  checked?: boolean;
  value?: string | number | boolean;
  onChange?: (e: {
    target: { checked: boolean; value?: string | number | boolean };
  }) => void;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  name?: string;
  [key: string]: any;
}) {
  const optionValue = value == null ? "" : String(value);
  return (
    <PrimitiveRadioGroup
      value={checked ? optionValue : undefined}
      onValueChange={(nextValue) =>
        onChange?.({ target: { checked: nextValue === optionValue, value } })
      }
      disabled={disabled}
      name={name}
    >
      <label
        className={cn(
          "inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300",
          disabled && "cursor-not-allowed opacity-60",
          className,
        )}
      >
        <PrimitiveRadioGroupItem
          value={optionValue}
          className="size-4 border-slate-300 dark:border-white/25 dark:bg-[#0f1720]"
        />
        {children}
      </label>
    </PrimitiveRadioGroup>
  );
}

Radio.Group = ({
  options = [],
  value,
  onChange,
  children,
  className,
  disabled,
  name,
}: {
  options?: Array<{ label: React.ReactNode; value: string | number | boolean }>;
  value?: unknown;
  onChange?: (e: { target: { value: any } }) => void;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  name?: string;
  [key: string]: any;
}) => {
  const emit = (nextValue: string | number | boolean | undefined) =>
    onChange?.({ target: { value: nextValue } });
  const optionValueMap = new Map<string, string | number | boolean>();
  options.forEach((option) =>
    optionValueMap.set(String(option.value), option.value),
  );
  const renderedChildren = React.Children.map(children, (child, index) => {
    if (
      !isValidElement<{
        value?: string | number | boolean;
        checked?: boolean;
        onChange?: (event: unknown) => void;
        disabled?: boolean;
        name?: string;
        children?: React.ReactNode;
      }>(child)
    )
      return child;
    const childValue = child.props.value;
    const optionValue = childValue == null ? "" : String(childValue);
    if (childValue != null) optionValueMap.set(optionValue, childValue);
    return (
      <label
        key={child.key ?? index}
        className={cn(
          "inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300",
          (disabled || child.props.disabled) && "cursor-not-allowed opacity-60",
        )}
      >
        <PrimitiveRadioGroupItem
          value={optionValue}
          disabled={disabled || child.props.disabled}
          className="size-4 border-slate-300 dark:border-white/25 dark:bg-[#0f1720]"
        />
        <span>{child.props.children}</span>
      </label>
    );
  });
  return (
    <PrimitiveRadioGroup
      name={name}
      value={value == null ? undefined : String(value)}
      disabled={disabled}
      onValueChange={(nextValue) =>
        emit(optionValueMap.get(nextValue) ?? nextValue)
      }
      className={cn("flex flex-wrap gap-3", className)}
    >
      {options.map((o) => (
        <label
          key={String(o.value)}
          className={cn(
            "inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <PrimitiveRadioGroupItem
            value={String(o.value)}
            className="size-4 border-slate-300 dark:border-white/25 dark:bg-[#0f1720]"
          />
          <span>{o.label}</span>
        </label>
      ))}
      {renderedChildren}
    </PrimitiveRadioGroup>
  );
};
export function Switch({
  checked,
  onChange,
  disabled,
  ...props
}: {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  [key: string]: any;
}) {
  return (
    <PrimitiveSwitch
      checked={checked}
      disabled={disabled}
      onCheckedChange={(nextChecked) => onChange?.(nextChecked === true)}
      {...props}
    />
  );
}
export function Tag({
  color,
  type: _type,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  color?: string;
  type?: string;
  [key: string]: any;
}) {
  const tone =
    color === "success" || color === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-300/35 dark:bg-emerald-400/14 dark:text-emerald-200"
      : color === "warning" || color === "orange"
        ? "border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-300/35 dark:bg-orange-400/18 dark:text-orange-100"
        : color === "error" || color === "red"
          ? "border-red-200 bg-red-50 text-red-600 dark:border-red-300/35 dark:bg-red-400/14 dark:text-red-200"
          : color === "purple"
            ? "border-purple-200 bg-purple-50 text-purple-600 dark:border-purple-300/35 dark:bg-purple-400/18 dark:text-purple-100"
            : color === "blue" || color === "geekblue" || color === "processing"
              ? "border-primary-200 bg-primary-50 text-primary dark:border-primary/45 dark:bg-primary/20 dark:text-blue-100"
              : "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/16 dark:bg-white/8 dark:text-slate-100";
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded border px-2 py-0.5 text-xs leading-[18px] font-normal ring-0",
        tone,
        className,
      )}
      {...props}
    />
  );
}
export function Tooltip({
  title,
  children,
}: {
  title?: React.ReactNode;
  children?: React.ReactNode;
}) {
  if (title === undefined || title === null || title === false || title === "")
    return <>{children}</>;
  return (
    <OverflowTooltip
      content={title}
      force
      className="inline-block max-w-full"
      contentClassName="max-w-[520px] whitespace-normal break-words"
    >
      {children}
    </OverflowTooltip>
  );
}
function OverflowTooltipText({
  title,
  children,
  className,
  wrapperClassName,
}: {
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
}) {
  const hasTitle =
    title !== undefined && title !== null && title !== false && title !== "";
  if (!hasTitle) {
    return (
      <span className={cn("inline-block max-w-full", wrapperClassName)}>
        <span className={className}>{children}</span>
      </span>
    );
  }
  return (
    <OverflowTooltip
      content={title}
      className={className}
      contentClassName="max-w-[520px] whitespace-normal break-words"
      force={false}
    >
      <span className={cn("inline-block max-w-full", wrapperClassName)}>
        {children}
      </span>
    </OverflowTooltip>
  );
}
export function Spin({
  spinning = true,
  children,
  wrapperClassName,
}: {
  spinning?: boolean;
  children?: React.ReactNode;
  size?: string;
  wrapperClassName?: string;
  [key: string]: any;
}) {
  if (children)
    return (
      <div className={wrapperClassName}>
        {spinning ? <Spinner /> : null}
        {children}
      </div>
    );
  return <>{spinning ? <Spinner /> : null}</>;
}
export function Empty({
  description = "暂无数据",
  image: _image,
  className,
  children,
  size = "sm",
}: {
  description?: React.ReactNode;
  image?: unknown;
  className?: string;
  children?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  [key: string]: any;
}) {
  return (
    <EmptyState
      size={size}
      variant="bare"
      title={description}
      className={className}
    >
      {children}
    </EmptyState>
  );
}
Empty.PRESENTED_IMAGE_SIMPLE = "simple";
export function Progress({
  percent = 0,
  ...props
}: {
  percent?: number;
  [key: string]: unknown;
}) {
  return <UiProgress value={percent} {...props} />;
}
function AppAlert({
  message,
  description,
  type: _type,
  className,
  children,
}: any) {
  return (
    <Alert
      className={cn(
        "rounded-md border border-border bg-container p-3 text-sm",
        className,
      )}
    >
      {message ? <AlertTitle>{message}</AlertTitle> : null}
      {description ? <AlertDescription>{description}</AlertDescription> : null}
      {children}
    </Alert>
  );
}
export { AppAlert as Alert };
export type ModalProps = {
  open?: boolean;
  visible?: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onCancel?: () => void;
  onOk?: () => void | Promise<void>;
  okText?: React.ReactNode;
  cancelText?: React.ReactNode;
  width?: number | string;
  confirmLoading?: boolean;
  okButtonProps?: ButtonProps;
  cancelButtonProps?: ButtonProps;
  closable?: boolean;
  maskClosable?: boolean;
  scrollable?: boolean;
  className?: string;
  bodyClassName?: string;
  styles?: { body?: React.CSSProperties };
  [key: string]: unknown;
};

export function Modal({
  open,
  visible,
  title,
  description,
  children,
  footer,
  onCancel,
  onOk,
  okText = "确定",
  cancelText = "取消",
  width,
  confirmLoading,
  okButtonProps,
  cancelButtonProps,
  closable = true,
  maskClosable = true,
  scrollable = true,
  className,
  bodyClassName,
  styles,
}: ModalProps) {
  const isOpen = Boolean(open ?? visible);
  const [okPending, setOkPending] = useState(false);
  const okPendingRef = useRef(false);
  const resolvedWidth =
    typeof width === "number"
      ? `min(calc(100vw - 48px), ${width}px)`
      : (width ?? 640);
  const resolvedDescription =
    description ??
    (typeof title === "string" && title.trim().length > 0
      ? `${title} 对话框`
      : "对话框内容");
  const okLoading = Boolean(confirmLoading || okButtonProps?.loading || okPending);
  const handleDefaultOk = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (okPendingRef.current) return;
    okPendingRef.current = true;
    setOkPending(true);
    try {
      if (okButtonProps?.onClick) {
        await (okButtonProps.onClick(event) as unknown);
      } else {
        await onOk?.();
      }
    } catch {
      // 表单校验或请求层负责反馈；保持弹窗打开，允许用户修正后重试。
    } finally {
      okPendingRef.current = false;
      setOkPending(false);
    }
  };
  return (
    <ModalTableDefaultsContext.Provider value>
      <Dialog
        open={isOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && closable) onCancel?.();
        }}
      >
        <DialogContent
          data-testid="app-modal-content"
          showCloseButton={closable}
          className={cn(
            "flex flex-col rounded-lg border border-border bg-container px-6 pb-5 pt-5 shadow-lg dark:border-white/12 dark:shadow-black/45",
            scrollable
              ? "max-h-[90vh] overflow-visible"
              : "max-h-[calc(100vh-48px)] overflow-visible",
            className,
          )}
          style={{ width: resolvedWidth }}
          onEscapeKeyDown={(event) => {
            if (!closable) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (!closable || !maskClosable) event.preventDefault();
          }}
        >
          {title ? (
            <DialogHeader className="mb-0 pr-8">
              <DialogTitle className="text-base leading-6 text-slate-900 dark:text-slate-100">
                {title}
              </DialogTitle>
            </DialogHeader>
          ) : null}
          <DialogDescription className="sr-only">
            {resolvedDescription}
          </DialogDescription>
          <div
            className={cn(
              scrollable
                ? "min-h-0 flex-1 overflow-y-auto overscroll-contain"
                : "min-h-0 overflow-hidden",
              title && !styles?.body ? "mt-4" : undefined,
              bodyClassName,
            )}
            style={styles?.body}
          >
            {children}
          </div>
          {footer !== null ? (
            <div className="mt-4 flex shrink-0 justify-end gap-2">
              {footer ?? (
                <>
                  <Button
                    variant="outline"
                    {...cancelButtonProps}
                    onClick={(event) => {
                      cancelButtonProps?.onClick?.(event);
                      if (!event.defaultPrevented) onCancel?.();
                    }}
                  >
                    {cancelText}
                  </Button>
                  <Button
                    type="primary"
                    {...okButtonProps}
                    loading={okLoading}
                    disabled={okLoading || okButtonProps?.disabled}
                    onClick={handleDefaultOk}
                  >
                    {okText}
                  </Button>
                </>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </ModalTableDefaultsContext.Provider>
  );
}

type AppModalPromptOptions = {
  title?: React.ReactNode;
  content?: React.ReactNode;
  onOk?: () => void | Promise<void>;
  okText?: React.ReactNode;
  cancelText?: React.ReactNode;
  hideCancel?: boolean;
};

function openModalPrompt({
  title,
  content,
  onOk,
  okText = "确定",
  cancelText = "取消",
  hideCancel = false,
}: AppModalPromptOptions) {
  if (typeof document === "undefined") return;

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let destroyed = false;

  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    root.unmount();
    container.remove();
  };

  function PromptDialog() {
    const [open, setOpen] = useState(true);
    const [pending, setPending] = useState(false);
    const pendingRef = useRef(false);

    const close = () => {
      setOpen(false);
      setTimeout(destroy, 0);
    };

    const handleOk = async (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (pendingRef.current) return;
      pendingRef.current = true;
      setPending(true);
      try {
        await onOk?.();
        close();
      } catch {
        // 请求层负责错误提示；保持弹窗打开，允许重试或取消。
      } finally {
        pendingRef.current = false;
        setPending(false);
      }
    };

    return (
      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !pending) close();
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{title ?? "提示"}</AlertDialogTitle>
            <AlertDialogDescription className={content ? undefined : "sr-only"}>
              {content ?? "请确认当前操作。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {hideCancel ? null : (
              <AlertDialogCancel disabled={pending}>{cancelText}</AlertDialogCancel>
            )}
            <AlertDialogAction
              disabled={pending}
              onClick={handleOk}
            >
              {pending ? "处理中..." : okText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  root.render(<PromptDialog />);
}

Modal.confirm = ({ title, content, onOk, okText, cancelText }: any) =>
  openModalPrompt({ title, content, onOk, okText, cancelText });
Modal.warning = ({ title, content }: any) =>
  openModalPrompt({ title, content, hideCancel: true, okText: "知道了" });

export function Popconfirm({
  title,
  description,
  onConfirm,
  children,
  disabled,
  okText,
  cancelText,
  okButtonProps,
  cancelButtonProps,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  onConfirm?: (event?: any) => void | Promise<void>;
  children?: React.ReactNode;
  disabled?: boolean;
  okText?: React.ReactNode;
  cancelText?: React.ReactNode;
  okButtonProps?: ButtonProps;
  cancelButtonProps?: ButtonProps;
  [key: string]: any;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const confirmPending = pending || !!okButtonProps?.loading;
  const handleConfirm = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    try {
      await onConfirm?.(event);
      setOpen(false);
    } catch {
      // 请求层会负责错误提示；弹窗保持打开，允许用户重试或取消。
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };
  return (
    <>
      <span
        onClick={(event) => {
          event.stopPropagation();
          if (!disabled && !confirmPending) setOpen(true);
        }}
      >
        {children}
      </span>
      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!confirmPending) setOpen(nextOpen);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{title ?? "确认？"}</AlertDialogTitle>
            <AlertDialogDescription
              className={description ? undefined : "sr-only"}
            >
              {description ?? "请确认是否继续当前操作。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={confirmPending || cancelButtonProps?.disabled}>
              {cancelText ?? "取消"}
            </AlertDialogCancel>
            <AlertDialogAction
              className={cn(
                buttonVariants({
                  variant: okButtonProps?.danger ? "destructive" : (okButtonProps?.variant as any),
                }),
                okButtonProps?.className,
              )}
              disabled={confirmPending || okButtonProps?.disabled}
              onClick={handleConfirm}
            >
              {confirmPending ? "处理中..." : (okText ?? "确定")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
export function Upload({
  children,
  beforeUpload,
  onChange,
  multiple,
  accept,
  disabled,
}: {
  children?: React.ReactNode;
  beforeUpload?: (file: File) => boolean | string | Promise<boolean | string>;
  onChange?: (info: { file: UploadFile; fileList: UploadFile[] }) => void;
  multiple?: boolean;
  accept?: string;
  disabled?: boolean;
  [key: string]: any;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const uploadDisabled = disabled || processing;

  const openFilePicker = (event?: React.MouseEvent<HTMLElement>) => {
    if (uploadDisabled) return;
    if (event?.defaultPrevented) return;
    inputRef.current?.click();
  };

  type UploadTriggerProps = {
    onClick?: React.MouseEventHandler<HTMLElement>;
    disabled?: boolean;
  };
  const triggerChild = isValidElement<UploadTriggerProps>(children)
    ? children
    : null;
  const trigger = triggerChild ? (
    React.cloneElement(triggerChild, {
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        triggerChild.props.onClick?.(event);
        if (!triggerChild.props.disabled && !uploadDisabled) openFilePicker(event);
      },
    } satisfies Partial<UploadTriggerProps>)
  ) : (
    <span onClick={openFilePicker}>{children}</span>
  );

  return (
    <span
      className={cn(
        "inline-flex",
        uploadDisabled ? "cursor-not-allowed" : "cursor-pointer",
      )}
    >
      {/* Native file input is required for browser file-picker behavior. */}
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        multiple={multiple}
        accept={accept}
        disabled={uploadDisabled}
        onChange={async (e) => {
          const input = e.currentTarget;
          if (processing) return;
          setProcessing(true);
          try {
            const files = Array.from(input.files ?? []);
            const acceptedFiles: File[] = [];
            for (const file of files) {
              try {
                const result = await beforeUpload?.(file);
                if (result === false || result === Upload.LIST_IGNORE) continue;
                acceptedFiles.push(file);
              } catch {
                // beforeUpload 负责展示具体原因；这里避免事件处理器产生未处理 rejection。
              }
            }
            if (acceptedFiles.length === 0) return;
            const first = acceptedFiles[0];
            onChange?.({
              file: { name: first?.name, originFileObj: first },
              fileList: acceptedFiles.map((f) => ({ name: f.name, originFileObj: f })),
            });
          } finally {
            input.value = "";
            setProcessing(false);
          }
        }}
      />
      {trigger}
    </span>
  );
}
type DescriptionsItemProps = {
  key?: Key;
  label?: React.ReactNode;
  children?: React.ReactNode;
  span?: number;
  [key: string]: any;
};
function DescriptionsItem({ label, children }: DescriptionsItemProps) {
  return (
    <>
      {label}
      {children}
    </>
  );
}
export function Descriptions({
  items,
  children,
  className,
  column = 1,
}: {
  items?: DescriptionsItemProps[];
  children?: React.ReactNode;
  className?: string;
  column?: number;
  size?: string;
  bordered?: boolean;
  [key: string]: any;
}) {
  const col = Math.max(1, Number(column) || 1);
  const normalizedItems =
    items ??
    React.Children.toArray(children).flatMap((child, index) => {
      if (!isValidElement<DescriptionsItemProps>(child)) return [];
      const props = child.props;
      return [
        {
          key: child.key ?? index,
          label: props.label,
          children: props.children,
          span: props.span,
        },
      ];
    });
  return (
    <dl
      className={cn(
        "grid overflow-hidden rounded-md border border-border text-xs leading-5",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${col}, minmax(112px, max-content) minmax(0, 1fr))`,
      }}
    >
      {normalizedItems.map((it, i) => {
        const span = Math.min(Math.max(1, Number(it.span) || 1), col);
        const contentSpan = span * 2 - 1;
        return (
          <React.Fragment key={it.key ?? i}>
            <dt className="border-b border-r border-border bg-slate-50 px-3 py-1.5 text-slate-600 dark:bg-white/5 dark:text-slate-300">
              {it.label}
            </dt>
            <dd
              className="min-w-0 border-b border-r border-border px-3 py-1.5 text-slate-800 break-words last:border-r-0 dark:text-slate-100"
              style={{
                gridColumn: contentSpan > 1 ? `span ${contentSpan}` : undefined,
              }}
            >
              {it.children}
            </dd>
          </React.Fragment>
        );
      })}
    </dl>
  );
}
Descriptions.Item = DescriptionsItem;
const DEFAULT_PAGINATION_PAGE_SIZE = 50;
const DEFAULT_PAGINATION_PAGE_SIZE_OPTIONS = [20, 50, 100];
const SMALL_TABLE_PAGINATION_PAGE_SIZE = 10;
const SMALL_TABLE_PAGINATION_PAGE_SIZE_OPTIONS = [5, 10, 20];
const MODAL_TABLE_PAGINATION_PAGE_SIZE = 20;
const MODAL_TABLE_PAGINATION_PAGE_SIZE_OPTIONS = [10, 20, 50];
const MODAL_TABLE_SCROLL_ROW_HEIGHT_PX = 28;
const MODAL_TABLE_VIEWPORT_RESERVED_HEIGHT_PX = 340;
const TABLE_TINY_HORIZONTAL_OVERFLOW_THRESHOLD_PX = 72;
const TABLE_ADAPTIVE_COLUMN_MIN_WIDTH_PX = 64;
const TABLE_DATE_ADAPTIVE_MIN_WIDTH_PX = 96;
const TABLE_DATE_COLUMN_MIN_WIDTH_PX = 112;
const DATE_COLUMN_TITLE_PATTERN = /(日期|有效期)/;
const DATE_COLUMN_FIELD_PATTERN = /(?:^|[_.-])date(?:$|[_.-])|valid_until/i;
function buildPaginationItems(page: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis-start" | "ellipsis-end"> = [1];
  if (page > 4) items.push("ellipsis-start");

  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  for (let item = start; item <= end; item += 1) {
    items.push(item);
  }

  if (page < totalPages - 3) items.push("ellipsis-end");
  items.push(totalPages);
  return items;
}
function getPaginationPageSizeOptions(
  options: number[] | undefined,
  pageSize: number,
) {
  const values = options?.length
    ? options
    : DEFAULT_PAGINATION_PAGE_SIZE_OPTIONS;
  return Array.from(new Set([...values, pageSize]))
    .filter((item) => Number.isFinite(item) && item > 0)
    .sort((a, b) => a - b);
}

function renderTableCellContent(content: React.ReactNode) {
  if (content == null || content === false) return "";
  if (typeof content === "string" || typeof content === "number") {
    const text = String(content);
    if (text.trim() === "") return "";
    return (
      <OverflowTooltip
        content={text}
        className="block w-full truncate whitespace-nowrap"
      >
        {text}
      </OverflowTooltip>
    );
  }
  return content;
}

function isDateLikeColumnPart(value: unknown): boolean {
  if (value == null) return false;
  const text = String(value);
  if (!text) return false;
  return DATE_COLUMN_FIELD_PATTERN.test(text);
}

function isDateLikeColumn(column: ColumnType<unknown>): boolean {
  const title = column.title;
  if (
    (typeof title === "string" || typeof title === "number") &&
    DATE_COLUMN_TITLE_PATTERN.test(String(title))
  )
    return true;
  if (Array.isArray(column.dataIndex))
    return column.dataIndex.some((item) => isDateLikeColumnPart(item));
  return (
    isDateLikeColumnPart(column.dataIndex) || isDateLikeColumnPart(column.key)
  );
}

function resolveTableColumnWidth(
  column: ColumnType<unknown>,
): number | string | undefined {
  const width = column.width;
  const dateLike = isDateLikeColumn(column);
  if (typeof width === "string") return width;
  if (typeof width === "number")
    return dateLike ? Math.max(width, TABLE_DATE_COLUMN_MIN_WIDTH_PX) : width;
  if (dateLike) return TABLE_DATE_COLUMN_MIN_WIDTH_PX;
  return undefined;
}

function toCssLength(value: number | string | undefined): string | undefined {
  if (value == null) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

function resolveTableScrollX(
  value: number | string | true | undefined,
): string | undefined {
  if (value === true) return "max-content";
  return toCssLength(value);
}

function resolveTableScrollY({
  value,
  inModal,
  hasPagination,
  pageSize,
}: {
  value: number | string | undefined;
  inModal: boolean;
  hasPagination: boolean;
  pageSize: number;
}): string | undefined {
  if (value == null) return undefined;
  if (!inModal || typeof value !== "number") return toCssLength(value);
  const pageSizeExtra = hasPagination
    ? Math.max(0, pageSize - MODAL_TABLE_PAGINATION_PAGE_SIZE)
    : 0;
  const desiredHeight =
    value + pageSizeExtra * MODAL_TABLE_SCROLL_ROW_HEIGHT_PX;
  return `min(${desiredHeight}px, calc(100vh - ${MODAL_TABLE_VIEWPORT_RESERVED_HEIGHT_PX}px))`;
}

export function Table<T>({
  columns = [],
  dataSource = [],
  rowKey,
  loading,
  pagination,
  rowSelection,
  onRow,
  rowClassName,
  className,
  size,
  scroll,
}: TableProps<T>) {
  const inModal = useContext(ModalTableDefaultsContext);
  const tableViewportRef = useRef<HTMLDivElement>(null);
  const [tableViewportWidth, setTableViewportWidth] = useState(0);
  const pager = pagination === false ? undefined : pagination;
  const defaultPageSize = inModal
    ? MODAL_TABLE_PAGINATION_PAGE_SIZE
    : size === "small"
      ? SMALL_TABLE_PAGINATION_PAGE_SIZE
      : DEFAULT_PAGINATION_PAGE_SIZE;
  const defaultPageSizeOptions = inModal
    ? MODAL_TABLE_PAGINATION_PAGE_SIZE_OPTIONS
    : size === "small"
      ? SMALL_TABLE_PAGINATION_PAGE_SIZE_OPTIONS
      : DEFAULT_PAGINATION_PAGE_SIZE_OPTIONS;
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(defaultPageSize);
  const resolvedColumns = columns.map((column) => ({
    column,
    resolvedWidth: resolveTableColumnWidth(column as ColumnType<unknown>),
  }));
  const inferRowKey = (record: T, index: number): Key => {
    const value =
      (record as AnyRecord).rowKey ??
      (record as AnyRecord).key ??
      (record as AnyRecord).id;
    if (typeof value === "string" || typeof value === "number") return value;
    return index;
  };
  const keyOf = (record: T, index: number): Key => {
    if (typeof rowKey === "function") {
      const value = rowKey(record);
      if (typeof value === "string" || typeof value === "number") return value;
      return inferRowKey(record, index);
    }
    if (typeof rowKey === "string") {
      const value = (record as AnyRecord)[rowKey];
      if (typeof value === "string" || typeof value === "number") return value;
      return inferRowKey(record, index);
    }
    return inferRowKey(record, index);
  };
  const pageSize = pager
    ? (pager.pageSize ?? internalPageSize)
    : defaultPageSize;
  const total = pager ? (pager.total ?? dataSource.length) : dataSource.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(
    Math.max(1, pager ? (pager.current ?? internalPage) : 1),
    totalPages,
  );
  const serverPaginated =
    pager != null && pager.total != null && pager.total > dataSource.length;
  const start = pager && !serverPaginated ? (current - 1) * pageSize : 0;
  const pageData =
    pager && !serverPaginated
      ? dataSource.slice(start, start + pageSize)
      : dataSource;
  const tableScrollY = resolveTableScrollY({
    value: scroll?.y,
    inModal,
    hasPagination: Boolean(pager),
    pageSize,
  });
  const tableScrollX = resolveTableScrollX(scroll?.x);
  const selectedKeys = rowSelection?.selectedRowKeys ?? [];
  const pageKeys = pageData.map((record, index) =>
    keyOf(record, start + index),
  );
  const pageSelectedCount = pageKeys.filter((key) =>
    selectedKeys.some((item) => String(item) === String(key)),
  ).length;
  const allPageSelected =
    pageKeys.length > 0 && pageSelectedCount === pageKeys.length;
  const somePageSelected = pageSelectedCount > 0 && !allPageSelected;
  const selectionColumnWidth =
    rowSelection?.columnWidth ??
    (rowSelection?.type === "radio"
      ? TABLE_SINGLE_SELECTION_COLUMN_WIDTH_PX
      : TABLE_MULTIPLE_SELECTION_COLUMN_WIDTH_PX);
  const selectionColumnStyle = rowSelection
    ? {
        width: selectionColumnWidth,
        minWidth: selectionColumnWidth,
        maxWidth: selectionColumnWidth,
      }
    : undefined;
  const viewportWidth = tableViewportWidth > 1 ? tableViewportWidth - 1 : 0;
  const baseColumnWidths = resolvedColumns.map(({ resolvedWidth }) =>
    typeof resolvedWidth === "number" ? resolvedWidth : undefined,
  );
  const baseMeasuredTableWidth = baseColumnWidths.reduce<number>(
    (sum, width) => sum + (width ?? 0),
    rowSelection ? selectionColumnWidth : 0,
  );
  const tinyHorizontalOverflow = baseMeasuredTableWidth - viewportWidth;
  const canAutoFitTinyOverflow =
    !tableScrollX &&
    viewportWidth > 0 &&
    tinyHorizontalOverflow > 0 &&
    tinyHorizontalOverflow <= TABLE_TINY_HORIZONTAL_OVERFLOW_THRESHOLD_PX;
  const adaptiveMinWidths = resolvedColumns.map(({ column }, index) => {
    const width = baseColumnWidths[index];
    if (width == null) return undefined;
    if (isDateLikeColumn(column as ColumnType<unknown>)) {
      return Math.min(width, TABLE_DATE_ADAPTIVE_MIN_WIDTH_PX);
    }
    return Math.min(width, TABLE_ADAPTIVE_COLUMN_MIN_WIDTH_PX);
  });
  const shrinkCapacity = canAutoFitTinyOverflow
    ? baseColumnWidths.reduce<number>((sum, width, index) => {
        if (width == null) return sum;
        const minWidth = adaptiveMinWidths[index] ?? width;
        return sum + Math.max(0, width - minWidth);
      }, 0)
    : 0;
  const renderedColumnWidths =
    canAutoFitTinyOverflow && shrinkCapacity > 0
      ? baseColumnWidths.map((width, index) => {
          if (width == null) return undefined;
          const minWidth = adaptiveMinWidths[index] ?? width;
          const capacity = Math.max(0, width - minWidth);
          if (capacity <= 0) return width;
          return Math.max(
            minWidth,
            width - (tinyHorizontalOverflow * capacity) / shrinkCapacity,
          );
        })
      : baseColumnWidths;

  useEffect(() => {
    const element = tableViewportRef.current;
    if (!element) return undefined;

    const updateWidth = () => {
      setTableViewportWidth(Math.floor(element.clientWidth));
    };
    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const handlePageChange = (page: number, nextPageSize: number) => {
    const normalizedPageSize =
      Number.isFinite(nextPageSize) && nextPageSize > 0
        ? Math.floor(nextPageSize)
        : pageSize;
    const nextTotalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
    const nextPage = Math.min(Math.max(1, page), nextTotalPages);
    if (pager?.current == null) setInternalPage(nextPage);
    if (pager?.pageSize == null) setInternalPageSize(normalizedPageSize);
    pager?.onChange?.(nextPage, normalizedPageSize);
  };
  const handleSelectionChange = (
    record: T,
    rowIndex: number,
    checked: boolean,
  ) => {
    if (!rowSelection) return;
    const key = keyOf(record, rowIndex);
    if (rowSelection.type === "radio" && !checked) return;
    const nextKeys =
      rowSelection.type === "radio"
        ? checked
          ? [key]
          : []
        : checked
          ? [
              ...selectedKeys.filter((item) => String(item) !== String(key)),
              key,
            ]
          : selectedKeys.filter((item) => String(item) !== String(key));
    const nextRows = dataSource.filter((item, index) =>
      nextKeys.some(
        (itemKey) => String(itemKey) === String(keyOf(item, index)),
      ),
    );
    rowSelection.onChange?.(nextKeys, nextRows);
  };
  const handleSelectPage = () => {
    if (!rowSelection || rowSelection.type === "radio") return;
    const pageKeySet = new Set(pageKeys.map(String));
    const base = selectedKeys.filter((key) => !pageKeySet.has(String(key)));
    const nextKeys = allPageSelected ? base : [...base, ...pageKeys];
    const nextRows = dataSource.filter((item, index) =>
      nextKeys.some(
        (itemKey) => String(itemKey) === String(keyOf(item, index)),
      ),
    );
    rowSelection.onChange?.(nextKeys, nextRows);
  };
  const selectedRadioValue =
    rowSelection?.type === "radio" && selectedKeys.length > 0
      ? String(selectedKeys[0])
      : undefined;
  const radioSelectionTargets =
    rowSelection?.type === "radio"
      ? new Map(
          pageData.map((record, pageIndex) => {
            const rowIndex = start + pageIndex;
            const key = String(keyOf(record, rowIndex));
            const disabled = Boolean(
              rowSelection?.getCheckboxProps?.(record)?.disabled,
            );
            return [key, { record, rowIndex, disabled }] as const;
          }),
        )
      : undefined;
  const handleRadioValueChange = (nextValue: string) => {
    if (!rowSelection || rowSelection.type !== "radio") return;
    const target = radioSelectionTargets?.get(nextValue);
    if (!target || target.disabled) return;
    handleSelectionChange(target.record, target.rowIndex, true);
  };
  const wrapTableForRadioSelection = (children: React.ReactNode) => {
    if (rowSelection?.type !== "radio") return <>{children}</>;
    return (
      <PrimitiveRadioGroup
        className="!block !gap-0"
        value={selectedRadioValue}
        onValueChange={handleRadioValueChange}
      >
        {children}
      </PrimitiveRadioGroup>
    );
  };
  return (
    <div
      className={cn(
        "rounded-[10px] border border-border bg-container",
        className,
      )}
    >
      <div
        ref={tableViewportRef}
        className={cn(
          "relative",
          tableScrollX ? "overflow-auto" : "overflow-y-auto overflow-x-hidden",
        )}
        style={tableScrollY ? { maxHeight: tableScrollY } : undefined}
      >
        {loading ? (
          <div
            data-table-loading
            aria-live="polite"
            className="absolute inset-x-0 bottom-0 top-[26px] z-50 flex items-center justify-center bg-white/70 text-slate-500 backdrop-blur-[2px] dark:bg-[#101821]/78 dark:text-slate-300"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-container/92 px-4 py-2 text-sm font-medium shadow-lg shadow-slate-200/70 dark:bg-[#172131]/92 dark:shadow-black/30">
              <Spinner className="size-5" />
              <span>加载中</span>
            </span>
          </div>
        ) : null}
        {wrapTableForRadioSelection(
          <UiTable
            wrapperClassName="overflow-visible"
            className="w-full table-fixed border-collapse text-xs"
            style={tableScrollX ? { minWidth: tableScrollX } : undefined}
          >
            <UiTableHeader>
              <UiTableRow className="bg-primary-100 hover:bg-primary-100 dark:bg-[#172131] dark:hover:bg-[#172131]">
                {rowSelection ? (
                  <UiTableHead
                    style={selectionColumnStyle}
                    className="p-0 text-center align-middle"
                  >
                    {rowSelection.type !== "radio" ? (
                      <div className="flex h-[26px] items-center justify-center">
                        <PrimitiveCheckbox
                          aria-label="选择当前页"
                          className="size-4 border-slate-300 dark:border-white/25 dark:bg-[#0f1720]"
                          checked={
                            allPageSelected
                              ? true
                              : somePageSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={() => handleSelectPage()}
                        />
                      </div>
                    ) : null}
                  </UiTableHead>
                ) : null}
                {resolvedColumns.map(({ column: c, resolvedWidth }, i) => {
                  const finalWidth =
                    typeof resolvedWidth === "number"
                      ? (renderedColumnWidths[i] ?? resolvedWidth)
                      : resolvedWidth;
                  return (
                    <UiTableHead
                      key={String(c.key ?? i)}
                      className={cn(
                        "px-2 text-xs font-medium text-slate-700 dark:text-slate-200",
                        c.align === "center"
                          ? "text-center"
                          : c.align === "right"
                            ? "text-right"
                            : "text-left",
                      )}
                      style={{ width: finalWidth }}
                    >
                      {c.title}
                    </UiTableHead>
                  );
                })}
              </UiTableRow>
            </UiTableHeader>
            <UiTableBody>
              {pageData.length === 0 && !loading ? (
                <UiTableRow className="hover:bg-transparent dark:hover:bg-transparent">
                  <UiTableCell
                    colSpan={
                      resolvedColumns.length + (rowSelection ? 1 : 0)
                    }
                    className="border-0 p-0"
                  >
                    <div className="flex min-h-[180px] items-center justify-center px-4 py-6">
                      <EmptyState
                        size="md"
                        variant="bare"
                        title="暂无数据"
                        description="尝试调整筛选条件或新增数据"
                      />
                    </div>
                  </UiTableCell>
                </UiTableRow>
              ) : null}
              {pageData.map((r, pageIndex) => {
                const i = start + pageIndex;
                const key = keyOf(r, i);
                const rowProps = onRow?.(r, i) ?? {};
                const cls =
                  typeof rowClassName === "function"
                    ? rowClassName(r, i)
                    : rowClassName;
                const checked = selectedKeys.some(
                  (item) => String(item) === String(key),
                );
                const checkboxProps = rowSelection?.getCheckboxProps?.(r) ?? {};
                const handleRowClick: React.MouseEventHandler<
                  HTMLTableRowElement
                > = (event) => {
                  rowProps.onClick?.(event);
                  if (
                    !event.defaultPrevented &&
                    rowSelection?.onChange &&
                    !checkboxProps.disabled
                  ) {
                    const nextChecked = !checked;
                    handleSelectionChange(r, i, nextChecked);
                  }
                };

                return (
                  <UiTableRow
                    key={String(key)}
                    {...rowProps}
                    onClick={handleRowClick}
                    className={cn(
                      "border-t border-border hover:bg-primary-50/60 dark:hover:bg-primary/12",
                      rowSelection?.onChange ? "cursor-pointer" : undefined,
                      cls,
                      rowProps.className,
                    )}
                  >
                    {rowSelection ? (
                      <UiTableCell
                        style={selectionColumnStyle}
                        className="border-0 p-0 text-center align-middle"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (checkboxProps.disabled) return;
                          const nextChecked = !checked;
                          handleSelectionChange(r, i, nextChecked);
                        }}
                      >
                        <div className="flex h-[26px] items-center justify-center">
                          {rowSelection.type === "radio" ? (
                            <PrimitiveRadioGroupItem
                              value={String(key)}
                              disabled={checkboxProps.disabled}
                              className={cn(
                                "size-4 border-slate-300 dark:border-white/25 dark:bg-[#0f1720]",
                                checkboxProps.className,
                              )}
                              onClick={(event) => event.stopPropagation()}
                            />
                          ) : (
                            <PrimitiveCheckbox
                              checked={checked}
                              disabled={checkboxProps.disabled}
                              className={cn(
                                "size-4 border-slate-300 dark:border-white/25 dark:bg-[#0f1720]",
                                checkboxProps.className,
                              )}
                              onClick={(event) => event.stopPropagation()}
                              onCheckedChange={(nextChecked) =>
                                handleSelectionChange(
                                  r,
                                  i,
                                  nextChecked === true,
                                )
                              }
                            />
                          )}
                        </div>
                      </UiTableCell>
                    ) : null}
                    {resolvedColumns.map(({ column: c }, ci) => {
                      const value =
                        c.dataIndex == null
                          ? undefined
                          : Array.isArray(c.dataIndex)
                            ? c.dataIndex.reduce<unknown>(
                                (acc, p) =>
                                  acc && typeof acc === "object"
                                    ? (acc as AnyRecord)[String(p)]
                                    : undefined,
                                r as unknown,
                              )
                            : (r as AnyRecord)[String(c.dataIndex)];
                      const renderedCell = c.render
                        ? c.render(value, r, i)
                        : value;
                      return (
                        <UiTableCell
                          key={String(c.key ?? ci)}
                          className={cn(
                            "overflow-hidden border-0 px-2 py-1 text-xs text-slate-600 dark:text-slate-200",
                            c.align === "center" && "text-center",
                            c.align === "right" && "text-right",
                          )}
                        >
                          {renderTableCellContent(
                            renderedCell as React.ReactNode,
                          )}
                        </UiTableCell>
                      );
                    })}
                  </UiTableRow>
                );
              })}
            </UiTableBody>
          </UiTable>,
        )}
      </div>
      {pager ? (
        <Pagination
          {...pager}
          current={current}
          pageSize={pageSize}
          pageSizeOptions={pager.pageSizeOptions ?? defaultPageSizeOptions}
          total={total}
          onChange={handlePageChange}
        />
      ) : null}
    </div>
  );
}
export function Pagination({
  current = 1,
  pageSize,
  total = 0,
  onChange,
  showSizeChanger,
  pageSizeOptions,
  showTotal,
  size,
}: TablePaginationConfig) {
  const resolvedPageSize =
    pageSize ??
    (size === "small"
      ? SMALL_TABLE_PAGINATION_PAGE_SIZE
      : DEFAULT_PAGINATION_PAGE_SIZE);
  const resolvedPageSizeOptions =
    pageSizeOptions ??
    (size === "small"
      ? SMALL_TABLE_PAGINATION_PAGE_SIZE_OPTIONS
      : DEFAULT_PAGINATION_PAGE_SIZE_OPTIONS);
  const totalPages = Math.max(1, Math.ceil(total / resolvedPageSize));
  const page = Math.min(Math.max(1, current), totalPages);
  const paginationItems = buildPaginationItems(page, totalPages);
  const options = getPaginationPageSizeOptions(
    resolvedPageSizeOptions,
    resolvedPageSize,
  );
  return (
    // flex-wrap：内嵌小表（如证书页「技术依据 / 标准器」两栏，半屏宽）数据多时
    // 「共 N 条 + 上下页 + 页码 + 每页 N 条/页」一行装不下，外层 Card 又是 overflow-hidden，
    // 不允许换行就会裁掉右侧选择器。允许换行让所有元素在窄容器里也能完整显示。
    <div
      data-pagination
      className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 px-1.5 py-1 text-xs text-gray-600 dark:text-slate-300"
    >
      <span>{showTotal ? showTotal(total) : `共 ${total} 条`}</span>
      <UiPagination className="mx-0 w-auto justify-start">
        <PaginationContent className="gap-1">
          <PaginationItem>
            <PaginationPrevious
              text="上一页"
              disabled={page <= 1}
              className="h-7 px-2 text-gray-600 hover:bg-primary-50 hover:text-primary dark:text-slate-300 dark:hover:bg-primary/14 dark:hover:text-primary-200"
              onClick={() => onChange?.(page - 1, resolvedPageSize)}
            />
          </PaginationItem>
          {paginationItems.map((item) =>
            typeof item === "number" ? (
              <PaginationItem key={item}>
                <PaginationLink
                  aria-label={`第 ${item} 页`}
                  isActive={item === page}
                  className={cn(
                    "h-7 min-w-7 px-2",
                    item === page
                      ? undefined
                      : "border-transparent text-gray-600 dark:text-slate-300",
                  )}
                  onClick={() => {
                    if (item !== page) onChange?.(item, resolvedPageSize);
                  }}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationEllipsis />
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              text="下一页"
              disabled={page >= totalPages}
              className="h-7 px-2 text-gray-600 hover:bg-primary-50 hover:text-primary dark:text-slate-300 dark:hover:bg-primary/14 dark:hover:text-primary-200"
              onClick={() => onChange?.(page + 1, resolvedPageSize)}
            />
          </PaginationItem>
        </PaginationContent>
      </UiPagination>
      {showSizeChanger !== false ? (
        <div className="flex h-7 shrink-0 items-center gap-1">
          <AppSelect
            aria-label="每页条数"
            className="h-7 w-[72px]"
            value={resolvedPageSize}
            options={options.map((option) => ({
              label: option,
              value: option,
            }))}
            onChange={(nextValue: unknown) => {
              const nextPageSize = Number(nextValue);
              if (!Number.isFinite(nextPageSize) || nextPageSize <= 0) return;
              const nextTotalPages = Math.max(
                1,
                Math.ceil(total / nextPageSize),
              );
              onChange?.(Math.min(page, nextTotalPages), nextPageSize);
            }}
          />
          <span className="whitespace-nowrap">条/页</span>
        </div>
      ) : (
        <span className="rounded-md border border-border bg-container px-2 py-1">
          {resolvedPageSize} 条/页
        </span>
      )}
    </div>
  );
}
export function Tabs({
  items,
  children,
  activeKey,
  defaultActiveKey,
  onChange,
  tabBarExtraContent,
  tabBarStyle,
  className,
}: {
  items?: Array<{
    key: string;
    label: React.ReactNode;
    children?: React.ReactNode;
  }>;
  children?: React.ReactNode;
  activeKey?: string;
  defaultActiveKey?: string;
  onChange?: (key: string) => void;
  tabBarExtraContent?: React.ReactNode;
  tabBarStyle?: React.CSSProperties;
  className?: string;
  [key: string]: unknown;
}) {
  const [internalKey, setInternalKey] = useState(
    defaultActiveKey ?? items?.[0]?.key ?? "",
  );
  const fallbackKey = items?.[0]?.key ?? "";
  const currentKey = activeKey ?? internalKey;
  const resolvedKey = items?.some((item) => item.key === currentKey)
    ? currentKey
    : fallbackKey;
  const handleChange = (key: string) => {
    if (activeKey == null) setInternalKey(key);
    onChange?.(key);
  };
  if (!items) return <div className={className}>{children}</div>;
  return (
    <PrimitiveTabs.Tabs
      value={resolvedKey}
      onValueChange={handleChange}
      className={cn("flex min-h-0 flex-1 flex-col", className)}
    >
      <div
        className="flex shrink-0 items-center justify-between overflow-x-auto overflow-y-hidden border-b border-border"
        style={tabBarStyle}
      >
        <PrimitiveTabs.TabsList className="h-8 gap-6 border-b-0">
          {items.map((item) => (
            <PrimitiveTabs.TabsTrigger key={item.key} value={item.key}>
              {item.label}
            </PrimitiveTabs.TabsTrigger>
          ))}
        </PrimitiveTabs.TabsList>
        {tabBarExtraContent ? (
          <div className="flex shrink-0 items-center">{tabBarExtraContent}</div>
        ) : null}
      </div>
      {items.map((item) => (
        <PrimitiveTabs.TabsContent
          key={item.key}
          value={item.key}
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden pt-2"
        >
          {item.children}
        </PrimitiveTabs.TabsContent>
      ))}
    </PrimitiveTabs.Tabs>
  );
}
export function Steps({
  items = [],
  current = 0,
  className,
}: {
  items?: Array<{ title?: React.ReactNode; description?: React.ReactNode }>;
  size?: string;
  current?: number;
  className?: string;
  [key: string]: any;
}) {
  const tooltipText = (value: React.ReactNode) =>
    typeof value === "string" || typeof value === "number"
      ? String(value)
      : undefined;
  return (
    <ol
      data-testid="app-steps"
      className={cn("flex w-full items-start text-sm", className)}
    >
      {items.map((it, i) => {
        const finished = current >= items.length || i < current;
        const active = current < items.length && i === current;
        const titleText = tooltipText(it.title);
        const descriptionText = tooltipText(it.description);
        return (
          <li
            key={i}
            className={cn(
              "flex min-w-0 items-start gap-2",
              i < items.length - 1 ? "flex-1 pr-3" : "shrink-0",
            )}
          >
            <span
              data-step-icon
              className={cn(
                "flex size-[22px] shrink-0 items-center justify-center rounded-full border bg-container text-xs leading-none",
                finished && "border-primary bg-primary text-white",
                active && "border-primary text-primary",
                !finished && !active && "border-slate-300 text-slate-400",
              )}
            >
              {finished ? "✓" : i + 1}
            </span>
            <span className="min-w-0 flex-1 -mt-0.5 block">
              <span data-step-title-row className="flex min-w-0 items-center">
                <OverflowTooltipText
                  title={titleText}
                  className={cn(
                    "shrink-0 text-[15px] leading-[22px]",
                    active
                      ? "font-semibold text-slate-900"
                      : finished
                        ? "text-slate-700"
                        : "text-slate-400",
                  )}
                >
                  {it.title}
                </OverflowTooltipText>
                {i < items.length - 1 ? (
                  <span
                    data-step-tail
                    className={cn(
                      "mx-3 h-px flex-1",
                      finished ? "bg-primary" : "bg-slate-200",
                    )}
                  />
                ) : null}
              </span>
              {it.description ? (
                <OverflowTooltipText
                  title={descriptionText}
                  wrapperClassName="mt-0.5 block"
                  className="block truncate text-sm leading-5 text-slate-500"
                >
                  {it.description}
                </OverflowTooltipText>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
function timelineTone(color?: string) {
  if (color === "green" || color === "success")
    return "border-emerald-500 bg-emerald-500";
  if (color === "orange" || color === "warning")
    return "border-orange-500 bg-orange-500";
  if (color === "purple") return "border-purple-500 bg-purple-500";
  if (color === "red" || color === "error") return "border-red-500 bg-red-500";
  return "border-primary bg-primary";
}
export function Timeline({
  items = [],
}: {
  items?: Array<{ children?: React.ReactNode; color?: string }>;
}) {
  return (
    <ol data-testid="app-timeline" className="space-y-0 text-sm">
      {items.map((it, i) => (
        <li key={i} className="relative min-h-9 pb-4 pl-6 last:pb-0">
          {i < items.length - 1 ? (
            <span className="absolute bottom-0 left-[5px] top-[14px] w-px bg-slate-200" />
          ) : null}
          <span
            data-timeline-dot
            className={cn(
              "absolute left-0 top-1.5 size-2.5 rounded-full border-2",
              timelineTone(it.color),
            )}
          />
          {it.children}
        </li>
      ))}
    </ol>
  );
}
export function List({
  dataSource = [],
  renderItem,
}: {
  dataSource?: any[];
  renderItem?: (item: any, index: number) => React.ReactNode;
  size?: string;
  [key: string]: any;
}) {
  return (
    <div className="grid gap-2">
      {dataSource.map((it, i) => (
        <div key={i}>{renderItem?.(it, i) ?? String(it)}</div>
      ))}
    </div>
  );
}
List.Item = ({
  children,
  className: _className,
}: {
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}) => <div className="rounded border border-border p-2">{children}</div>;
type TreeCheckState = {
  checked: boolean;
  indeterminate: boolean;
};

function TreeCheckbox({
  checked,
  indeterminate,
  disabled,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <label
      className={cn(
        "mr-1 inline-flex size-3.5 shrink-0 items-center justify-center",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      )}
    >
      <PrimitiveCheckbox
        checked={checked ? true : indeterminate ? "indeterminate" : false}
        aria-checked={indeterminate ? "mixed" : checked}
        disabled={disabled}
        className={cn(
          "size-3 rounded-[3px] border-slate-300 bg-container text-white data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary",
        )}
        onCheckedChange={(nextChecked) => {
          onChange({
            target: { checked: nextChecked === true },
          } as React.ChangeEvent<HTMLInputElement>);
        }}
      />
    </label>
  );
}

function collectCheckableTreeKeys(node: DataNode): Key[] {
  const self = node.disableCheckbox ? [] : [node.key];
  return [
    ...self,
    ...(node.children ?? []).flatMap((child) =>
      collectCheckableTreeKeys(child),
    ),
  ];
}
function getTreeCheckState(
  node: DataNode,
  checkedSet: Set<string>,
): TreeCheckState {
  const selfChecked = checkedSet.has(String(node.key));
  const childKeys = (node.children ?? [])
    .flatMap((child) => collectCheckableTreeKeys(child))
    .map(String);
  if (!childKeys.length) {
    return { checked: selfChecked, indeterminate: false };
  }
  const selectedChildCount = childKeys.filter((key) =>
    checkedSet.has(key),
  ).length;
  const allChildrenChecked = selectedChildCount === childKeys.length;
  const someChildrenChecked = selectedChildCount > 0;
  return {
    checked: allChildrenChecked || (selfChecked && !someChildrenChecked),
    indeterminate: someChildrenChecked && !allChildrenChecked,
  };
}
export function Tree<T extends DataNode>({
  treeData = [],
  onSelect,
  className,
  checkable,
  checkedKeys,
  selectedKeys,
  onCheck,
  expandedKeys,
  onExpand,
}: TreeProps<T>) {
  const keyMap = new Map<string, Key>();
  const collectKeyMap = (nodes: DataNode[]) => {
    for (const node of nodes) {
      keyMap.set(String(node.key), node.key);
      if (node.children?.length) collectKeyMap(node.children);
    }
  };
  collectKeyMap(treeData);
  const checkedSet = new Set(
    (Array.isArray(checkedKeys)
      ? checkedKeys
      : (checkedKeys?.checked ?? [])
    ).map(String),
  );
  const selectedSet = new Set((selectedKeys ?? []).map(String));
  const expandedSet = expandedKeys ? new Set(expandedKeys.map(String)) : null;
  const toggleCheck = (node: T, checked: boolean) => {
    if (node.disableCheckbox) return;
    const relatedKeys = collectCheckableTreeKeys(node).map(String);
    const next = new Set(checkedSet);
    for (const key of relatedKeys) {
      if (checked) next.add(key);
      else next.delete(key);
    }
    onCheck?.(
      [...next].map((key) => keyMap.get(key) ?? key),
      { node, checked },
    );
  };
  const toggleExpand = (node: T) => {
    const next = new Set(expandedKeys ?? []);
    if (next.has(node.key)) next.delete(node.key);
    else next.add(node.key);
    onExpand?.([...next]);
  };
  const walk = (nodes: T[], level = 0) => (
    <ul
      className="m-0 list-none p-0"
      style={level > 0 ? { paddingLeft: 18 } : undefined}
    >
      {nodes.map((node) => {
        const hasChildren = Boolean(node.children?.length);
        const expanded = expandedSet ? expandedSet.has(String(node.key)) : true;
        const checkState = getTreeCheckState(node, checkedSet);
        const selected = selectedSet.has(String(node.key));
        const selectable = node.selectable !== false && !node.disabled;
        return (
          <li key={String(node.key)} className="m-0 p-0">
            <div className="flex min-h-6 items-center px-1 text-sm">
              {hasChildren ? (
                <button
                  type="button"
                  className="flex h-6 w-5 shrink-0 items-center justify-center text-slate-400 transition-colors hover:text-primary"
                  onClick={() => toggleExpand(node)}
                  aria-label={expanded ? "收起" : "展开"}
                >
                  <span
                    className={cn(
                      "h-0 w-0 border-y-[4px] border-l-[5px] border-y-transparent border-l-current transition-transform duration-150",
                      expanded && "rotate-90",
                    )}
                  />
                </button>
              ) : (
                <span className="h-6 w-5 shrink-0" />
              )}
              {checkable ? (
                <TreeCheckbox
                  checked={checkState.checked}
                  indeterminate={checkState.indeterminate}
                  disabled={Boolean(node.disableCheckbox)}
                  onChange={(event) => toggleCheck(node, event.target.checked)}
                />
              ) : null}
              <div
                onClick={(event) => {
                  if (!selectable) return;
                  // 自定义 title 内已处理点击时，避免重复触发 onSelect
                  if (event.target !== event.currentTarget) return;
                  onSelect?.([node.key], { node });
                }}
                aria-selected={selected}
                className={cn(
                  "min-w-0 flex-1 rounded-md px-1 text-left text-sm leading-6 text-slate-700 transition-colors",
                  selectable &&
                    "cursor-pointer hover:bg-[#f5f5f5] hover:text-primary dark:hover:bg-primary/10 dark:hover:text-slate-100",
                  selected &&
                    "bg-[#e6f4ff] text-primary hover:bg-[#e6f4ff] dark:bg-primary/22 dark:text-slate-50 dark:font-semibold dark:hover:bg-primary/28",
                  !selectable && "cursor-default dark:text-slate-200",
                  selectable && !selected && "dark:text-slate-200",
                )}
              >
                {node.title ?? String(node.key)}
              </div>
            </div>
            {hasChildren && expanded
              ? walk(node.children as T[], level + 1)
              : null}
          </li>
        );
      })}
    </ul>
  );
  return <div className={className}>{walk(treeData)}</div>;
}
export function Drawer({
  open,
  visible,
  title,
  description,
  children,
  footer,
  onCancel,
  onOk,
  okText = "确定",
  cancelText = "取消",
  width,
  closable = true,
  maskClosable = true,
  className,
  bodyClassName,
  styles,
  placement = "right",
}: Parameters<typeof Modal>[0] & {
  placement?: "left" | "right" | "top" | "bottom";
}) {
  const isOpen = Boolean(open ?? visible);
  const contentStyle =
    width != null && (placement === "left" || placement === "right")
      ? {
          width: typeof width === "number" ? `${width}px` : width,
          maxWidth: "90vw",
        }
      : undefined;
  const resolvedDescription =
    description ??
    (typeof title === "string" && title.trim().length > 0
      ? `${title} 抽屉`
      : "抽屉内容");
  return (
    <Sheet
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel?.();
      }}
    >
      <SheetContent
        side={placement}
        onClose={onCancel}
        showCloseButton={closable}
        className={cn("p-0", className)}
        style={contentStyle}
        onEscapeKeyDown={(event) => {
          if (!closable) event.preventDefault();
        }}
        onPointerDownOutside={(event) => {
          if (!closable || !maskClosable) event.preventDefault();
        }}
      >
        <div className="flex h-full min-h-0 flex-col">
          {title ? (
            <SheetHeader className="mb-0 border-b border-border px-5 pb-4 pr-10 pt-5">
              <SheetTitle>{title}</SheetTitle>
              <SheetDescription className="sr-only">
                {resolvedDescription}
              </SheetDescription>
            </SheetHeader>
          ) : null}
          <div
            className={cn(
              "min-h-0 flex-1 overflow-auto px-5 py-4",
              bodyClassName,
            )}
            style={styles?.body}
          >
            {children}
          </div>
          {footer !== null ? (
            <SheetFooter className="mt-0 border-t border-border px-5 py-3">
              {footer ?? (
                <>
                  <Button variant="outline" onClick={onCancel}>
                    {cancelText}
                  </Button>
                  <Button onClick={onOk}>{okText}</Button>
                </>
              )}
            </SheetFooter>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
export function Row({
  children,
  className,
  gutter = 12,
  style,
}: React.HTMLAttributes<HTMLDivElement> & {
  gutter?: number | number[];
  [key: string]: any;
}) {
  const [horizontalGap, verticalGap] = Array.isArray(gutter)
    ? [gutter[0] ?? 0, gutter[1] ?? gutter[0] ?? 0]
    : [gutter, gutter];
  return (
    <div
      className={cn("grid grid-cols-24", className)}
      style={{ gap: `${verticalGap}px ${horizontalGap}px`, ...style }}
    >
      {children}
    </div>
  );
}
export function Col({
  children,
  span,
  md,
  className,
}: React.HTMLAttributes<HTMLDivElement> & {
  span?: number;
  md?: number;
  xs?: number;
  [key: string]: any;
}) {
  return (
    <div
      className={className}
      style={{
        gridColumn: `span ${md ?? span ?? 24} / span ${md ?? span ?? 24}`,
      }}
    >
      {children}
    </div>
  );
}
export function Image(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img {...props} />;
}
function typographyTone(type?: string) {
  if (type === "secondary") return "text-slate-500";
  if (type === "danger") return "text-error";
  if (type === "success") return "text-emerald-600";
  if (type === "warning") return "text-orange-600";
  return undefined;
}
export const Typography = {
  Text: ({ children, className, strong, type }: any) => (
    <span
      className={cn(typographyTone(type), strong && "font-semibold", className)}
    >
      {children}
    </span>
  ),
  Title: ({ children, className }: any) => (
    <h3 className={className}>{children}</h3>
  ),
  Paragraph: ({ children, className, type }: any) => (
    <p className={cn(typographyTone(type), className)}>{children}</p>
  ),
};
export const Result = ({
  title,
  subTitle,
  extra,
}: {
  status?: string;
  title?: React.ReactNode;
  subTitle?: React.ReactNode;
  extra?: React.ReactNode;
  [key: string]: any;
}) => (
  <div className="flex min-h-60 flex-col items-center justify-center gap-3 text-center">
    <h2 className="text-lg font-semibold">{title}</h2>
    <p className="text-sm text-gray-500">{subTitle}</p>
    {extra}
  </div>
);
export function Segmented({
  options = [],
  value,
  onChange,
}: {
  options?: Array<string | { label: React.ReactNode; value: string | number }>;
  value?: string | number;
  onChange?: (value: any) => void;
  [key: string]: any;
}) {
  return (
    <div className="inline-flex rounded-md border border-border p-1">
      {options.map((option) => {
        const v = typeof option === "string" ? option : option.value;
        const label = typeof option === "string" ? option : option.label;
        return (
          <button
            type="button"
            key={String(v)}
            className={cn(
              "rounded px-2 py-1 text-sm",
              String(value) === String(v) && "bg-primary text-white",
            )}
            onClick={() => onChange?.(v)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
export const message = {
  success: (m: React.ReactNode) => toast.success(String(m)),
  error: (m: React.ReactNode) => toast.error(String(m)),
  warning: (m: React.ReactNode) => toast.warning(String(m)),
  info: (m: React.ReactNode) => toast.info(String(m)),
};
export const notification = {
  info: ({
    message: m,
    description,
  }: {
    message?: React.ReactNode;
    description?: React.ReactNode;
  }) => toast.info(String(m ?? ""), { description }),
};
Upload.LIST_IGNORE = "__LIST_IGNORE__";
export const App = Object.assign(
  ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  { useApp: () => ({ message, notification, modal: Modal }) },
);
export default {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Space,
  Select: AppSelect,
  Popconfirm,
  Tag,
  Checkbox,
  Radio,
  Tooltip,
  Spin,
  Empty,
  Progress,
  Upload,
  DatePicker,
  Table,
  Pagination,
  Tabs,
  Steps,
  Timeline,
  List,
  Tree,
  Drawer,
  App,
};
