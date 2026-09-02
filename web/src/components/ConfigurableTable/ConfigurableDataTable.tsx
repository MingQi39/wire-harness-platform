import { useMemo, useState, type Key } from 'react'
import { SettingsIcon } from 'lucide-react'

import { DataTable, type DataTableColumn as UiDataTableColumn } from '@/components/ui/data-table'
import { SemanticButton } from '@/components/SemanticButton'
import { cn } from '@/lib/utils'
import { buildDataTableColumns, type ServerFilterConfig } from './buildDataTableColumns'
import { TableColumnSettingsDrawer } from './TableColumnSettingsDrawer'
import { useColumnPreferences } from './useColumnPreferences'
import type { ConfigurableDataTableProps, TableColumnDef } from './types'
import { getCellValue } from './columnUtils'

const SERIAL_COLUMN_KEY = '__serial_index'
const SERIAL_COLUMN_WIDTH_PX = 44

export function ConfigurableDataTable<T extends object>(props: ConfigurableDataTableProps<T>) {
  const {
    storageKey,
    columnDefs,
    selectedRowKey,
    onSelectedRowChange,
    selectedRowKeys,
    onSelectedRowKeysChange,
    preserveSelectedRowKeys,
    toolbarFilters,
    toolbarActions,
    columnSettingsTitle,
    showColumnSettingsTrigger = true,
    showSerialColumn = true,
    serverFilterColumnKeys,
    serverFilterValues,
    onServerFilterChange,
    dataSource = [],
    rowKey,
    loading,
    pagination,
    scroll,
    className,
    fillHeight,
    onRow,
    rowClassName,
  } = props

  const serverFilter = useMemo((): ServerFilterConfig | undefined => {
    if (!serverFilterColumnKeys?.length || !onServerFilterChange) return undefined
    return {
      keys: new Set(serverFilterColumnKeys),
      values: serverFilterValues ?? {},
      onChange: onServerFilterChange,
    }
  }, [serverFilterColumnKeys, serverFilterValues, onServerFilterChange])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [internalPage, setInternalPage] = useState(1)
  const [internalPageSize, setInternalPageSize] = useState(10)
  const paginationConfig =
    pagination !== false && pagination != null
      ? pagination
      : undefined
  const resolvedCurrent = paginationConfig?.current ?? internalPage
  const resolvedPageSize = paginationConfig?.pageSize ?? internalPageSize

  const configurableColumnDefs = useMemo<TableColumnDef<T>[]>(() => {
    let offset = 0
    if (pagination !== false) {
      offset = (Math.max(1, resolvedCurrent) - 1) * Math.max(1, resolvedPageSize)
    }

    if (!showSerialColumn) return columnDefs

    return [
      {
        key: SERIAL_COLUMN_KEY,
        title: '序号',
        width: SERIAL_COLUMN_WIDTH_PX,
        align: 'center',
        defaultFixed: scroll?.x != null ? 'left' : false,
        hideable: false,
        copyable: false,
        render: (_value, _record, index) => offset + index + 1,
      },
      ...columnDefs,
    ]
  }, [columnDefs, pagination, resolvedCurrent, resolvedPageSize, scroll?.x, showSerialColumn])

  const { prefs, setPrefs, resetPrefs } = useColumnPreferences(storageKey, configurableColumnDefs)

  const columns = useMemo(
    () => buildDataTableColumns(configurableColumnDefs, prefs, serverFilter),
    [configurableColumnDefs, prefs, serverFilter],
  )

  const dataTableColumns = useMemo<UiDataTableColumn<T>[]>(
    () => columns.map((column) => ({
      id: column.key,
      header: column.title,
      width: column.width,
      align: column.align,
      ellipsis: column.ellipsis,
      fixed: column.fixed || undefined,
      onCell: column.onCell,
      filter: column.filter,
      sorter: column.sorter,
      cell: (row, index) => {
        const value = column.dataIndex == null ? undefined : getCellValue(row, column.dataIndex)
        return column.render ? column.render(value, row, index) : String(value ?? '')
      },
    })),
    [columns],
  )

  const selectedKeys = onSelectedRowKeysChange
    ? selectedRowKeys?.map(String)
    : selectedRowKey != null
      ? [String(selectedRowKey)]
      : undefined
  const dataTableRowKey =
    typeof rowKey === 'function'
      ? (record: T) => {
          const value = rowKey(record)
          if (typeof value === 'string' || typeof value === 'number') return value
          return String(value)
        }
      : rowKey

  const handleSelectionChange = (keys: Key[], rows: T[]) => {
    if (onSelectedRowKeysChange) {
      onSelectedRowKeysChange(keys, rows)
      return
    }
    if (onSelectedRowChange) {
      const key = keys[0] ?? null
      onSelectedRowChange(key, rows[0] ?? null)
    }
  }
  const handlePaginationChange = (page: number, pageSize: number) => {
    if (paginationConfig?.current == null) setInternalPage(page)
    if (paginationConfig?.pageSize == null) setInternalPageSize(pageSize)
    paginationConfig?.onChange?.(page, pageSize)
  }

  const tableInFlex = scroll?.y != null
  const shouldFillHeight = fillHeight ?? tableInFlex
  const showToolbarRow = showColumnSettingsTrigger || toolbarFilters != null || toolbarActions != null

  return (
    <div
      className={cn(
        tableInFlex && "flex min-h-0 flex-col",
        shouldFillHeight && "h-full",
        className,
      )}
    >
      {showToolbarRow ? (
        <div className="mb-[5px] flex shrink-0 flex-nowrap items-center gap-2 overflow-x-auto">
          <div className="flex min-w-0 shrink items-center gap-2">{toolbarFilters ?? toolbarActions}</div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {toolbarFilters != null ? toolbarActions : null}
            {showColumnSettingsTrigger ? (
              <SemanticButton className="shrink-0" onClick={() => setDrawerOpen(true)}>
                <SettingsIcon data-icon="inline-start" />
                列设置
              </SemanticButton>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          // 仅表体区域裁剪滚动；勿把分页包进 overflow-hidden，否则每页条数下拉易被挡住
          tableInFlex && "flex min-h-0 flex-col",
          shouldFillHeight ? "flex-1" : "shrink-0",
        )}
      >
        <DataTable
          data={dataSource}
          columns={dataTableColumns}
          rowKey={dataTableRowKey}
          loading={loading}
          selectedRowKeys={selectedKeys}
          preserveSelectedRowKeys={preserveSelectedRowKeys}
          onSelectedRowKeysChange={
            onSelectedRowKeysChange || onSelectedRowChange ? handleSelectionChange : undefined
          }
          selectionMode={onSelectedRowKeysChange ? 'multiple' : onSelectedRowChange ? 'single' : undefined}
          onRow={onRow}
          rowClassName={rowClassName}
          pagination={
            paginationConfig
              ? {
                  page: resolvedCurrent,
                  pageSize: resolvedPageSize,
                  total: paginationConfig.total,
                  showSizeChanger: paginationConfig.showSizeChanger,
                  pageSizeOptions: paginationConfig.pageSizeOptions,
                  showTotal: paginationConfig.showTotal,
                  onChange: handlePaginationChange,
                }
              : false
          }
          scroll={scroll}
          className={cn(shouldFillHeight && "h-full min-h-0", !shouldFillHeight && "min-h-0")}
        />
      </div>

      <TableColumnSettingsDrawer<T>
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={columnSettingsTitle}
        columnDefs={configurableColumnDefs}
        prefs={prefs}
        onChange={setPrefs}
        onReset={resetPrefs}
      />
    </div>
  )
}
