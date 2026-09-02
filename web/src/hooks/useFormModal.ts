import { useCallback, useEffect, useRef, useState } from 'react'
import { Form, type FormInstance } from '@/components/ui/app-ui'

interface UseFormModalReturn<T, F extends Record<string, unknown> = Record<string, unknown>> {
  open: boolean
  editingItem: T | null
  form: FormInstance<F>
  /** Can be used directly as onClick handler or called with initial values. */
  openCreate: (initialValuesOrEvent?: Record<string, unknown> | unknown) => void
  openEdit: (item: T, initialValues?: Record<string, unknown>) => void
  close: () => void
  isEditing: boolean
}

export function useFormModal<T = unknown, F extends Record<string, unknown> = Record<string, unknown>>(): UseFormModalReturn<T, F> {
  const [open, setOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)
  const [form] = Form.useForm<F>()
  const pendingRef = useRef<Record<string, unknown> | 'reset' | null>(null)

  useEffect(() => {
    if (!open || pendingRef.current === null) return
    const pending = pendingRef.current
    pendingRef.current = null
    if (pending === 'reset') form.resetFields()
    else form.setFieldsValue(pending as Partial<F>)
  }, [open, form])

  const openCreate = useCallback((initialValuesOrEvent?: Record<string, unknown> | unknown) => {
    setEditingItem(null)
    const isPlainObject =
      initialValuesOrEvent !== null &&
      initialValuesOrEvent !== undefined &&
      typeof initialValuesOrEvent === 'object' &&
      !('nativeEvent' in (initialValuesOrEvent as Record<string, unknown>))
    pendingRef.current = isPlainObject ? (initialValuesOrEvent as Record<string, unknown>) : 'reset'
    setOpen(true)
  }, [])

  const openEdit = useCallback((item: T, initialValues?: Record<string, unknown>) => {
    setEditingItem(item)
    pendingRef.current = initialValues ?? (item as unknown as Record<string, unknown>)
    setOpen(true)
  }, [])

  const close = useCallback(() => {
    form.resetFields()
    setOpen(false)
    setEditingItem(null)
  }, [form])

  return { open, editingItem, form, openCreate, openEdit, close, isEditing: editingItem !== null }
}
