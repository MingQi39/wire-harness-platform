import type { BatchDeleteWithUpdatedAtReq } from "@/api/types";

export function buildBatchDeletePayload<T extends { id: number; updated_at?: string | null }>(
  rows: T[],
): BatchDeleteWithUpdatedAtReq | null {
  if (rows.length === 0 || rows.some((row) => !row.updated_at)) {
    return null;
  }
  return {
    items: rows.map((row) => ({ id: row.id, updated_at: row.updated_at as string })),
  };
}
