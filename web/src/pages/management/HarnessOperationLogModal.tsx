import { Modal, Table } from '@/components/ui/app-ui'
import { useHarnessOperationLogs } from '@/hooks/useHarnessManagement'
import type { HarnessManagementItem } from '@/api/harnessManagement'

type Props = {
  open: boolean
  item: HarnessManagementItem | null
  onClose: () => void
}

export function HarnessOperationLogModal({ open, item, onClose }: Props) {
  const { data: logs = [], isLoading } = useHarnessOperationLogs(item?.id ?? null, open)
  const title = item
    ? `操作记录 — ${item.harness_name}${item.harness_no ? ` · ${item.harness_no}` : ''}`
    : '操作记录'

  return (
    <Modal open={open} title={title} width={720} footer={null} onCancel={onClose}>
      <Table
        size="small"
        loading={isLoading}
        pagination={false}
        rowKey="id"
        columns={[
          { title: '操作', dataIndex: 'action_label', key: 'action_label', width: 120 },
          { title: '操作人', dataIndex: 'operator_name', key: 'operator_name', width: 100 },
          { title: '备注', dataIndex: 'remark', key: 'remark' },
          { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 170 },
        ]}
        dataSource={logs}
        locale={{ emptyText: '暂无操作记录' }}
      />
    </Modal>
  )
}
