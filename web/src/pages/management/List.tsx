import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ConfigurableDataTable } from '@/components/ConfigurableTable'
import type { TableColumnDef } from '@/components/ConfigurableTable'
import { SemanticButton } from '@/components/SemanticButton'
import { TableRowActions } from '@/components/TableRowActions'
import { Button, Card, Descriptions, Empty, Form, Input, Select, Table } from '@/components/ui/app-ui'
import { FormModal } from '@/components/ui/form-modal'
import type { HarnessManagementItem } from '@/api/harnessManagement'
import type { HarnessProjectItem } from '@/api/harnessLedger'
import { HARNESS_STATUS_OPTIONS } from '@/api/harnessLedger'
import { getApiErrorMessage } from '@/api/client'
import { useHarnessProjects, useHarnessItemMutations } from '@/hooks/useHarnessLedger'
import {
  useHarnessManagementItems,
  useHarnessManagementMutations,
} from '@/hooks/useHarnessManagement'
import { useContainerTableBodyHeight } from '@/hooks/useContainerTableBodyHeight'
import { useResizablePanel } from '@/hooks/useResizablePanel'
import { TABLE_BODY_SCROLL_RESERVE, TABLE_LIST_CARD_BODY_PADDING } from '@/constants/tableLayout'
import { appMessage } from '@/utils/appMessage'
import { formatDateTime } from '@/utils/format'
import { PackageIcon, PackageMinusIcon, Trash2Icon } from 'lucide-react'
import { HarnessOperationLogModal } from './HarnessOperationLogModal'
import { parseProjectRouteId, resolveSelectedProjectId, useSyncProjectRoute, buildProjectRoute } from '@/utils/harnessProjectRoute'

const LIST_PARAMS = { page: 1, page_size: 200 } as const

type ItemFormValues = {
  harness_name: string
  harness_no: string
  purpose: string
  status: string
  responsible_person: string
}

function SectionHeader({ title }: { title: ReactNode }) {
  return (
    <div className="mb-2 flex shrink-0 items-center gap-2">
      <span className="h-3.5 w-0.5 rounded-full bg-primary/70" aria-hidden />
      <span className="text-xs font-semibold tracking-wide text-slate-700">{title}</span>
    </div>
  )
}

export default function HarnessManagementPage() {
  const navigate = useNavigate()
  const { projectId: projectIdParam } = useParams<{ projectId?: string }>()
  const routeProjectId = parseProjectRouteId(projectIdParam)

  const panel = useResizablePanel({ defaultWidth: 380, minWidth: 280, maxWidth: 560 })
  const { data: projectData, isLoading: projectsLoading, isFetching: projectsFetching } =
    useHarnessProjects(LIST_PARAMS)
  const projects = projectData?.items ?? []
  const projectsReady = !projectsLoading && !projectsFetching

  const selectedProjectId = useMemo(
    () => resolveSelectedProjectId(projects, routeProjectId),
    [projects, routeProjectId],
  )

  useSyncProjectRoute('/management', projects, projectsReady, routeProjectId, projectIdParam)

  const [selectedKeys, setSelectedKeys] = useState<number[]>([])
  const [logItem, setLogItem] = useState<HarnessManagementItem | null>(null)
  const [itemViewRow, setItemViewRow] = useState<HarnessManagementItem | null>(null)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [itemForm] = Form.useForm<ItemFormValues>()

  useEffect(() => {
    setSelectedKeys([])
  }, [selectedProjectId])

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  )

  const selectedIndex = useMemo(() => {
    if (!selectedProject) return 0
    const idx = projects.findIndex((p) => p.id === selectedProject.id)
    return idx >= 0 ? idx + 1 : 1
  }, [projects, selectedProject])

  const { data: items = [], isLoading: itemsLoading } = useHarnessManagementItems(selectedProjectId)
  const mutations = useHarnessManagementMutations(selectedProjectId)
  const itemMutations = useHarnessItemMutations(selectedProjectId, LIST_PARAMS)

  const leftScroll = useContainerTableBodyHeight(TABLE_BODY_SCROLL_RESERVE)
  const rightScroll = useContainerTableBodyHeight(TABLE_BODY_SCROLL_RESERVE, [items.length, selectedProjectId])

  const selectedIds = useMemo(() => selectedKeys.map(Number), [selectedKeys])

  const requireSelection = () => {
    if (selectedIds.length === 0) {
      appMessage().warning('请先勾选线束')
      return false
    }
    return true
  }

  const runBatch = async (action: 'stockIn' | 'stockOut' | 'scrap', successMsg: string) => {
    if (!requireSelection()) return
    try {
      await mutations[action].mutateAsync(selectedIds)
      appMessage().success(successMsg)
      setSelectedKeys([])
    } catch (err) {
      appMessage().error(getApiErrorMessage(err))
    }
  }

  const handleSelectProject = (key: unknown) => {
    setSelectedKeys([])
    const id = typeof key === 'number' ? key : key != null ? Number(key) : null
    if (id == null || !Number.isFinite(id) || id <= 0) {
      navigate('/management', { replace: true })
      return
    }
    navigate(buildProjectRoute('/management', id), { replace: true })
  }

  const openEditItem = (row: HarnessManagementItem) => {
    setEditingItemId(row.id)
    itemForm.setFieldsValue({
      harness_name: row.harness_name,
      harness_no: row.harness_no,
      purpose: row.purpose,
      status: row.status,
      responsible_person: row.responsible_person,
    })
    setItemModalOpen(true)
  }

  const submitItem = async () => {
    const values = await itemForm.validateFields()
    if (editingItemId == null) return
    try {
      await itemMutations.update.mutateAsync({ id: editingItemId, data: values })
      appMessage().success('已更新线束')
      setItemModalOpen(false)
    } catch (err) {
      appMessage().error(getApiErrorMessage(err))
    }
  }

  const handleDeleteItem = async (row: HarnessManagementItem) => {
    try {
      await itemMutations.remove.mutateAsync(row.id)
      appMessage().success('已删除线束')
      setSelectedKeys((prev) => prev.filter((id) => id !== row.id))
    } catch (err) {
      appMessage().error(getApiErrorMessage(err))
    }
  }

  const projectColumns = useMemo<TableColumnDef<HarnessProjectItem>[]>(
    () => [
      { key: 'project_name', title: '项目名称', dataIndex: 'project_name', width: 140, ellipsis: true },
      { key: 'platform_model', title: '平台型号', dataIndex: 'platform_model', width: 110, ellipsis: true },
      { key: 'circuit_count', title: '回路数', dataIndex: 'circuit_count', width: 72, align: 'center' },
    ],
    [],
  )

  const itemColumns = useMemo<TableColumnDef<HarnessManagementItem>[]>(
    () => [
      { key: 'harness_name', title: '线束名称', dataIndex: 'harness_name', width: 130, ellipsis: true },
      { key: 'harness_no', title: '线束编号', dataIndex: 'harness_no', width: 110, ellipsis: true },
      { key: 'purpose', title: '线束用途', dataIndex: 'purpose', width: 130, ellipsis: true },
      {
        key: 'stored_at',
        title: '入库时间',
        width: 160,
        render: (_, row) => formatDateTime(row.stored_at),
      },
      { key: 'stored_by', title: '入库人', dataIndex: 'stored_by', width: 90 },
      {
        key: 'outbound_at',
        title: '出库时间',
        width: 160,
        render: (_, row) => formatDateTime(row.outbound_at),
      },
      { key: 'outbound_by', title: '出库人', dataIndex: 'outbound_by', width: 90 },
      {
        key: 'scrapped_at',
        title: '报废时间',
        width: 160,
        render: (_, row) => formatDateTime(row.scrapped_at),
      },
      { key: 'scrap_confirmed_by', title: '报废确认人', dataIndex: 'scrap_confirmed_by', width: 100 },
      {
        key: 'operation_log',
        title: '操作记录',
        width: 90,
        fixed: 'right',
        render: (_, row) => (
          <Button type="link" size="small" className="px-0" onClick={() => setLogItem(row)}>
            查看
          </Button>
        ),
      },
      {
        key: 'actions',
        title: '操作',
        width: 148,
        fixed: 'right',
        align: 'center',
        render: (_, row) => (
          <TableRowActions
            onView={() => setItemViewRow(row)}
            onEdit={() => openEditItem(row)}
            onDelete={() => handleDeleteItem(row)}
            deleteTitle="删除线束？"
            deleteDescription={`确定删除「${row.harness_name || row.harness_no || '该线束'}」吗？`}
          />
        ),
      },
    ],
    [itemMutations],
  )

  const summaryColumns = [
    { title: '序号', dataIndex: 'index', key: 'index', width: 64 },
    { title: '项目名称', dataIndex: 'project_name', key: 'project_name', ellipsis: true },
    { title: '平台型号', dataIndex: 'platform_model', key: 'platform_model', width: 120, ellipsis: true },
    { title: '回路数', dataIndex: 'circuit_count', key: 'circuit_count', width: 80 },
    { title: '开关量', dataIndex: 'switch_count', key: 'switch_count', width: 80 },
  ]

  const summaryData = selectedProject
    ? [
        {
          key: selectedProject.id,
          index: selectedIndex,
          project_name: selectedProject.project_name,
          platform_model: selectedProject.platform_model,
          circuit_count: selectedProject.circuit_count,
          switch_count: selectedProject.switch_count,
        },
      ]
    : []

  const tableLoading =
    itemsLoading ||
    mutations.stockIn.isPending ||
    mutations.stockOut.isPending ||
    mutations.scrap.isPending ||
    itemMutations.update.isPending ||
    itemMutations.remove.isPending

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Card
          className="flex shrink-0 flex-col overflow-hidden shadow-sm"
          style={{ width: panel.width, maxWidth: '100%' }}
          styles={{
            body: {
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              ...TABLE_LIST_CARD_BODY_PADDING,
            },
          }}
        >
          <SectionHeader title="项目列表" />
          <div ref={leftScroll.ref} className="min-h-0 flex-1">
            {projectsReady && projects.length === 0 ? (
              <div className="flex h-full min-h-[160px] items-center justify-center">
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无项目，请在线束台账中新增" />
              </div>
            ) : (
              <ConfigurableDataTable<HarnessProjectItem>
                storageKey="harness-management-projects"
                rowKey="id"
                columnDefs={projectColumns}
                dataSource={projects}
                loading={projectsLoading || projectsFetching}
                selectedRowKey={selectedProjectId ?? undefined}
                onSelectedRowChange={handleSelectProject}
                pagination={false}
                showColumnSettingsTrigger={false}
                scroll={{ y: leftScroll.scrollY }}
                rowClassName={(row) => (row.id === selectedProjectId ? 'bg-primary/5' : '')}
              />
            )}
          </div>
        </Card>

        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="拖动调整左侧宽度"
          onMouseDown={panel.onMouseDown}
          className="hidden w-2 shrink-0 cursor-col-resize items-center justify-center rounded hover:bg-slate-200 lg:flex"
        >
          <span className="h-8 w-0.5 rounded-full bg-slate-300" />
        </div>

        <Card
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden shadow-sm"
          styles={{
            body: {
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
            },
          }}
        >
          {!selectedProject ? (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-400">
              {projects.length === 0 ? '暂无项目数据' : '请在左侧选择项目'}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-2">
              <SectionHeader title={`线束清单 — ${selectedProject.project_name}`} />
              <Table
                size="small"
                className="mb-3 shrink-0"
                pagination={false}
                columns={summaryColumns}
                dataSource={summaryData}
              />

              <div className="mb-2 flex shrink-0 flex-wrap gap-2">
                <SemanticButton
                  icon={<PackageIcon className="h-4 w-4" />}
                  disabled={selectedIds.length === 0}
                  loading={mutations.stockIn.isPending}
                  onClick={() => void runBatch('stockIn', '入库成功')}
                >
                  线束入库
                </SemanticButton>
                <SemanticButton
                  icon={<PackageMinusIcon className="h-4 w-4" />}
                  disabled={selectedIds.length === 0}
                  loading={mutations.stockOut.isPending}
                  onClick={() => void runBatch('stockOut', '出库成功')}
                >
                  线束出库
                </SemanticButton>
                <SemanticButton
                  icon={<Trash2Icon className="h-4 w-4" />}
                  disabled={selectedIds.length === 0}
                  loading={mutations.scrap.isPending}
                  onClick={() => void runBatch('scrap', '报废成功')}
                >
                  线束报废
                </SemanticButton>
              </div>

              <div ref={rightScroll.ref} className="min-h-0 flex-1">
                <ConfigurableDataTable<HarnessManagementItem>
                  storageKey="harness-management-items"
                  rowKey="id"
                  columnDefs={itemColumns}
                  dataSource={items}
                  loading={tableLoading}
                  selectedRowKeys={selectedKeys}
                  onSelectedRowKeysChange={(keys) => setSelectedKeys(keys.map(Number))}
                  preserveSelectedRowKeys
                  pagination={false}
                  showColumnSettingsTrigger={false}
                  scroll={{ x: 1648, y: rightScroll.scrollY }}
                />
              </div>
            </div>
          )}
        </Card>
      </div>

      <HarnessOperationLogModal
        open={logItem != null}
        item={logItem}
        onClose={() => setLogItem(null)}
      />

      <FormModal
        title="修改线束"
        open={itemModalOpen}
        onCancel={() => setItemModalOpen(false)}
        onOk={() => void submitItem()}
        confirmLoading={itemMutations.update.isPending}
      >
        <Form form={itemForm} layout="vertical">
          <Form.Item name="harness_name" label="线束名称" rules={[{ required: true, message: '请输入线束名称' }]}>
            <Input placeholder="线束名称" />
          </Form.Item>
          <Form.Item name="harness_no" label="线束编号">
            <Input placeholder="线束编号" />
          </Form.Item>
          <Form.Item name="purpose" label="线束用途">
            <Input placeholder="线束用途" />
          </Form.Item>
          <Form.Item name="status" label="线束状态">
            <Select options={[...HARNESS_STATUS_OPTIONS]} />
          </Form.Item>
          <Form.Item name="responsible_person" label="责任人">
            <Input placeholder="责任人" />
          </Form.Item>
        </Form>
      </FormModal>

      <FormModal
        title="查看线束"
        open={itemViewRow != null}
        onCancel={() => setItemViewRow(null)}
        footer={
          <div className="flex justify-end">
            <Button onClick={() => setItemViewRow(null)}>关闭</Button>
          </div>
        }
      >
        {itemViewRow ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="线束名称">{itemViewRow.harness_name}</Descriptions.Item>
            <Descriptions.Item label="线束编号">{itemViewRow.harness_no || '—'}</Descriptions.Item>
            <Descriptions.Item label="线束用途">{itemViewRow.purpose || '—'}</Descriptions.Item>
            <Descriptions.Item label="线束状态">{itemViewRow.status_label}</Descriptions.Item>
            <Descriptions.Item label="责任人">{itemViewRow.responsible_person || '—'}</Descriptions.Item>
            <Descriptions.Item label="库存状态">{itemViewRow.lifecycle_status_label}</Descriptions.Item>
            <Descriptions.Item label="入库时间">{formatDateTime(itemViewRow.stored_at)}</Descriptions.Item>
            <Descriptions.Item label="入库人">{itemViewRow.stored_by || '—'}</Descriptions.Item>
            <Descriptions.Item label="出库时间">{formatDateTime(itemViewRow.outbound_at)}</Descriptions.Item>
            <Descriptions.Item label="出库人">{itemViewRow.outbound_by || '—'}</Descriptions.Item>
            <Descriptions.Item label="报废时间">{formatDateTime(itemViewRow.scrapped_at)}</Descriptions.Item>
            <Descriptions.Item label="报废确认人">{itemViewRow.scrap_confirmed_by || '—'}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </FormModal>
    </div>
  )
}
