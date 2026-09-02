import { v4 as uuidv4 } from 'uuid'

export function generateTraceId(): string {
  return uuidv4()
}

/** 供 fetch / 裸 axios 等非 client 拦截器场景携带 X-Trace-ID */
export function traceIdHeaders(existing?: Record<string, string>): Record<string, string> {
  return {
    ...existing,
    'X-Trace-ID': generateTraceId(),
  }
}

/** 生成 trace id 并返回 header 与 id，便于 body 与 header 使用同一值 */
export function newTraceContext(existing?: Record<string, string>): { traceId: string; headers: Record<string, string> } {
  const traceId = generateTraceId()
  return {
    traceId,
    headers: {
      ...existing,
      'X-Trace-ID': traceId,
    },
  }
}
