import { Button, Popconfirm } from '@/components/ui/app-ui'

type TableRowActionsProps = {
  onView: () => void
  onEdit: () => void
  onDelete: () => void | Promise<void>
  deleteTitle?: string
  deleteDescription?: string
}

export function TableRowActions({
  onView,
  onEdit,
  onDelete,
  deleteTitle = '确认删除？',
  deleteDescription = '删除后不可恢复',
}: TableRowActionsProps) {
  return (
    <div className="flex items-center justify-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      <Button type="link" size="small" className="h-7 px-1.5" onClick={onView}>
        查看
      </Button>
      <Button type="link" size="small" className="h-7 px-1.5" onClick={onEdit}>
        修改
      </Button>
      <Popconfirm title={deleteTitle} description={deleteDescription} onConfirm={() => void onDelete()}>
        <Button type="link" size="small" className="h-7 px-1.5 text-red-600 hover:text-red-700">
          删除
        </Button>
      </Popconfirm>
    </div>
  )
}
