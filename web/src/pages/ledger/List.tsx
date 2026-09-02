import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MasterDetailResizableSplit } from '@/components/MasterDetailResizableSplit'
import { AddIcon } from '@/components/app-icons'
import { HarnessStatusSelect } from '@/components/HarnessStatusSelect'
import { SemanticButton } from '@/components/SemanticButton'
import { ConfigurableDataTable } from '@/components/ConfigurableTable'
import type { TableColumnDef } from '@/components/ConfigurableTable'
import { Button, Card, Form, Input, Select, Upload } from '@/components/ui/app-ui'
import { FormModal } from '@/components/ui/form-modal'
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
import { parseProjectRouteId, resolveSelectedProjectId } from '@/utils/harnessProjectRoute'

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

  useEffect(() => {
    if (!projectsReady) return

    if (projects.length === 0) {
      if (projectIdParam) navigate('/ledger', { replace: true })
      return
    }

    const routeMatchesProject =
      routeProjectId != null && projects.some((row) => row.id === routeProjectId)
    if (routeMatchesProject) return

    const fallbackId = projects[0].id
    if (fallbackId != null) {
      navigate(`/ledger/${fallbackId}`, { replace: true })
    }
  }, [projects, projectsReady, projectIdParam, routeProjectId, navigate])

  useEffect(() => {
    setSelectedItemKeys([])
  }, [selectedProjectId])

  const { data: items = [], isLoading: itemsLoading } = useHarnessItems(selectedProjectId)
  const itemMutations = useHarnessItemMutations(selectedProjectId, LIST_PARAMS)

  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [selectedItemKeys, setSelectedItemKeys] = useState<number[]>([])

  const [projectForm] = Form.useForm<ProjectFormValues>()
  const [itemForm] = Form.useForm<ItemFormValues>()

  const topScroll = useContainerTableBodyHeight(TABLE_BODY_SCROLL_RESERVE)
  const bottomScroll = useContainerTableBodyHeight(TABLE_BODY_SCROLL_RESERVE, [items.length, selectedProjectId])

  const openCreateProject = () => {
    projectForm.setFieldsValue({
      project_name: '',
      platform_model: '',
      circuit_count: 0,
      switch_count: 0,
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
      const created = await projectMutations.create.mutateAsync(payload)
      appMessage().success('已新增线束信息')
      setProjectModalOpen(false)
      navigate(`/ledger/${created.id}`, { replace: true })
    } catch (err) {
      appMessage().error(getApiErrorMessage(err))
    }
  }

  const openCreateItem = () => {
    if (!selectedProjectId) {
      appMessage().warning('请先选择上方项目')
      return
    }
    itemForm.setFieldsValue({
      harness_name: '',
      harness_no: '',
      purpose: '',
      status: 'idle',
      responsible_person: '',
    })
    setItemModalOpen(true)
  }

  const submitItem = async () => {
    const values = await itemForm.validateFields()
    try {
      await itemMutations.create.mutateAsync(values)
      appMessage().success('已新增线束')
      setItemModalOpen(false)
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
    navigate(`/ledger/${id}`, { replace: true })
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
    ],
    [projectMutations],
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
              <ConfigurableDataTable<HarnessProjectItem>
                storageKey="harness-ledger-projects"
                rowKey="id"
                columnDefs={projectColumns}
                dataSource={projects}
                loading={isLoading || isFetching}
                selectedRowKey={selectedProjectId}
                onSelectedRowChange={handleSelectProject}
                pagination={false}
                showColumnSettingsTrigger={false}
                scroll={{ y: topScroll.scrollY }}
                rowClassName={(row) => (row.id === selectedProjectId ? 'bg-primary/5' : '')}
              />
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
                scroll={{ y: bottomScroll.scrollY }}
              />
            </div>
          </Card>
        }
      />

      <FormModal
        title="新增线束信息"
        open={projectModalOpen}
        onCancel={() => setProjectModalOpen(false)}
        onOk={() => void submitProject()}
        confirmLoading={projectMutations.create.isPending}
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
        title="新增线束"
        open={itemModalOpen}
        onCancel={() => setItemModalOpen(false)}
        onOk={() => void submitItem()}
        confirmLoading={itemMutations.create.isPending}
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
    </div>
  )
}
