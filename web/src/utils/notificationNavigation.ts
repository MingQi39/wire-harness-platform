import type { Notification } from '@/api/types'
import type { TodoNotificationItem } from '@/stores/todoNotificationStore'
import { canAccessCertificateReportWorkflowWorkspace, PERMISSIONS } from '@/constants/permissions'

export function getLocalNotificationTarget(item: TodoNotificationItem, permissions: readonly string[]) {
  if (item.type !== 'cert_prepare') return item.link

  const [pathname = '', search = ''] = item.link.split('?')
  if (!['/certificate-reports/prepare', '/certificate-reports/review', '/certificate-reports/approve'].includes(pathname)) {
    return item.link
  }
  if (canAccessCertificateReportWorkflowWorkspace(permissions)) {
    const hasPrepare = permissions.includes(PERMISSIONS.CERT_REPORT_PREPARE)
    const hasReview = permissions.includes(PERMISSIONS.CERT_REPORT_REVIEW)
    const hasApprove = permissions.includes(PERMISSIONS.CERT_REPORT_APPROVE)
    const pathAllowed =
      (pathname === '/certificate-reports/prepare' && hasPrepare) ||
      (pathname === '/certificate-reports/review' && hasReview) ||
      (pathname === '/certificate-reports/approve' && hasApprove)
    if (pathAllowed) return item.link

    const nextPath = hasPrepare
      ? '/certificate-reports/prepare'
      : hasReview
        ? '/certificate-reports/review'
        : '/certificate-reports/approve'
    return `${nextPath}${search ? `?${search}` : ''}`
  }

  const currentParams = new URLSearchParams(search)
  const commissionOrderId = currentParams.get('commission_order_id')
  if (!commissionOrderId) return item.link

  const nextParams = new URLSearchParams()
  nextParams.set('focus_id', commissionOrderId)
  const keyword = currentParams.get('keyword')
  if (keyword) nextParams.set('keyword', keyword)

  return `/commission-orders?${nextParams.toString()}`
}

export function getServerNotificationTarget(item: Notification, permissions: readonly string[]) {
  if (item.ref_type === 'commission_order' && item.ref_id > 0) {
    if (permissions.includes(PERMISSIONS.COMMISSION_ORDER_WORKFLOW)) {
      return `/commission-orders?focus_id=${item.ref_id}`
    }
    if (permissions.includes(PERMISSIONS.COMMISSION_ORDER_READ)) {
      return `/commission-orders?focus_id=${item.ref_id}`
    }
    return ''
  }
  if (item.ref_type === "weekly_report" || item.type === "weekly_report") {
    return "/dashboard/boss"
  }

  if (item.ref_type === 'user_feedback') {
    return ''
  }
  if (item.ref_type === 'certificate_prepare' && item.ref_id > 0) {
    if (permissions.includes(PERMISSIONS.CERT_REPORT_PREPARE)) {
      return `/certificate-reports/prepare?commission_order_id=${item.ref_id}`
    }
    if (permissions.includes(PERMISSIONS.CERT_REPORT_REVIEW)) {
      return `/certificate-reports/review?commission_order_id=${item.ref_id}`
    }
    if (permissions.includes(PERMISSIONS.CERT_REPORT_APPROVE)) {
      return `/certificate-reports/approve?commission_order_id=${item.ref_id}`
    }
    if (permissions.includes(PERMISSIONS.COMMISSION_ORDER_READ)) {
      return `/commission-orders?focus_id=${item.ref_id}`
    }
  }
  return ''
}
