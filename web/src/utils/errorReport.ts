import { generateTraceId } from '@/utils/trace'
import { getApiBaseUrl } from '@/utils/platform'

interface ErrorReport {
  trace_id: string
  type: 'js_error' | 'unhandled_rejection' | 'react_error' | 'api_error'
  message: string
  stack?: string
  url: string
  user_agent: string
  timestamp: string
}

export function reportError(report: ErrorReport) {
  const base = (getApiBaseUrl() || '').replace(/\/$/, '')
  const traceId = report.trace_id?.trim() || generateTraceId()
  const payload: ErrorReport = {
    ...report,
    trace_id: traceId,
  }
  void fetch(`${base}/api/v1/errors/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Trace-ID': traceId,
    },
    body: JSON.stringify(payload),
    keepalive: true,
    credentials: 'include',
  }).catch(() => {})
}

function onError(event: ErrorEvent) {
  reportError({
    trace_id: generateTraceId(),
    type: 'js_error',
    message: event.message,
    stack: event.error?.stack,
    url: window.location.href,
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  })
}

function onUnhandledRejection(event: PromiseRejectionEvent) {
  reportError({
    trace_id: generateTraceId(),
    type: 'unhandled_rejection',
    message: String(event.reason),
    stack: event.reason?.stack,
    url: window.location.href,
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString(),
  })
}

window.addEventListener('error', onError)
window.addEventListener('unhandledrejection', onUnhandledRejection)

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onUnhandledRejection)
  })
}
