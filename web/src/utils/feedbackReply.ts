import type { FeedbackAttachment, UserFeedback } from '@/api/types'

export function hasDeveloperReply(feedback: UserFeedback) {
  const hasText = Boolean(feedback.developer_reply?.trim())
  const attachmentCount = feedback.developer_reply_attachments?.length
    ?? feedback.developer_reply_attachment_file_ids?.length
    ?? 0
  return hasText || attachmentCount > 0
}

export function normalizeFeedbackAttachments(
  fileIds: number[] | undefined,
  attachments: FeedbackAttachment[] | undefined,
): FeedbackAttachment[] {
  if (attachments?.length) return attachments
  return (fileIds ?? []).map((id) => ({
    id,
    file_name: `附件 #${id}`,
    content_type: '',
    file_size: 0,
  }))
}
