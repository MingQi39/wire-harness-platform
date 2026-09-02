import type { UserFeedbackStatus, UserFeedbackType } from '@/api/types'

export const FEEDBACK_TYPE_OPTIONS = [
  { label: '问题反馈', value: 'bug' as const },
  { label: '功能建议', value: 'suggestion' as const },
]

export const FEEDBACK_STATUS_OPTIONS: { label: string; value: UserFeedbackStatus }[] = [
  { label: '待处理', value: 'pending' },
  { label: '处理中', value: 'processing' },
  { label: '已解决', value: 'resolved' },
  { label: '已关闭', value: 'closed' },
]

export const FEEDBACK_TYPE_LABELS: Record<UserFeedbackType, string> = {
  bug: '问题反馈',
  suggestion: '功能建议',
}

export const FEEDBACK_STATUS_LABELS: Record<UserFeedbackStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  resolved: '已解决',
  closed: '已关闭',
}

export const FEEDBACK_TYPE_VARIANTS: Record<UserFeedbackType, 'destructive' | 'secondary'> = {
  bug: 'destructive',
  suggestion: 'secondary',
}

export const FEEDBACK_STATUS_VARIANTS: Record<UserFeedbackStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  processing: 'default',
  resolved: 'secondary',
  closed: 'destructive',
}
