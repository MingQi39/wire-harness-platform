import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MasterDetailResizableSplit } from '@/components/MasterDetailResizableSplit'
import { AddIcon } from '@/components/app-icons'
import { HarnessStatusSelect } from '@/components/HarnessStatusSelect'
import { SemanticButton } from '@/components/SemanticButton'
import { ConfigurableDataTable } from '@/components/ConfigurableTable'
import type { TableColumnDef } from '@/components/ConfigurableTable'
import { Button, Card, Descriptions, Form, Input, Select, Upload } from '@/components/ui/app-ui'
import { FormModal } from '@/components/ui/form-modal'
import { TableRowActions } from '@/components/TableRowActions'
import {
  downloadHarnessExport,
  downloadHarnessImportTemplate,
  downloadProjectAttachment,
  HARNESS_STATUS_OPTIONS,
  type HarnessProjectItem,
  type HarnessWireItem,
} from '@/api/harnessLedger'
import { getApiErrorMessage } from '@/api/client'
import { useContainerTableBodyHeight } from '@/hooks/useContainerTableBodyHeight'
import {
  useHarnessItems,
  useHarnessItemMutations,
  useHarnessProjectMutations,
  useHarnessProjects,
} from '@/hooks/useHarnessLedger'
import { TABLE_BODY_SCROLL_RESERVE, TABLE_LIST_CARD_BODY_PADDING } from '@/constants/tableLayout'
import { appMessage } from '@/utils/appMessage'
import { DownloadIcon, UploadIcon } from 'lucide-react'
import { Empty } from '@/components/ui/app-ui'
import {
  buildProjectRoute,
  parseProjectRouteId,
  resolveSelectedProjectId,
  useSyncProjectRoute,
} from '@/utils/harnessProjectRoute'

const LIST_PARAMS = { page: 1, page_size: 200 } as const
const ATTACHMENT_ACCEPT =
  '.doc,.docx,.xls,.xlsx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf'

type ProjectFormValues = {
  project_name: string
  platform_model: string
  circuit_count: number
  switch_count: number
}

type ItemFormValues = {
  harness_name: string
  harness_no: string
  purpose: string
  status: string
  responsible_person: string
}

export default function HarnessLedgerPage() {
  const navigate = useNavigate()
  const { projectId: projectIdParam } = useParams<{ projectId?: string }>()
  const routeProjectId = parseProjectRouteId(projectIdParam)

  const { data, isLoading, isFetching } = useHarnessProjects(LIST_PARAMS)
  const projectMutations = useHarnessProjectMutations(LIST_PARAMS)

  const projects = data?.items ?? []
  const projectsReady = !isLoading && !isFetching

  const selectedProjectId = useMemo(
    () => resolveSelectedProjectId(projects, routeProjectId),
    [projects, routeProjectId],
  )

  useSyncProjectRoute('/ledger', projects, projectsReady, routeProjectId, projectIdParam)

  useEffect(() => {
    setSelectedItemKeys([])
  }, [selectedProjectId])

  const { data: items = [], isLoading: itemsLoading } = useHarnessItems(selectedProjectId)
  const itemMutations = useHarnessItemMutations(selectedProjectId, LIST_PARAMS)

  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [projectFormMode, setProjectFormMode] = useState<'create' | 'edit'>('create')
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null)
  const [projectViewRow, setProjectViewRow] = useState<HarnessProjectItem | null>(null)

  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [itemFormMode, setItemFormMode] = useState<'create' | 'edit'>('create')
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [itemViewRow, setItemViewRow] = useState<HarnessWireItem | null>(null)

  const [selectedItemKeys, setSelectedItemKeys] = useState<number[]>([])

  const [projectForm] = Form.useForm<ProjectFormValues>()
  const [itemForm] = Form.useForm<ItemFormValues>()

  const topScroll = useContainerTableBodyHeight(TABLE_BODY_SCROLL_RESERVE)
  const bottomScroll = useContainerTableBodyHeight(TABLE_BODY_SCROLL_RESERVE, [items.length, selectedProjectId])

  const openCreateProject = () => {
    setProjectFormMode('create')
    setEditingProjectId(null)
    projectForm.setFieldsValue({
      project_name: '',
      platform_model: '',
      circuit_count: 0,
      switch_count: 0,
    })
    setProjectModalOpen(true)
  }

  const openEditProject = (row: HarnessProjectItem) => {
    setProjectFormMode('edit')
    setEditingProjectId(row.id)
    projectForm.setFieldsValue({
      project_name: row.project_name,
      platform_model: row.platform_model,
      circuit_count: row.circuit_count,
      switch_count: row.switch_count,
    })
    setProjectModalOpen(true)
  }

  const submitProject = async () => {
    const values = await projectForm.validateFields()
    const payload = {
      ...values,
      circuit_count: Number(values.circuit_count) || 0,
      switch_count: Number(values.switch_count) || 0,
    }
    try {
      if (projectFormMode === 'edit' && editingProjectId != null) {
        await projectMutations.update.mutateAsync({ id: editingProjectId, data: payload })
        appMessage().success('已更新线束信息')
      } else {
        const created = await projectMutations.create.mutateAsync(payload)
        appMessage().success('已新增线束信息')
        navigate(buildProjectRoute('/ledger', created.id), { replace: true })
      }
      setProjectModalOpen(false)
    } catch (err) {
      appMessage().error(getApiErrorMessage(err))
    }
  }

  const handleDeleteProject = async (row: HarnessProjectItem) => {
    try {
      await projectMutations.remove.mutateAsync(row.id)
      appMessage().success('已删除线束信息')
      if (selectedProjectId === row.id) {
        navigate('/ledger', { replace: true })
      }
    } catch (err) {
      appMessage().error(getApiErrorMessage(err))
    }
  }

  const openCreateItem = () => {
    if (!selectedProjectId) {
      appMessage().warning('请先选择上方项目')
      return
    }
    setItemFormMode('create')
    setEditingItemId(null)
    itemForm.setFieldsValue({
      harness_name: '',
      harness_no: '',
      purpose: '',
      status: 'idle',
      responsible_person: '',
    })
    setItemModalOpen(true)
  }

  const openEditItem = (row: HarnessWireItem) => {
    setItemFormMode('edit')
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
    try {
      if (itemFormMode === 'edit' && editingItemId != null) {
        await itemMutations.update.mutateAsync({ id: editingItemId, data: values })
        appMessage().success('已更新线束')
      } else {
        await itemMutations.create.mutateAsync(values)
        appMessage().success('已新增线束')
      }
      setItemModalOpen(false)
    } catch (err) {
      appMessage().error(getApiErrorMessage(err))
    }
  }

  const handleDeleteItem = async (row: HarnessWireItem) => {
    try {
      await itemMutations.remove.mutateAsync(row.id)
      appMessage().success('已删除线束')
      setSelectedItemKeys((prev) => prev.filter((id) => id !== row.id))
    } catch (err) {
      appMessage().error(getApiErrorMessage(err))
    }
  }

  const handleStatusChange = async (row: HarnessWireItem, status: string) => {
    try {
      await itemMutations.update.mutateAsync({
        id: row.id,
        data: {
          harness_name: row.harness_name,
          harness_no: row.harness_no,
          purpose: row.purpose,
          status,
          responsible_person: row.responsible_person,
        },
      })
    } catch (err) {
      appMessage().error(getApiErrorMessage(err))
    }
  }

  const handleImportFile = async (file: File) => {
    if (!selectedProjectId) return false
    try {
      const res = await itemMutations.importCsv.mutateAsync(file)
      appMessage().success(`已导入 ${res.imported} 条线束`)
    } catch (err) {
      appMessage().error(getApiErrorMessage(err))
    }
    return false
  }

  const uploadAttachment = (projectId: number, file: File) => {
    void projectMutations.uploadAttachment
      .mutateAsync({ id: projectId, file })
      .then(() => appMessage().success('附件已上传'))
      .catch((err) => appMessage().error(getApiErrorMessage(err)))
  }

  const handleExport = async () => {
    if (!selectedProjectId) return
    if (selectedItemKeys.length === 0) {
      appMessage().warning('请先勾选要导出的线束')
      return
    }
    try {
      await downloadHarnessExport(selectedProjectId, selectedItemKeys)
      appMessage().success(`已导出 ${selectedItemKeys.length} 条线束`)
    } catch (err) {
      appMessage().error(getApiErrorMessage(err))
    }
  }

  const handleSelectProject = (key: unknown) => {
    setSelectedItemKeys([])
    const id = typeof key === 'number' ? key : key != null ? Number(key) : null
    if (id == null || !Number.isFinite(id) || id <= 0) {
      navigate('/ledger', { replace: true })
      return
    }
    navigate(buildProjectRoute('/ledger', id), { replace: true })
  }

  const projectColumns = useMemo<TableColumnDef<HarnessProjectItem>[]>(
    () => [
      { key: 'project_name', title: '项目名称', dataIndex: 'project_name', width: 180 },
      { key: 'platform_model', title: '平台型号', dataIndex: 'platform_model', width: 140 },
      { key: 'circuit_count', title: '回路数', dataIndex: 'circuit_count', width: 90, align: 'center' },
      { key: 'switch_count', title: '开关量', dataIndex: 'switch_count', width: 90, align: 'center' },
      {
        key: 'attachment',
        title: '附件',
        width: 180,
        render: (_, row) => (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {row.has_attachment ? (
              <Button
                type="link"
                size="small"
                className="max-w-[120px] truncate px-0"
                onClick={() => void downloadProjectAttachment(row.id, row.attachment_name)}
              >
                {row.attachment_name || '下载'}
              </Button>
            ) : null}
            <Upload
              showUploadList={false}
              accept={ATTACHMENT_ACCEPT}
              beforeUpload={(file) => {
                uploadAttachment(row.id, file)
                return false
              }}
            >
              <Button type="link" size="small" className="px-0">
                {row.has_attachment ? '重新上传' : '上传'}
              </Button>
            </Upload>
          </div>
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
            onView={() => setProjectViewRow(row)}
            onEdit={() => openEditProject(row)}
            onDelete={() => handleDeleteProject(row)}
            deleteTitle="删除线束信息？"
            deleteDescription={`确定删除「${row.project_name}」及其下所有线束明细吗？`}
          />
        ),
      },
    ],
    [projectMutations, selectedProjectId, navigate],
  )

  const itemColumns = useMemo<TableColumnDef<HarnessWireItem>[]>(
    () => [
      { key: 'harness_name', title: '线束名称', dataIndex: 'harness_name', width: 160 },
      { key: 'harness_no', title: '线束编号', dataIndex: 'harness_no', width: 140 },
      { key: 'purpose', title: '线束用途', dataIndex: 'purpose', width: 180 },
      {
        key: 'status',
        title: '线束状态',
        width: 108,
        render: (_, row) => (
          <HarnessStatusSelect
            value={row.status}
            onChange={(v) => void handleStatusChange(row, v)}
          />
        ),
      },
      { key: 'responsible_person', title: '责任人', dataIndex: 'responsible_person', width: 120 },
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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <MasterDetailResizableSplit
        className="min-h-0 flex-1"
        defaultTopSize={320}
        minBottomSize={280}
        top={
          <Card
            className="flex h-full min-h-0 flex-col overflow-hidden"
            styles={{
              body: {
                padding: TABLE_LIST_CARD_BODY_PADDING,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              },
            }}
          >
            <div className="mb-2 flex justify-end">
              <SemanticButton icon={<AddIcon />} onClick={openCreateProject}>
                新增线束信息
              </SemanticButton>
            </div>
            <div ref={topScroll.ref} className="min-h-0 flex-1">
              {projectsReady && projects.length === 0 ? (
                <div className="flex h-full min-h-[160px] items-center justify-center">
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无线束信息，请点击右上角新增" />
                </div>
              ) : (
                <ConfigurableDataTable<HarnessProjectItem>
                  storageKey="harness-ledger-projects"
                  rowKey="id"
                  columnDefs={projectColumns}
                  dataSource={projects}
                  loading={isLoading || isFetching}
                  selectedRowKey={selectedProjectId ?? undefined}
                  onSelectedRowChange={handleSelectProject}
                  pagination={false}
                  showColumnSettingsTrigger={false}
                  scroll={{ y: topScroll.scrollY, x: 980 }}
                  rowClassName={(row) => (row.id === selectedProjectId ? 'bg-primary/5' : '')}
                />
              )}
            </div>
          </Card>
        }
        bottom={
          <Card
            className="flex h-full min-h-0 flex-col overflow-hidden"
            styles={{
              body: {
                padding: TABLE_LIST_CARD_BODY_PADDING,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              },
            }}
          >
            <div className="mb-2 flex flex-wrap gap-2">
              <SemanticButton icon={<AddIcon />} onClick={openCreateItem} disabled={!selectedProjectId}>
                新增
              </SemanticButton>
              <Upload
                showUploadList={false}
                beforeUpload={handleImportFile}
                accept=".csv"
                disabled={!selectedProjectId}
              >
                <Button icon={<UploadIcon className="h-4 w-4" />} disabled={!selectedProjectId}>
                  导入线束
                </Button>
              </Upload>
              <Button
                icon={<DownloadIcon className="h-4 w-4" />}
                disabled={!selectedProjectId || selectedItemKeys.length === 0}
                onClick={() => void handleExport()}
              >
                导出
              </Button>
              <Button onClick={() => void downloadHarnessImportTemplate()}>下载模板</Button>
            </div>
            <div ref={bottomScroll.ref} className="min-h-0 flex-1">
              {!selectedProjectId ? (
                <div className="flex h-full min-h-[160px] items-center justify-center">
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请先新增并选择线束信息" />
                </div>
              ) : (
                <ConfigurableDataTable<HarnessWireItem>
                  storageKey="harness-ledger-items"
                  rowKey="id"
                  columnDefs={itemColumns}
                  dataSource={items}
                  loading={itemsLoading}
                  selectedRowKeys={selectedItemKeys}
                  onSelectedRowKeysChange={(keys) => setSelectedItemKeys(keys.map(Number))}
                  preserveSelectedRowKeys
                  pagination={false}
                  showColumnSettingsTrigger={false}
                  scroll={{ y: bottomScroll.scrollY, x: 1100 }}
                />
              )}
            </div>
          </Card>
        }
      />

      <FormModal
        title={projectFormMode === 'edit' ? '修改线束信息' : '新增线束信息'}
        open={projectModalOpen}
        onCancel={() => setProjectModalOpen(false)}
        onOk={() => void submitProject()}
        confirmLoading={projectMutations.create.isPending || projectMutations.update.isPending}
      >
        <Form form={projectForm} layout="vertical">
          <Form.Item name="project_name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="项目名称" />
          </Form.Item>
          <Form.Item name="platform_model" label="平台型号">
            <Input placeholder="平台型号" />
          </Form.Item>
          <Form.Item name="circuit_count" label="回路数">
            <Input type="number" min={0} />
          </Form.Item>
          <Form.Item name="switch_count" label="开关量">
            <Input type="number" min={0} />
          </Form.Item>
        </Form>
      </FormModal>

      <FormModal
        title={itemFormMode === 'edit' ? '修改线束' : '新增线束'}
        open={itemModalOpen}
        onCancel={() => setItemModalOpen(false)}
        onOk={() => void submitItem()}
        confirmLoading={itemMutations.create.isPending || itemMutations.update.isPending}
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
        title="查看线束信息"
        open={projectViewRow != null}
        onCancel={() => setProjectViewRow(null)}
        footer={
          <div className="flex justify-end">
            <Button onClick={() => setProjectViewRow(null)}>关闭</Button>
          </div>
        }
      >
        {projectViewRow ? (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="项目名称">{projectViewRow.project_name}</Descriptions.Item>
            <Descriptions.Item label="平台型号">{projectViewRow.platform_model || '—'}</Descriptions.Item>
            <Descriptions.Item label="回路数">{projectViewRow.circuit_count}</Descriptions.Item>
            <Descriptions.Item label="开关量">{projectViewRow.switch_count}</Descriptions.Item>
            <Descriptions.Item label="附件">
              {projectViewRow.has_attachment ? (
                <Button
                  type="link"
                  size="small"
                  className="h-auto px-0"
                  onClick={() => void downloadProjectAttachment(projectViewRow.id, projectViewRow.attachment_name)}
                >
                  {projectViewRow.attachment_name || '下载附件'}
                </Button>
              ) : (
                '无'
              )}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
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
          </Descriptions>
        ) : null}
      </FormModal>
    </div>
  )
}
