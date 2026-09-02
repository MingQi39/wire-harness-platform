import type { ReactNode } from "react";

import { OverflowTooltip } from "@/components/ui/overflow-tooltip";
import { cn } from "@/lib/utils";
import type { ColumnPreferences, DataTableColumn, TableColumnDef } from "./types";
import { getCellValue, getCopyStringForCell, normalizeOrder } from "./columnUtils";
import { TableCellWithCopy } from "./TableCellWithCopy";
import {
  isEmptyTableCellValue,
  TABLE_EMPTY_CELL_PLACEHOLDER,
  renderTableEmptyCellFallback,
} from "@/components/tableEmptyCell";

export type ServerFilterConfig = {
  keys: Set<string>;
  values: Record<string, string | undefined>;
  onChange: (columnKey: string, value: string | undefined) => void;
};

function renderEllipsisTooltip(text: string): ReactNode {
  return (
    <OverflowTooltip content={text} className="block truncate">
      {text}
    </OverflowTooltip>
  );
}

/** 由列定义 + 用户偏好生成 TanStack Table 渲染列（ConfigurableDataTable 与业务表共用） */
export function buildDataTableColumns<T>(
  defs: TableColumnDef<T>[],
  prefs: ColumnPreferences,
  serverFilter?: ServerFilterConfig,
): DataTableColumn<T>[] {
  const orderedKeys = normalizeOrder(
    prefs.order,
    defs.map((d) => d.key),
  );
  const defMap = Object.fromEntries(defs.map((d) => [d.key, d])) as Record<string, TableColumnDef<T>>;

  const left: DataTableColumn<T>[] = [];
  const center: DataTableColumn<T>[] = [];
  const right: DataTableColumn<T>[] = [];

  for (const key of orderedKeys) {
    const def = defMap[key];
    if (!def) continue;
    if (def.hideable !== false && prefs.visibility[key] === false) continue;

    const fixedPref = prefs.fixed[key] ?? def.defaultFixed ?? false;
    const fixed: "left" | "right" | undefined =
      fixedPref === "left" ? "left" : fixedPref === "right" ? "right" : undefined;

    const customRender = def.render;
    const useEllipsisTooltip = def.ellipsis === true;

    let render: DataTableColumn<T>["render"];
    if (customRender) {
      render = (value, record, index) => {
        const rendered = renderTableEmptyCellFallback(customRender(value, record, index));
        if (useEllipsisTooltip && (typeof rendered === "string" || typeof rendered === "number")) {
          const text = String(rendered);
          if (text === TABLE_EMPTY_CELL_PLACEHOLDER || isEmptyTableCellValue(text)) return rendered;
          return renderEllipsisTooltip(text);
        }
        return rendered;
      };
    } else if (useEllipsisTooltip) {
      render = (value: unknown) => {
        if (isEmptyTableCellValue(value)) return renderTableEmptyCellFallback(null);
        const text = String(value);
        return renderEllipsisTooltip(text);
      };
    } else {
      render = (value: unknown) => renderTableEmptyCellFallback(value as ReactNode);
    }

    if (prefs.copyOn[key] && def.copyable !== false) {
      const inner = render;
      render = (value, record, index) => {
        const text = getCopyStringForCell(def, value, record);
        const node = inner ? (inner(value, record, index) as ReactNode) : null;
        return <TableCellWithCopy copyText={text}>{node}</TableCellWithCopy>;
      };
    }

    const onCell: DataTableColumn<T>["onCell"] | undefined =
      prefs.copyOn[key] && def.copyable !== false
        ? (record, rowIndex) => {
            const base = def.onCell?.(record, rowIndex) ?? {};
            return {
              ...base,
              className: cn(base.className, "group/ctcell"),
            };
          }
        : def.onCell;

    const title = serverFilter?.keys.has(key) && serverFilter.values[key] ? `${def.title} *` : def.title;
    const col: DataTableColumn<T> = {
      key: def.key,
      title,
      dataIndex: def.dataIndex,
      width: def.width,
      ellipsis: def.ellipsis,
      align: def.align,
      render,
      fixed,
      ...(onCell ? { onCell } : {}),
      ...(def.title === "操作" ? { align: "center" } : {}),
    };

    if (prefs.filterOn[key] && def.dataIndex != null && def.filterable !== false) {
      const useServer = serverFilter?.keys.has(key) === true;
      const filterPlaceholder = def.filterPlaceholder ?? "关键字";
      col.filter = {
        placeholder: filterPlaceholder,
        ...(useServer && serverFilter
          ? {
              value: serverFilter.values[key] ?? "",
              onChange: (value) => serverFilter.onChange(key, value),
            }
          : {
              predicate: (value, record) =>
                String(def.getFilterText?.(getCellValue(record, def.dataIndex), record) ?? getCellValue(record, def.dataIndex) ?? "")
                  .toLowerCase()
                  .includes(value.toLowerCase()),
            }),
      };
    }

    if (prefs.sortOn[key] && def.dataIndex != null && def.sortable !== false) {
      col.sorter = (a, b) => {
        const rawA = getCellValue(a, def.dataIndex);
        const rawB = getCellValue(b, def.dataIndex);
        const va = def.getSortValue?.(rawA, a) ?? rawA;
        const vb = def.getSortValue?.(rawB, b) ?? rawB;
        const sa = String(va ?? "");
        const sb = String(vb ?? "");
        if (!Number.isNaN(Number(sa)) && !Number.isNaN(Number(sb)) && sa !== "" && sb !== "") {
          return Number(sa) - Number(sb);
        }
        return sa.localeCompare(sb, "zh-CN");
      };
    }

    if (fixed === "left") left.push(col);
    else if (fixed === "right") right.push(col);
    else center.push(col);
  }

  return [...left, ...center, ...right];
}
