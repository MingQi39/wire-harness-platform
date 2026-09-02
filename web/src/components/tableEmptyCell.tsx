import type { ReactNode } from "react";

export const TABLE_EMPTY_CELL_PLACEHOLDER = "-";

export function isEmptyTableCellValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value !== "string") return false;
  const text = value.trim();
  return text === "" || text === "—" || text === "–";
}

export function renderTableEmptyCellFallback(value: ReactNode): ReactNode {
  if (value == null || value === false) return TABLE_EMPTY_CELL_PLACEHOLDER;
  if (typeof value === "string" && isEmptyTableCellValue(value)) return TABLE_EMPTY_CELL_PLACEHOLDER;
  return value;
}
