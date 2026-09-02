import type { HTMLAttributes, Key, MouseEvent, ReactNode } from "react";

export type TableCellProps = {
  className?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  [key: string]: unknown;
};

export type TablePaginationConfig = {
  current?: number;
  pageSize?: number;
  total?: number;
  showSizeChanger?: boolean;
  pageSizeOptions?: number[];
  showTotal?: (total: number) => ReactNode;
  onChange?: (page: number, pageSize: number) => void;
};

export type DataTableColumn<T = unknown> = {
  key: string;
  title: ReactNode;
  dataIndex?: string | (string | number)[];
  width?: number;
  ellipsis?: boolean;
  align?: "left" | "center" | "right";
  fixed?: false | "left" | "right";
  render?: (value: unknown, record: T, index: number) => ReactNode;
  onCell?: (record: T, rowIndex?: number) => TableCellProps;
  filter?: {
    placeholder?: string;
    value?: string;
    onChange?: (value: string | undefined) => void;
    predicate?: (value: string, record: T) => boolean;
  };
  sorter?: (a: T, b: T) => number;
};

/** 可配置表格列定义（业务侧传入） */
export interface TableColumnDef<T = unknown> {
  key: string;
  title: string;
  dataIndex?: string | (string | number)[];
  width?: number;
  ellipsis?: boolean;
  align?: "left" | "center" | "right";
  defaultVisible?: boolean;
  defaultFixed?: false | "left" | "right";
  hideable?: boolean;
  render?: (value: unknown, record: T, index: number) => ReactNode;
  onCell?: DataTableColumn<T>["onCell"];
  filterable?: boolean;
  filterDefaultOn?: boolean;
  sortable?: boolean;
  sortDefaultOn?: boolean;
  filterPlaceholder?: string;
  getFilterText?: (value: unknown, record: T) => string;
  getSortValue?: (value: unknown, record: T) => string | number | null | undefined;
  copyable?: boolean;
  copyDefaultOn?: boolean;
  getCopyText?: (value: unknown, record: T) => string;
}

/** 列偏好（由后端 /me/table-preferences 按用户持久化） */
export interface ColumnPreferences {
  visibility: Record<string, boolean>;
  fixed: Record<string, false | "left" | "right">;
  filterOn: Record<string, boolean>;
  sortOn: Record<string, boolean>;
  copyOn: Record<string, boolean>;
  order: string[];
}

export interface ConfigurableDataTableProps<T = unknown> {
  storageKey: string;
  columnDefs: TableColumnDef<T>[];
  /**
   * 有 scroll.y 时是否撑满父容器。默认 true（主列表铺满）。
   * 样品工作台等「按行数贴合内容」场景传 false，避免表体外再被 h-full/flex-1 撑出空白滚动区。
   */
  fillHeight?: boolean;
  selectedRowKey?: Key | null;
  onSelectedRowChange?: (key: Key | null, record: T | null) => void;
  selectedRowKeys?: Key[];
  onSelectedRowKeysChange?: (keys: Key[], records: T[]) => void;
  preserveSelectedRowKeys?: boolean;
  /** 左侧筛选区；传入后 toolbarActions 固定渲染到右侧操作区 */
  toolbarFilters?: ReactNode;
  toolbarActions?: ReactNode;
  columnSettingsTitle?: string;
  showColumnSettingsTrigger?: boolean;
  showSerialColumn?: boolean;
  serverFilterColumnKeys?: string[];
  serverFilterValues?: Record<string, string | undefined>;
  onServerFilterChange?: (columnKey: string, value: string | undefined) => void;
  dataSource?: T[];
  rowKey?: string | ((record: T) => Key);
  loading?: boolean;
  pagination?: false | TablePaginationConfig;
  scroll?: { x?: number | string | true; y?: number | string };
  className?: string;
  size?: "small" | "middle" | "large";
  bordered?: boolean;
  onRow?: (record: T, index?: number) => HTMLAttributes<HTMLTableRowElement>;
  rowClassName?: string | ((record: T, index: number) => string);
}
