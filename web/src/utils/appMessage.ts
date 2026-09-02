import type { ReactNode } from 'react'
import { toast } from 'sonner'

type ToastInput = string | { content?: ReactNode; key?: string; duration?: number }

function normalizeToast(input: ToastInput) {
  if (typeof input === 'string') return { description: input, id: undefined, duration: undefined }
  return {
    description: input.content ?? '',
    id: input.key,
    duration: input.duration != null ? input.duration * 1000 : undefined,
  }
}

export const appToast = {
  success: (input: ToastInput) => {
    const { description, ...options } = normalizeToast(input)
    return toast.success(description, options)
  },
  error: (input: ToastInput) => {
    const { description, ...options } = normalizeToast(input)
    return toast.error(description, options)
  },
  warning: (input: ToastInput) => {
    const { description, ...options } = normalizeToast(input)
    return toast.warning(description, options)
  },
  info: (input: ToastInput) => {
    const { description, ...options } = normalizeToast(input)
    return toast.info(description, options)
  },
  loading: (input: ToastInput) => {
    const { description, ...options } = normalizeToast(input)
    return toast.loading(description, options)
  },
  /**
   * 关闭指定 id 的 toast（或全部）。
   * Sonner 的 `toast.loading` 故意不支持 duration 自动消失（避免用户没看到结果就关闭），
   * 因此需要调用方在 `await` 完成后通过 `dismiss(key)` 显式关闭。
   */
  dismiss: (id?: string | number) => {
    if (id != null) {
      toast.dismiss(id)
    } else {
      toast.dismiss()
    }
  },
}

/** 统一应用消息入口，底层使用 Sonner。 */
export function appMessage() {
  return appToast
}
