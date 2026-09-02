import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { commissionOrderApi } from '@/api/commissionOrder'
import { certificatePrepareWorkflowApi } from '@/api/certificatePrepareWorkflow'
import { useAuthStore } from '@/stores/authStore'
import { useTodoNotificationStore, type TodoNotificationItem } from '@/stores/todoNotificationStore'
import { canAccessCertificateReportWorkflowWorkspace, PERMISSIONS } from '@/constants/permissions'
import { commissionOrderWorkflowTodoKeys } from '@/hooks/useCommissionOrders'
import { certificatePrepareWorkflowTodoKeys } from '@/hooks/useCertificatePrepareWorkflow'
import type { CommissionOrderWorkflowTodo, CertificatePrepareWorkflowTodo } from '@/api/types'
import { getLocalNotificationTarget } from '@/utils/notificationNavigation'
import { isAppWindowFocused, showSystemNotification } from '@/utils/systemNotification'
import { isElectron } from '@/utils/platform'

function commissionKey(t: CommissionOrderWorkflowTodo) {
  return `commission_${t.commission_order_id}_${t.todo_kind ?? 'workflow'}`
}

function certKey(t: CertificatePrepareWorkflowTodo) {
  return `cert_${t.commission_order_id}_${t.equipment_line_index}`
}

export function commissionTodoLink(t: CommissionOrderWorkflowTodo) {
  const keyword = encodeURIComponent(t.order_number)
  return `/commission-orders?focus_id=${t.commission_order_id}&keyword=${keyword}`
}

export function certificatePreparePathByStep(step: number | undefined) {
  if (step === 2) return '/certificate-reports/review'
  if (step === 3) return '/certificate-reports/approve'
  return '/certificate-reports/prepare'
}

function fallbackCertificatePreparePath(permissions: readonly string[]) {
  if (permissions.includes(PERMISSIONS.CERT_REPORT_PREPARE)) return '/certificate-reports/prepare'
  if (permissions.includes(PERMISSIONS.CERT_REPORT_REVIEW)) return '/certificate-reports/review'
  if (permissions.includes(PERMISSIONS.CERT_REPORT_APPROVE)) return '/certificate-reports/approve'
  return '/certificate-reports/prepare'
}

export function resolveCertificatePrepareTodoPath(step: number | undefined, permissions: readonly string[]) {
  const strictPath = certificatePreparePathByStep(step)
  if (strictPath === '/certificate-reports/prepare') {
    return permissions.includes(PERMISSIONS.CERT_REPORT_PREPARE)
      ? strictPath
      : fallbackCertificatePreparePath(permissions)
  }
  if (strictPath === '/certificate-reports/review') {
    return permissions.includes(PERMISSIONS.CERT_REPORT_REVIEW)
      ? strictPath
      : fallbackCertificatePreparePath(permissions)
  }
  return permissions.includes(PERMISSIONS.CERT_REPORT_APPROVE)
    ? strictPath
    : fallbackCertificatePreparePath(permissions)
}

export function certificatePrepareTodoLink(t: CertificatePrepareWorkflowTodo) {
  const permissions = useAuthStore.getState().permissions
  const base = resolveCertificatePrepareTodoPath(t.step, permissions)
  return `${base}?commission_order_id=${t.commission_order_id}&line_index=${t.equipment_line_index}&keyword=${encodeURIComponent(t.order_number)}`
}

export function certificatePrepareTodoDeviceLabel(t: CertificatePrepareWorkflowTodo) {
  return t.device_name?.trim() || '未填写设备名称'
}

export function shouldIncludeCommissionTodoNotification(t: CommissionOrderWorkflowTodo) {
  return t.todo_kind !== 'equipment_assigned'
}

/**
 * 轮询委托单 / 证书编制待办列表，检测新增项并弹出通知。
 * 与 Dashboard 共享 TanStack Query 缓存（相同 queryKey）。
 */
export function useTodoNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const userId = useAuthStore((s) => s.userId)
  const tenantId = useAuthStore((s) => s.tenantId)
  const permissions = useAuthStore((s) => s.permissions)
  const canCommissionWorkflow = permissions.includes(PERMISSIONS.COMMISSION_ORDER_WORKFLOW)
  const canCertPrepare = canAccessCertificateReportWorkflowWorkspace(permissions)

  const { data: commissionTodos } = useQuery({
    queryKey: commissionOrderWorkflowTodoKeys.all,
    queryFn: () => commissionOrderApi.listWorkflowTodos(),
    enabled: isAuthenticated && canCommissionWorkflow,
    refetchInterval: 120_000,
    refetchIntervalInBackground: isElectron(),
    staleTime: 60_000,
  })

  const { data: certPrepareTodos } = useQuery({
    queryKey: certificatePrepareWorkflowTodoKeys.all,
    queryFn: () => certificatePrepareWorkflowApi.listTodos(),
    enabled: isAuthenticated && canCertPrepare,
    refetchInterval: 120_000,
    refetchIntervalInBackground: isElectron(),
    staleTime: 60_000,
  })

  const wasAuthenticated = useRef(isAuthenticated)
  useEffect(() => {
    if (wasAuthenticated.current && !isAuthenticated) {
      useTodoNotificationStore.getState().clearAll()
    }
    wasAuthenticated.current = isAuthenticated
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    if (tenantId && userId) {
      useTodoNotificationStore.getState().ensureOwner(`${tenantId}:${userId}`)
    }

    const commissionReady = !canCommissionWorkflow || commissionTodos !== undefined
    const certPrepareReady = !canCertPrepare || certPrepareTodos !== undefined
    if (!commissionReady || !certPrepareReady) return

    const store = useTodoNotificationStore.getState()
    const knownSet = new Set(store.knownTodoKeys)
    const currentKeys: string[] = []
    const currentItems: TodoNotificationItem[] = []
    const newItems: TodoNotificationItem[] = []

    if (commissionTodos) {
      for (const todo of commissionTodos) {
        if (!shouldIncludeCommissionTodoNotification(todo)) continue
        const k = commissionKey(todo)
        currentKeys.push(k)
        const desc = `${todo.customer_name} · 当前第 ${todo.step} 步`
        const item: TodoNotificationItem = {
          id: k,
          type: 'commission',
          title: `委托单待办：${todo.order_number}`,
          description: desc,
          link: commissionTodoLink(todo),
          isRead: false,
          createdAt: new Date().toISOString(),
        }
        currentItems.push(item)
        if (store.initialized && !knownSet.has(k)) newItems.push(item)
      }
    }

    if (certPrepareTodos) {
      for (const todo of certPrepareTodos) {
        const k = certKey(todo)
        currentKeys.push(k)
        const stepLabel =
          todo.step === 2
            ? '证书审核'
            : todo.step === 3
              ? '证书批准'
              : todo.step === 1
                ? '证书审核提交'
                : `第 ${todo.step} 步`
        const item: TodoNotificationItem = {
          id: k,
          type: 'cert_prepare',
          title: `证书编制：${todo.order_number}`,
          description: `${certificatePrepareTodoDeviceLabel(todo)} · ${todo.customer_name} · ${stepLabel}`,
          link: certificatePrepareTodoLink(todo),
          isRead: false,
          createdAt: new Date().toISOString(),
        }
        currentItems.push(item)
        if (store.initialized && !knownSet.has(k)) newItems.push(item)
      }
    }

    store.replaceNotifications(syncCurrentTodoNotifications(store.notifications, currentItems))
    if (!store.initialized) {
      store.syncKnownKeys(currentKeys)
      store.setInitialized()
      return
    }

    store.syncKnownKeys(currentKeys)
    if (newItems.length > 0) {
      store.addNotifications(newItems)
      void notifyNewTodoItems(newItems, permissions)
    }
  }, [commissionTodos, certPrepareTodos, isAuthenticated, tenantId, userId, canCommissionWorkflow, canCertPrepare, permissions])
}

async function notifyNewTodoItems(items: TodoNotificationItem[], permissions: readonly string[]) {
  const focused = await isAppWindowFocused()
  for (const item of items) {
    const link = getLocalNotificationTarget(item, permissions)
    if (focused) {
      toast.info(item.title, { description: item.description, duration: 4500 })
      continue
    }
    await showSystemNotification({
      id: `local-${item.id}`,
      title: item.title,
      body: item.description,
      link,
    })
  }
}

function syncCurrentTodoNotifications(
  existing: TodoNotificationItem[],
  current: TodoNotificationItem[],
) {
  const existingById = new Map(existing.map((item) => [item.id, item]))
  return current.map((item) => {
    const existingItem = existingById.get(item.id)
    if (!existingItem) return item
    return {
      ...item,
      isRead: existingItem.isRead,
      createdAt: existingItem.createdAt,
    }
  })
}
