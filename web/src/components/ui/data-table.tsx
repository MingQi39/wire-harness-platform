/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Key,
  type ReactNode,
} from "react";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  FilterIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { Empty } from "./empty";
import { Input } from "./input";
import { OverflowTooltip } from "./overflow-tooltip";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./pagination";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { ApiSelect } from "@/components/ApiSelect";
import { Spinner } from "./spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import {
  DEFAULT_DATA_COLUMN_WIDTH_PX,
  MIN_RESIZABLE_COLUMN_WIDTH_PX,
  useDataTableColumnResize,
} from "./use-data-table-column-resize";

const TABLE_HEADER_HEIGHT_PX = 26;
const MULTIPLE_SELECTION_COLUMN_WIDTH_PX = 32;
const SINGLE_SELECTION_COLUMN_WIDTH_PX = 28;
const DEFAULT_UNCONTROLLED_PAGE_SIZE = 10;
const DEFAULT_PAGE_SIZE_OPTIONS = [20, 50, 100, 200];
const SMALL_TABLE_PAGE_SIZE_OPTIONS = [5, 10, 20];
const FILTER_PANEL_WIDTH_PX = 208;
const HEADER_CHAR_WIDTH_PX = 14;
const HEADER_HORIZONTAL_PADDING_PX = 16;
const HEADER_CONTROL_WIDTH_PX = 22;
const ADAPTIVE_COLUMN_MIN_WIDTH_PX = 64;
const DATE_COLUMN_MIN_WIDTH_PX = 112;
const DATE_COLUMN_TITLE_PATTERN = /(日期|有效期)/;
const DATE_COLUMN_FIELD_PATTERN = /(?:^|[_.-])date(?:$|[_.-])|valid_until/i;

export type DataTableColumn<T> = {
  id?: string;
  accessorKey?: string;
  header: ReactNode;
  width?: number;
  ellipsis?: boolean;
  align?: "left" | "center" | "right";
  fixed?: "left" | "right";
  cell?: (row: T, index: number) => ReactNode;
  onCell?: (
    row: T,
    index: number,
  ) => React.TdHTMLAttributes<HTMLTableCellElement>;
  filter?: {
    placeholder?: string;
    value?: string;
    onChange?: (value: string | undefined) => void;
    predicate?: (value: string, row: T) => boolean;
  };
  sorter?: (a: T, b: T) => number;
  [key: string]: any;
};

type DataTableScroll = {
  x?: number | string | true;
  y?: number | string;
};

type DataTablePagination =
  | false
  | {
      page?: number;
      current?: number;
      pageSize?: number;
      total?: number;
      showSizeChanger?: boolean;
      pageSizeOptions?: number[];
      showTotal?: (total: number) => ReactNode;
      onChange?: (page: number, pageSize: number) => void;
    };

type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey?: string | ((row: T) => string | number);
  loading?: boolean;
  selectedRowKeys?: Key[];
  preserveSelectedRowKeys?: boolean;
  onSelectedRowKeysChange?: (keys: Key[], rows: T[]) => void;
  onRowClick?: (row: T) => void;
  onRow?: (row: T, index: number) => React.HTMLAttributes<HTMLTableRowElement>;
  rowClassName?: string | ((row: T, index: number) => string);
  selectionMode?: "single" | "multiple";
  pagination?: DataTablePagination;
  scroll?: DataTableScroll;
  className?: string;
  tableContainerClassName?: string;
  emptyText?: ReactNode;
};

function toCssLength(value: number | string | undefined) {
  if (value == null) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}

/** viewport 使用 border-box + 上下各 1px border；高度若不补偿，内容会被挤出 2px 假纵向滚动条 */
const TABLE_VIEWPORT_BORDER_Y_PX = 2;

function getTableViewportHeight(scrollY: number | string | undefined) {
  if (scrollY === "auto") return undefined;
  const bodyHeight = toCssLength(scrollY);
  return bodyHeight
    ? `calc(${bodyHeight} + ${TABLE_HEADER_HEIGHT_PX}px + ${TABLE_VIEWPORT_BORDER_Y_PX}px)`
    : undefined;
}

function getColumnWidthStyle(
  width: number | undefined,
  locked = true,
): CSSProperties {
  if (typeof width !== "number") return {};
  if (!locked) return { width };
  return { width, minWidth: width, maxWidth: width };
}

function getColumnEffectiveWidth<T>(
  column: DataTableColumn<T>,
): number | undefined {
  const dateMinWidth = isDateLikeColumn(column) ? DATE_COLUMN_MIN_WIDTH_PX : 0;
  if (typeof column.width !== "number") return dateMinWidth || undefined;
  const text = getHeaderText(column.header);
  const controlCount =
    Number(Boolean(column.sorter)) + Number(Boolean(column.filter));
  const baseWidth = Math.max(column.width, dateMinWidth);
  if (controlCount === 0) return baseWidth;
  const readableWidth =
    text.length * HEADER_CHAR_WIDTH_PX +
    controlCount * HEADER_CONTROL_WIDTH_PX +
    HEADER_HORIZONTAL_PADDING_PX;
  return Math.max(baseWidth, readableWidth);
}

function getAdaptiveColumnMinWidth<T>(
  column: DataTableColumn<T>,
  width: number,
): number {
  if (column.fixed || column.header === "操作") return width;
  if (isDateLikeColumn(column))
    return Math.min(width, DATE_COLUMN_MIN_WIDTH_PX);
  if (column.ellipsis) return Math.min(width, MIN_RESIZABLE_COLUMN_WIDTH_PX);
  return Math.min(width, ADAPTIVE_COLUMN_MIN_WIDTH_PX);
}

function getColumnAlign<T>(column: DataTableColumn<T>) {
  return column.header === "操作" ? "center" : column.align;
}

function getColumnId<T>(column: DataTableColumn<T>, index: number) {
  return String(column.id ?? column.accessorKey ?? index);
}

function getHeaderText(header: ReactNode) {
  return typeof header === "string" || typeof header === "number"
    ? String(header)
    : "该列";
}

function isDateLikeColumn<T>(column: DataTableColumn<T>): boolean {
  const headerText = getHeaderText(column.header);
  if (DATE_COLUMN_TITLE_PATTERN.test(headerText)) return true;
  return (
    DATE_COLUMN_FIELD_PATTERN.test(String(column.id ?? "")) ||
    DATE_COLUMN_FIELD_PATTERN.test(String(column.accessorKey ?? ""))
  );
}

function renderDataTableCellContent(content: ReactNode) {
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

type SortState = {
  columnId: string;
  direction: "asc" | "desc";
} | null;

type OpenFilterState = {
  columnId: string;
  left: number;
  top: number;
} | null;

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

function getPageSizeOptions(options: number[] | undefined, pageSize: number) {
  const values = options?.length
    ? options
    : pageSize <= 20
      ? SMALL_TABLE_PAGE_SIZE_OPTIONS
      : DEFAULT_PAGE_SIZE_OPTIONS;
  return Array.from(new Set([...values, pageSize]))
    .filter((item) => Number.isFinite(item) && item > 0)
    .sort((a, b) => a - b);
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  loading,
  selectedRowKeys,
  preserveSelectedRowKeys,
  onSelectedRowKeysChange,
  onRowClick,
  onRow,
  rowClassName,
  selectionMode,
  pagination,
  scroll,
  className,
  tableContainerClassName,
  emptyText,
}: DataTableProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const tableViewportRef = useRef<HTMLDivElement>(null);
  const [tableViewportWidth, setTableViewportWidth] = useState(0);
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({});
  const [filterDrafts, setFilterDrafts] = useState<Record<string, string>>({});
  const [openFilter, setOpenFilter] = useState<OpenFilterState>(null);
  const [sortState, setSortState] = useState<SortState>(null);
  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(
    DEFAULT_UNCONTROLLED_PAGE_SIZE,
  );
  const { getColumnWidth, resizeColumnByDelta, startColumnResize } =
    useDataTableColumnResize();

  useEffect(() => {
    if (!openFilter) return undefined;

    const handleOutsideMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const root = rootRef.current;
      const clickedInsideFilter =
        root?.querySelector("[data-table-filter-panel]")?.contains(target) ===
        true;
      const clickedTrigger =
        root
          ?.querySelector(
            `[data-table-filter-trigger="${openFilter.columnId}"]`,
          )
          ?.contains(target) === true;
      if (!clickedInsideFilter && !clickedTrigger) setOpenFilter(null);
    };

    document.addEventListener("mousedown", handleOutsideMouseDown);
    return () =>
      document.removeEventListener("mousedown", handleOutsideMouseDown);
  }, [openFilter]);

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

  const getFilterValue = (column: DataTableColumn<T>, index: number) => {
    const id = getColumnId(column, index);
    return column.filter?.value ?? localFilters[id] ?? "";
  };

  const setFilterDraft = (columnId: string, value: string) => {
    setFilterDrafts((prev) => ({ ...prev, [columnId]: value }));
  };

  const applyFilter = (
    column: DataTableColumn<T>,
    index: number,
    rawValue: string,
  ) => {
    const id = getColumnId(column, index);
    const value = rawValue.trim();
    if (column.filter?.onChange) {
      column.filter.onChange(value === "" ? undefined : value);
    } else {
      setLocalFilters((prev) => {
        const next = { ...prev };
        if (value === "") delete next[id];
        else next[id] = value;
        return next;
      });
    }
    setFilterDraft(id, value);
    setOpenFilter(null);
  };

  const resetFilter = (column: DataTableColumn<T>, index: number) => {
    applyFilter(column, index, "");
  };

  const toggleSort = (column: DataTableColumn<T>, index: number) => {
    if (!column.sorter) return;
    const id = getColumnId(column, index);
    setSortState((current) => {
      if (current?.columnId !== id) return { columnId: id, direction: "asc" };
      if (current.direction === "asc")
        return { columnId: id, direction: "desc" };
      return null;
    });
  };

  const toggleFilterPanel = (
    column: DataTableColumn<T>,
    index: number,
    button: HTMLButtonElement,
  ) => {
    const id = getColumnId(column, index);
    setFilterDraft(id, getFilterValue(column, index));
    setOpenFilter((current) => {
      if (current?.columnId === id) return null;
      const rootRect = rootRef.current?.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const rootLeft = rootRect?.left ?? 0;
      const rootTop = rootRect?.top ?? 0;
      const rootWidth = rootRect?.width ?? FILTER_PANEL_WIDTH_PX;
      const maxLeft = Math.max(8, rootWidth - FILTER_PANEL_WIDTH_PX - 8);
      return {
        columnId: id,
        left: Math.max(
          8,
          Math.min(
            buttonRect.right - rootLeft - FILTER_PANEL_WIDTH_PX,
            maxLeft,
          ),
        ),
        top: buttonRect.bottom - rootTop + 4,
      };
    });
  };

  const getCurrentColumnWidth = (column: DataTableColumn<T>, index: number) => {
    const baseWidth =
      getColumnEffectiveWidth(column) ?? DEFAULT_DATA_COLUMN_WIDTH_PX;
    return getColumnWidth(getColumnId(column, index), baseWidth);
  };

  const processedData = useMemo(() => {
    let next = data;
    columns.forEach((column, index) => {
      const filter = column.filter;
      if (!filter || filter.onChange) return;
      const value = localFilters[getColumnId(column, index)];
      if (!value) return;
      next = next.filter((row) =>
        filter.predicate ? filter.predicate(value, row) : true,
      );
    });

    if (sortState) {
      const sortableColumn = columns.find(
        (column, index) => getColumnId(column, index) === sortState.columnId,
      );
      if (sortableColumn?.sorter) {
        next = [...next].sort((a, b) => {
          const result = sortableColumn.sorter?.(a, b) ?? 0;
          return sortState.direction === "asc" ? result : -result;
        });
      }
    }

    return next;
  }, [columns, data, localFilters, sortState]);

  const inferRowKey = useCallback((row: T, index: number): Key => {
    const record = row as Record<string, unknown>;
    const candidate = record.rowKey ?? record.key ?? record.id;
    if (typeof candidate === "string" || typeof candidate === "number") {
      return candidate;
    }
    return index;
  }, []);
  const keyOf = useCallback((row: T, index: number): Key => {
    if (typeof rowKey === "function") {
      const value = rowKey(row);
      if (typeof value === "string" || typeof value === "number") return value;
      return inferRowKey(row, index);
    }
    if (typeof rowKey === "string") {
      const value = (row as any)[rowKey];
      if (typeof value === "string" || typeof value === "number") return value;
      return inferRowKey(row, index);
    }
    return inferRowKey(row, index);
  }, [inferRowKey, rowKey]);
  useEffect(() => {
    if (
      !onSelectedRowKeysChange ||
      preserveSelectedRowKeys !== false ||
      !selectionMode ||
      !selectedRowKeys?.length
    ) {
      return;
    }
    const visibleKeySet = new Set(
      processedData.map((row, index) => String(keyOf(row, index))),
    );
    const nextKeys = selectedRowKeys.filter((key) =>
      visibleKeySet.has(String(key)),
    );
    if (nextKeys.length === selectedRowKeys.length) return;
    const nextRows = processedData.filter((row, index) =>
      nextKeys.some((key) => String(key) === String(keyOf(row, index))),
    );
    onSelectedRowKeysChange(nextKeys, nextRows);
  }, [
    keyOf,
    onSelectedRowKeysChange,
    preserveSelectedRowKeys,
    processedData,
    selectedRowKeys,
    selectionMode,
  ]);
  const pager = pagination || undefined;
  const pageSize = pager
    ? Math.max(1, pager.pageSize ?? internalPageSize)
    : DEFAULT_UNCONTROLLED_PAGE_SIZE;
  const total = pager
    ? (pager.total ?? processedData.length)
    : processedData.length;
  const serverPaginated = Boolean(
    pager && pager.total != null && pager.total > processedData.length,
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rawPage = pager ? (pager.page ?? pager.current ?? internalPage) : 1;
  const page = Math.min(Math.max(1, rawPage), totalPages);
  const pageStart = pager && !serverPaginated ? (page - 1) * pageSize : 0;
  const visibleData =
    pager && !serverPaginated
      ? processedData.slice(pageStart, pageStart + pageSize)
      : processedData;
  const selected = new Set((selectedRowKeys ?? []).map(String));
  const currentKeys = visibleData.map((row, index) =>
    keyOf(row, pageStart + index),
  );
  const currentSelectedCount = currentKeys.filter((key) =>
    selected.has(String(key)),
  ).length;
  const allCurrentSelected =
    currentKeys.length > 0 && currentSelectedCount === currentKeys.length;
  const someCurrentSelected = currentSelectedCount > 0 && !allCurrentSelected;
  const handlePaginationChange = (nextPage: number, nextPageSize: number) => {
    const normalizedPageSize =
      Number.isFinite(nextPageSize) && nextPageSize > 0
        ? Math.floor(nextPageSize)
        : pageSize;
    const nextTotalPages = Math.max(1, Math.ceil(total / normalizedPageSize));
    const normalizedPage = Math.min(Math.max(1, nextPage), nextTotalPages);
    if (pager?.page == null && pager?.current == null)
      setInternalPage(normalizedPage);
    if (pager?.pageSize == null) setInternalPageSize(normalizedPageSize);
    pager?.onChange?.(normalizedPage, normalizedPageSize);
  };
  const scrollYEnabled = scroll?.y != null;
  const scrollYFillsParent = scroll?.y === "auto";
  const tableViewportHeight = getTableViewportHeight(scroll?.y);
  const tableContainerStyle: CSSProperties | undefined = tableViewportHeight
    ? { height: tableViewportHeight, maxHeight: tableViewportHeight }
    : undefined;

  const toggle = (row: T, index: number) => {
    if (!onSelectedRowKeysChange || !selectionMode) return;
    const key = keyOf(row, index);
    if (selectionMode === "single" && selected.has(String(key))) return;
    const next =
      selectionMode === "single"
        ? [key]
        : selected.has(String(key))
          ? (selectedRowKeys ?? []).filter((k) => String(k) !== String(key))
          : [...(selectedRowKeys ?? []), key];
    const rows = processedData.filter((item, i) =>
      next.some((k) => String(k) === String(keyOf(item, i))),
    );
    onSelectedRowKeysChange(next, rows);
  };

  const toggleAllCurrent = () => {
    if (!onSelectedRowKeysChange || selectionMode !== "multiple") return;
    const currentKeySet = new Set(currentKeys.map(String));
    const base = (selectedRowKeys ?? []).filter(
      (key) => !currentKeySet.has(String(key)),
    );
    const next = allCurrentSelected ? base : [...base, ...currentKeys];
    const rows = processedData.filter((item, i) =>
      next.some((key) => String(key) === String(keyOf(item, i))),
    );
    onSelectedRowKeysChange(next, rows);
  };
  const selectedSingleValue =
    selectionMode === "single" &&
    selectedRowKeys != null &&
    selectedRowKeys.length > 0
      ? String(selectedRowKeys[0])
      : undefined;
  const handleSingleSelectionByValue = (nextValue: string) => {
    if (!onSelectedRowKeysChange || selectionMode !== "single") return;
    const matchedIndex = processedData.findIndex(
      (row, index) => String(keyOf(row, index)) === nextValue,
    );
    if (matchedIndex < 0) return;
    const targetRow = processedData[matchedIndex];
    if (targetRow == null) return;
    onSelectedRowKeysChange([keyOf(targetRow, matchedIndex)], [targetRow]);
  };
  const wrapTableForSingleSelection = (children: React.ReactNode) => {
    if (selectionMode !== "single") return <>{children}</>;
    return (
      <RadioGroup
        className={cn(
          "!block !gap-0",
          // 单选时 Table 外包一层 RadioGroup，需与 viewport 同高，否则空表横向条会贴在表头下
          scrollYEnabled && "h-full min-h-0",
        )}
        value={selectedSingleValue}
        onValueChange={handleSingleSelectionByValue}
      >
        {children}
      </RadioGroup>
    );
  };
  const scrollHostLayoutClass = scrollYEnabled ? "h-full min-h-0" : undefined;

  const paginationItems = buildPaginationItems(page, totalPages);
  const showPagination = Boolean(pager);
  const paginationPlaceholder = Boolean(pager && loading && total <= 0);
  const pageSizeOptions = getPageSizeOptions(pager?.pageSizeOptions, pageSize);
  const hasHorizontalScroll = scroll?.x != null;
  const selectionColumnWidth =
    selectionMode === "single"
      ? SINGLE_SELECTION_COLUMN_WIDTH_PX
      : MULTIPLE_SELECTION_COLUMN_WIDTH_PX;
  const isEmpty = processedData.length === 0;
  const columnWidths = columns.map((column, index) =>
    getCurrentColumnWidth(column, index),
  );
  const minWidth = columnWidths.reduce(
    (sum, width) => sum + width,
    selectionMode ? selectionColumnWidth : 0,
  );
  const adaptiveViewportWidth =
    tableViewportWidth > 1 ? tableViewportWidth - 1 : 0;
  // 未配置 scroll.x 时：列宽合计超出视口则按可读最小宽压缩。
  // 配置了 scroll.x 时：保留列宽并允许横向滚动，避免多列表被压到不可读。
  const canAdaptToViewport =
    !hasHorizontalScroll &&
    !isEmpty &&
    adaptiveViewportWidth > 0 &&
    minWidth > adaptiveViewportWidth;
  const adaptiveMinWidths = columns.map((column, index) =>
    getAdaptiveColumnMinWidth(
      column,
      columnWidths[index] ?? DEFAULT_DATA_COLUMN_WIDTH_PX,
    ),
  );
  const adaptiveMinTableWidth = adaptiveMinWidths.reduce(
    (sum, width) => sum + width,
    selectionMode ? selectionColumnWidth : 0,
  );
  const shouldFitToViewport =
    canAdaptToViewport && adaptiveMinTableWidth <= adaptiveViewportWidth;
  const shrinkCapacity = shouldFitToViewport
    ? columnWidths.reduce(
        (sum, width, index) =>
          sum + Math.max(0, width - (adaptiveMinWidths[index] ?? width)),
        0,
      )
    : 0;
  const shrinkDelta = shouldFitToViewport
    ? minWidth - adaptiveViewportWidth
    : 0;
  const renderedColumnWidths =
    shouldFitToViewport && shrinkCapacity > 0
      ? columnWidths.map((width, index) => {
          const minColumnWidth = adaptiveMinWidths[index] ?? width;
          const capacity = Math.max(0, width - minColumnWidth);
          if (capacity === 0) return width;
          return Math.max(
            minColumnWidth,
            width - (shrinkDelta * capacity) / shrinkCapacity,
          );
        })
      : columnWidths;
  const renderedTableWidth = shouldFitToViewport
    ? adaptiveViewportWidth
    : minWidth;
  // 空数据也要按列宽合计判断是否溢出：否则 scroll.x 场景下表头会被压成 100% 裁切
  //（例如「管理编号」只露出「管理编」），且无法横向滚动查看完整表头。
  // 溢出判断用实际 clientWidth，不用 adaptiveViewportWidth（viewport-1），
  // 否则「刚好贴合」会被误判成溢出，出现假横向滚动条。
  const horizontalOverflow =
    tableViewportWidth > 0 && renderedTableWidth > tableViewportWidth;
  const suppressHorizontalScrollbar =
    hasHorizontalScroll && !horizontalOverflow;
  const leftOffsets = new Map<number, number>();
  let nextLeftOffset =
    selectionMode && hasHorizontalScroll ? selectionColumnWidth : 0;
  columns.forEach((column, index) => {
    if (column.fixed !== "left") return;
    leftOffsets.set(index, nextLeftOffset);
    nextLeftOffset +=
      renderedColumnWidths[index] ??
      columnWidths[index] ??
      DEFAULT_DATA_COLUMN_WIDTH_PX;
  });
  const shouldKeepHorizontalWidth = hasHorizontalScroll;
  const tableStyle: CSSProperties = {
    minWidth: shouldKeepHorizontalWidth ? renderedTableWidth : "100%",
    width: shouldKeepHorizontalWidth ? undefined : "100%",
    tableLayout: "fixed",
  };
  const openFilterEntry =
    openFilter == null
      ? null
      : columns
          .map((column, index) => ({
            column,
            index,
            columnId: getColumnId(column, index),
          }))
          .find(
            (item) =>
              item.columnId === openFilter.columnId && item.column.filter,
          );

  return (
    <div
      ref={rootRef}
      className={cn("ui-data-table relative flex min-h-0 flex-col", className)}
    >
      <div
        className={cn(
          "ui-data-table-viewport relative min-h-[200px] overflow-hidden rounded-[10px] border border-border bg-container",
          scrollYEnabled && [
            "min-h-0 [&>div]:h-full",
            // 横纵都用 auto 时，横向条会挤占高度从而「假」出纵向条；
            // 分轴控制：x 按需，y 仅在内容超出时由浏览器绘制（配合 scroll.y 内容封顶）。
            // 暂无数据时关闭纵向滚动，避免空表仍露出滚动条轨道。
            isEmpty
              ? hasHorizontalScroll
                ? "[&>div]:overflow-x-auto [&>div]:overflow-y-hidden"
                : "[&>div]:overflow-hidden"
              : hasHorizontalScroll
                ? "[&>div]:overflow-x-auto [&>div]:overflow-y-auto"
                : "[&>div]:overflow-y-auto [&>div]:overflow-x-hidden",
            scrollYFillsParent ? "flex-1" : "shrink-0",
          ],
          suppressHorizontalScrollbar && "[&>div]:!overflow-x-hidden",
          tableContainerClassName,
        )}
        style={tableContainerStyle}
        ref={tableViewportRef}
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
        {wrapTableForSingleSelection(
          <Table
            wrapperClassName={cn(
              scrollHostLayoutClass,
              isEmpty
                ? hasHorizontalScroll && !suppressHorizontalScrollbar
                  ? "overflow-x-auto overflow-y-hidden"
                  : "overflow-hidden"
                : hasHorizontalScroll && !suppressHorizontalScrollbar
                  ? scrollYEnabled
                    ? "overflow-x-auto overflow-y-auto"
                    : "overflow-x-auto overflow-y-hidden"
                  : scrollYEnabled
                    ? "overflow-y-auto overflow-x-hidden"
                    : "overflow-x-hidden overflow-y-hidden",
            )}
            className="ui-data-table-table"
            style={tableStyle}
          >
            <TableHeader>
              <TableRow>
                {selectionMode ? (
                  <TableHead
                    style={{
                      width: selectionColumnWidth,
                      minWidth: selectionColumnWidth,
                      maxWidth: selectionColumnWidth,
                      ...(hasHorizontalScroll ? { left: 0 } : {}),
                    }}
                    className={cn(
                      "p-0 text-center align-middle",
                      scrollYEnabled && "sticky top-0 z-20",
                      hasHorizontalScroll &&
                        "sticky left-0 z-40 bg-primary-100 dark:bg-[#172131]",
                    )}
                  >
                    {selectionMode === "multiple" ? (
                      <div className="flex h-[26px] items-center justify-center">
                        <Checkbox
                          aria-label="选择当前页"
                          className="size-4 border-slate-300 dark:border-white/25 dark:bg-[#0f1720]"
                          checked={
                            allCurrentSelected
                              ? true
                              : someCurrentSelected
                                ? "indeterminate"
                                : false
                          }
                          onClick={(event) => event.stopPropagation()}
                          onCheckedChange={() => toggleAllCurrent()}
                        />
                      </div>
                    ) : null}
                  </TableHead>
                ) : null}
                {columns.map((column, index) => {
                  const leftOffset = leftOffsets.get(index);
                  const align = getColumnAlign(column);
                  const columnId = getColumnId(column, index);
                  const headerText = getHeaderText(column.header);
                  const activeFilterValue = getFilterValue(column, index);
                  const sortActive =
                    sortState?.columnId === columnId
                      ? sortState.direction
                      : undefined;
                  const SortIcon =
                    sortActive === "asc"
                      ? ArrowUpIcon
                      : sortActive === "desc"
                        ? ArrowDownIcon
                        : ArrowUpDownIcon;
                  const columnWidth =
                    renderedColumnWidths[index] ?? DEFAULT_DATA_COLUMN_WIDTH_PX;
                  const headerIsPositioned =
                    scrollYEnabled ||
                    column.fixed === "left" ||
                    column.fixed === "right";
                  return (
                    <TableHead
                      key={column.id ?? column.accessorKey ?? index}
                      aria-label={headerText}
                      style={{
                        ...getColumnWidthStyle(columnWidth, hasHorizontalScroll),
                        ...(leftOffset != null ? { left: leftOffset } : {}),
                      }}
                      className={cn(
                        !headerIsPositioned && "relative",
                        align === "center"
                          ? "text-center"
                          : align === "right"
                            ? "text-right"
                            : undefined,
                        scrollYEnabled && "sticky top-0 z-20",
                        column.fixed === "left" &&
                          "sticky z-30 bg-primary-100 dark:bg-[#172131]",
                        column.fixed === "right" &&
                          "sticky right-0 z-50 border-l border-primary-200 bg-primary-100 shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.18)] dark:border-primary/25 dark:bg-[#172131] dark:shadow-[-8px_0_10px_-8px_rgba(0,0,0,0.7)]",
                      )}
                    >
                      <div
                        className={cn(
                          "flex min-w-0 items-center gap-1",
                          align === "center"
                            ? "justify-center"
                            : align === "right"
                              ? "justify-end"
                              : "justify-start",
                        )}
                      >
                        <span className="shrink-0 whitespace-nowrap">
                          {column.header}
                        </span>
                        {column.sorter || column.filter ? (
                          <span className="flex shrink-0 items-center gap-0.5">
                            {column.sorter ? (
                              <button
                                type="button"
                                aria-label={`排序 ${headerText}`}
                                className={cn(
                                  "inline-flex size-5 items-center justify-center rounded text-slate-500 transition hover:bg-primary-50 hover:text-primary dark:text-slate-400 dark:hover:bg-primary/12 dark:hover:text-primary-200 [&_svg]:size-3",
                                  sortActive &&
                                    "bg-primary-50 text-primary dark:bg-primary/15 dark:text-primary-200",
                                )}
                                onClick={() => {
                                  toggleSort(column, index);
                                }}
                              >
                                <SortIcon />
                              </button>
                            ) : null}
                            {column.filter ? (
                              <span className="relative inline-flex">
                                <button
                                  type="button"
                                  data-table-filter-trigger={columnId}
                                  aria-label={`筛选 ${headerText}`}
                                  className={cn(
                                    "inline-flex size-5 items-center justify-center rounded text-slate-500 transition hover:bg-primary-50 hover:text-primary dark:text-slate-400 dark:hover:bg-primary/12 dark:hover:text-primary-200 [&_svg]:size-3",
                                    activeFilterValue &&
                                      "bg-primary-50 text-primary dark:bg-primary/15 dark:text-primary-200",
                                  )}
                                  onClick={(event) =>
                                    toggleFilterPanel(
                                      column,
                                      index,
                                      event.currentTarget,
                                    )
                                  }
                                >
                                  <FilterIcon />
                                </button>
                              </span>
                            ) : null}
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        role="separator"
                        aria-label={`调整 ${headerText} 列宽`}
                        aria-orientation="vertical"
                        aria-valuemin={MIN_RESIZABLE_COLUMN_WIDTH_PX}
                        aria-valuenow={columnWidth}
                        className="absolute inset-y-0 right-0 z-[1] w-2 translate-x-1/2 cursor-col-resize touch-none bg-transparent outline-none after:absolute after:inset-y-1.5 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-primary/35 hover:after:bg-primary focus-visible:after:bg-primary"
                        onMouseDown={(event) =>
                          startColumnResize(columnId, columnWidth, event)
                        }
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => {
                          if (
                            event.key !== "ArrowLeft" &&
                            event.key !== "ArrowRight"
                          )
                            return;
                          event.preventDefault();
                          resizeColumnByDelta(
                            columnId,
                            columnWidth,
                            event.key === "ArrowLeft" ? -8 : 8,
                          );
                        }}
                      />
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + (selectionMode ? 1 : 0)}
                    className="border-b-0 p-0"
                  >
                    <div className="h-px" />
                  </TableCell>
                </TableRow>
              ) : (
                visibleData.map((row, pageIndex) => {
                  const index = pageStart + pageIndex;
                  const key = keyOf(row, index);
                  const rowProps = onRow?.(row, index) ?? {};
                  const customRowClassName =
                    typeof rowClassName === "function"
                      ? rowClassName(row, index)
                      : rowClassName;
                  const handleRowClick: React.MouseEventHandler<
                    HTMLTableRowElement
                  > = (event) => {
                    rowProps.onClick?.(event);
                    if (!event.defaultPrevented) onRowClick?.(row);
                    if (
                      !event.defaultPrevented &&
                      selectionMode &&
                      onSelectedRowKeysChange
                    ) {
                      toggle(row, index);
                    }
                  };

                  return (
                    <TableRow
                      key={String(key)}
                      {...rowProps}
                      data-selected={selected.has(String(key))}
                      onClick={handleRowClick}
                      className={cn(
                        onRowClick ||
                          rowProps.onClick ||
                          (selectionMode && onSelectedRowKeysChange)
                          ? "cursor-pointer"
                          : undefined,
                        customRowClassName,
                        rowProps.className,
                      )}
                    >
                      {selectionMode ? (
                        <TableCell
                          style={{
                            width: selectionColumnWidth,
                            minWidth: selectionColumnWidth,
                            maxWidth: selectionColumnWidth,
                            ...(hasHorizontalScroll ? { left: 0 } : {}),
                          }}
                          className={cn(
                            "p-0 text-center align-middle",
                            hasHorizontalScroll &&
                              "sticky left-0 z-20 bg-container group-hover:bg-primary-50/60 group-data-[selected=true]:bg-primary-100/70 dark:group-hover:bg-primary/10 dark:group-data-[selected=true]:bg-primary/16",
                          )}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (!onSelectedRowKeysChange) return;
                            if (selectionMode === "single") {
                              toggle(row, index);
                              return;
                            }
                            if (selectionMode === "multiple") {
                              toggle(row, index);
                            }
                          }}
                        >
                          <div className="flex h-[26px] items-center justify-center">
                            {selectionMode === "single" ? (
                              <RadioGroupItem
                                value={String(key)}
                                className="size-4 border-slate-300 dark:border-white/25 dark:bg-[#0f1720]"
                                onClick={(event) => event.stopPropagation()}
                              />
                            ) : (
                              <Checkbox
                                checked={selected.has(String(key))}
                                className="size-4 border-slate-300 dark:border-white/25 dark:bg-[#0f1720]"
                                onClick={(event) => event.stopPropagation()}
                                onCheckedChange={(nextChecked) => {
                                  if (
                                    (nextChecked === true) !==
                                    selected.has(String(key))
                                  ) {
                                    toggle(row, index);
                                  }
                                }}
                              />
                            )}
                          </div>
                        </TableCell>
                      ) : null}
                      {columns.map((column, columnIndex) => {
                        const value = column.accessorKey
                          ? (row as any)[column.accessorKey]
                          : undefined;
                        const renderedCellContent = column.cell
                          ? column.cell(row, index)
                          : String(value ?? "");
                        const cellProps = column.onCell?.(row, index) ?? {};
                        const {
                          className: cellClassName,
                          style: cellStyle,
                          ...restCellProps
                        } = cellProps;
                        const leftOffset = leftOffsets.get(columnIndex);
                        const align = getColumnAlign(column);
                        const columnWidth =
                          renderedColumnWidths[columnIndex] ??
                          DEFAULT_DATA_COLUMN_WIDTH_PX;
                        return (
                          <TableCell
                            key={column.id ?? column.accessorKey ?? columnIndex}
                            {...restCellProps}
                            style={{
                              ...getColumnWidthStyle(
                                columnWidth,
                                hasHorizontalScroll,
                              ),
                              ...cellStyle,
                              ...(leftOffset != null
                                ? { left: leftOffset }
                                : {}),
                            }}
                            className={cn(
                              "overflow-hidden",
                              align === "center"
                                ? "text-center"
                                : align === "right"
                                  ? "text-right"
                                  : undefined,
                              column.fixed === "left" &&
                                "sticky z-10 bg-container group-hover:bg-primary-50/60 group-data-[selected=true]:bg-primary-100/70 dark:group-hover:bg-primary/10 dark:group-data-[selected=true]:bg-primary/16",
                              column.fixed === "right" &&
                                "sticky right-0 z-10 bg-container shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.16)] group-hover:bg-primary-50/60 group-data-[selected=true]:bg-primary-100/70 dark:shadow-[-8px_0_10px_-8px_rgba(0,0,0,0.6)] dark:group-hover:bg-primary/10 dark:group-data-[selected=true]:bg-primary/16",
                              cellClassName,
                            )}
                          >
                            {renderDataTableCellContent(renderedCellContent)}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>,
        )}
        {processedData.length === 0 && !loading ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 top-[26px] flex items-center justify-center px-4 py-6">
            {typeof emptyText === "string" ||
            typeof emptyText === "number" ||
            emptyText == null ? (
              <Empty
                size="md"
                variant="bare"
                title={emptyText ?? "暂无数据"}
                description="尝试调整筛选条件或新增数据"
              />
            ) : (
              emptyText
            )}
          </div>
        ) : null}
      </div>
      {openFilter && openFilterEntry?.column.filter ? (
        <div
          data-table-filter-panel
          className="absolute z-50 w-52 rounded-md border border-border bg-container p-2 text-xs shadow-md dark:shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
          style={{ left: openFilter.left, top: openFilter.top }}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <div className="flex flex-col gap-2">
            <Input
              placeholder={
                openFilterEntry.column.filter.placeholder ?? "关键字"
              }
              value={
                filterDrafts[openFilterEntry.columnId] ??
                getFilterValue(openFilterEntry.column, openFilterEntry.index)
              }
              onChange={(event) =>
                setFilterDraft(openFilterEntry.columnId, event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyFilter(
                    openFilterEntry.column,
                    openFilterEntry.index,
                    filterDrafts[openFilterEntry.columnId] ??
                      getFilterValue(
                        openFilterEntry.column,
                        openFilterEntry.index,
                      ),
                  );
                }
              }}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() =>
                  applyFilter(
                    openFilterEntry.column,
                    openFilterEntry.index,
                    filterDrafts[openFilterEntry.columnId] ??
                      getFilterValue(
                        openFilterEntry.column,
                        openFilterEntry.index,
                      ),
                  )
                }
              >
                筛选
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  resetFilter(openFilterEntry.column, openFilterEntry.index)
                }
              >
                重置
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {showPagination ? (
        <div
          data-pagination
          aria-hidden={paginationPlaceholder || undefined}
          className="flex shrink-0 flex-wrap justify-end gap-y-1 px-1.5 py-0 text-xs text-gray-600 dark:text-slate-300"
        >
          <div
            className={cn(
              "flex max-w-full flex-wrap items-center justify-end gap-2",
              paginationPlaceholder && "invisible",
            )}
          >
            <span>
              {pager?.showTotal ? pager.showTotal(total) : `共 ${total} 条`}
            </span>
            <Pagination className="mx-0 w-auto justify-start">
              <PaginationContent className="gap-1">
                <PaginationItem>
                  <PaginationPrevious
                    aria-label="上一页"
                    disabled={page <= 1}
                    className="h-7 min-w-7 px-0 text-gray-400 hover:bg-primary-50 hover:text-primary dark:text-slate-500 dark:hover:bg-primary/12 dark:hover:text-primary-200"
                    onClick={() => handlePaginationChange(page - 1, pageSize)}
                  />
                </PaginationItem>
                {paginationItems.map((item) =>
                  typeof item === "number" ? (
                    <PaginationItem key={item}>
                      <PaginationLink
                        aria-label={`第 ${item} 页`}
                        isActive={item === page}
                        className={cn(
                          "h-6 min-w-6 px-1",
                          item === page
                            ? undefined
                            : "border-transparent text-gray-500 dark:text-slate-400 dark:hover:border-primary/35 dark:hover:text-primary-200",
                        )}
                        onClick={() => {
                          if (item !== page)
                            handlePaginationChange(item, pageSize);
                        }}
                      >
                        {item}
                      </PaginationLink>
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={item}>
                      <PaginationEllipsis className="h-6 w-6 text-gray-400 dark:text-slate-500" />
                    </PaginationItem>
                  ),
                )}
                <PaginationItem>
                  <PaginationNext
                    aria-label="下一页"
                    disabled={page >= totalPages}
                    className="h-7 min-w-7 px-0 text-gray-400 hover:bg-primary-50 hover:text-primary dark:text-slate-500 dark:hover:bg-primary/12 dark:hover:text-primary-200"
                    onClick={() => handlePaginationChange(page + 1, pageSize)}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            {pager?.showSizeChanger !== false ? (
              <div className="flex h-7 shrink-0 items-center gap-1">
                <ApiSelect
                  value={String(pageSize)}
                  options={pageSizeOptions.map((option) => ({
                    value: String(option),
                    label: option,
                  }))}
                  className="h-7 w-[72px]"
                  onChange={(nextValue) => {
                    const nextPageSize = Number(nextValue);
                    if (!Number.isFinite(nextPageSize) || nextPageSize <= 0)
                      return;
                    const nextTotalPages = Math.max(
                      1,
                      Math.ceil(total / nextPageSize),
                    );
                    handlePaginationChange(
                      Math.min(page, nextTotalPages),
                      nextPageSize,
                    );
                  }}
                />
                <span className="whitespace-nowrap">条/页</span>
              </div>
            ) : (
              <span className="rounded-md border border-border bg-container px-2 py-1">
                {pageSize} 条/页
              </span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
