import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios'
import { v4 as uuidv4 } from 'uuid'
import { generateTraceId } from '@/utils/trace'
import { useAuthStore } from '@/stores/authStore'
import { appMessage } from '@/utils/appMessage'
import { applyRefreshSession, ensureElectronRefreshTokenLoaded } from '@/utils/authSession'
import { getApiBaseUrl, isElectron } from '@/utils/platform'

function limsClientMarker(): 'electron' | 'web' {
  return isElectron() ? 'electron' : 'web'
}
import type { LoginResp } from './types'

interface ApiResponse<T = unknown> {
  code: number
  message: string
  detail?: string
  data?: T
  trace_id?: string
}

const GLOBAL_MESSAGE_KEYS = {
  invalidResponse: 'global-invalid-response-error',
  bizError: 'global-biz-error',
  forbidden: 'global-forbidden-error',
  conflict: 'global-conflict-warning',
  rateLimit: 'global-rate-limit-warning',
  sessionExpired: 'global-session-expired-warning',
  network: 'global-network-error',
  request: 'global-request-error',
} as const

declare module 'axios' {
  interface AxiosRequestConfig {
    /** 设为 true 时拦截器不弹出业务错误提示，由调用方自行处理 */
    silentBizError?: boolean
    /** 部署窗口网络抖动自动重试计数（内部使用） */
    _networkRetry?: number
  }
}

const client = axios.create({
  timeout: 900000,
  withCredentials: true,
})

/** 部署/网关短暂抖动：自动重试，成功则不弹错；不改变最终失败时的业务文案 */
const DEPLOY_BLIP_RETRY_LIMIT = 2
const DEPLOY_BLIP_RETRY_DELAY_MS = 800

function isDeployBlipRetryable(error: AxiosError): boolean {
  const cfg = error.config
  if (!cfg) return false
  if ((cfg._networkRetry ?? 0) >= DEPLOY_BLIP_RETRY_LIMIT) return false
  if (!error.response) return true
  const status = error.response.status
  return status === 502 || status === 503 || status === 504
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => window.setTimeout(resolve, ms))
}

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.baseURL = getApiBaseUrl()
  config.headers['X-Trace-ID'] = generateTraceId()
  config.headers['X-LIMS-Client'] = limsClientMarker()

  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (['post', 'put'].includes(config.method ?? '')) {
    config.headers['X-Idempotency-Key'] =
      config.headers['X-Idempotency-Key'] || uuidv4()
  }

  // FormData 必须由浏览器/xhr 自动设置 multipart boundary；残留 Content-Type 会导致后端读到空体
  if (config.data instanceof FormData) {
    const h = config.headers
    if (h instanceof AxiosHeaders) {
      h.delete('Content-Type')
    } else if (h && typeof h === 'object') {
      delete (h as Record<string, unknown>)['Content-Type']
      delete (h as Record<string, unknown>)['content-type']
    }
  }

  return config
})

/**
 * 选取展示给用户看的接口失败文案。
 *
 * 后端约定（参考 apperror.WrapError / WrapNotFound 注释）：
 *  - `message` 是基础分类（如「资源冲突」「请求参数错误」「资源不存在」）
 *  - `detail`  是具体业务文案（如「公司信息已被更新，请刷新后重试」「id 参数无效」「委托单 123」）
 *
 * 因此 `detail` 非空时优先展示 `detail`：避免给「唯一约束」「引用约束」等本来不是
 * 「多用户操作同一条数据」的业务错误强加「资源冲突：…」前缀，把用户误导成并发冲突；
 * `detail` 缺失时（如 401 ErrUnauthorized 等直接抛基础错误的场景）才回落到 `message`。
 *
 * 注意：`commissionOrderOptimisticLockRetry.isCommissionOrderOptimisticLockConflict`
 * 主要靠 `err.code === 40900` 判断，文案兜底匹配「数据已被他人更新」子串。
 * 后端真冲突的 `detail` 仍包含此子串，本函数改动不影响重试判定。
 */
function formatApiBodyMessage(r: ApiResponse): string {
  const detail = typeof r.detail === 'string' ? r.detail.trim() : ''
  if (detail) return detail
  const message = typeof r.message === 'string' ? r.message.trim() : ''
  return message
}

/** 无业务 JSON 时，用 HTTP 状态给可读中文说明（如 blob 错误体无法同步解析） */
function userMessageForHttpStatus(status: number): string {
  switch (status) {
    case 400:
      return '请求参数无效'
    case 404:
      return '未找到相关资源，请检查数据是否存在或接口版本是否匹配'
    case 413:
      return '请求内容过大'
    case 500:
    case 502:
    case 503:
    case 504:
      return '服务暂时不可用，请稍后重试'
    default:
      if (status >= 500) return '服务暂时不可用，请稍后重试'
      if (status >= 400) return '请求未成功，请稍后重试'
      return '请求未成功，请稍后重试'
  }
}

/** 解析 axios 响应体（可能是对象或 JSON 字符串） */
function parseErrorResponseBody(raw: unknown): ApiResponse | null {
  if (raw == null) return null
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as ApiResponse
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as ApiResponse
      }
    } catch {
      /* ignore */
    }
  }
  return null
}

/** 解析错误响应体；blob 时异步读文本再尝试 JSON（与 responseType: blob 时的失败响应一致） */
async function parseErrorResponseData(raw: unknown): Promise<ApiResponse | null> {
  const direct = parseErrorResponseBody(raw)
  if (direct) return direct
  if (raw instanceof Blob) {
    try {
      const text = await raw.text()
      return parseErrorResponseBody(text)
    } catch {
      return null
    }
  }
  return null
}

/**
 * responseType 为 blob/arraybuffer 时，失败响应常为 Blob 包裹的 JSON，
 * {@link getApiErrorMessage} 同步路径读不到 body，`detail` 会丢失；可在 catch 中用本函数。
 */
export async function getApiErrorMessageAsync(err: unknown): Promise<string> {
  if (axios.isAxiosError(err)) {
    const raw = err.response?.data
    if (raw instanceof Blob) {
      const parsed = await parseErrorResponseData(raw)
      if (parsed) {
        const text = formatApiBodyMessage(parsed)
        if (text) return text
        if (parsed.code != null && parsed.code !== 0) {
          return `请求失败（错误码 ${parsed.code}）`
        }
      }
    }
    const syncParsed = parseErrorResponseBody(err.response?.data)
    if (syncParsed) {
      const text = formatApiBodyMessage(syncParsed)
      if (text) return text
    }
  }
  return getApiErrorMessage(err)
}

/** 从未知错误中提取可读文案（供 silent 请求如登录在 mutation onError 中使用） */
export function getApiErrorMessage(err: unknown): string {
  if (err instanceof BizError) {
    return err.message || '操作失败'
  }
  if (axios.isAxiosError(err)) {
    const status = err.response?.status
    const r = parseErrorResponseBody(err.response?.data)
    if (r) {
      const text = formatApiBodyMessage(r)
      if (text) return text
      if (r.code != null && r.code !== 0) {
        return `请求失败（错误码 ${r.code}）`
      }
    }
    if (!err.response) {
      return '无法连接服务器，请确认后端已启动或代理配置正确'
    }
    if (err.response.data instanceof Blob && status) {
      return userMessageForHttpStatus(status)
    }
    if (status) {
      return userMessageForHttpStatus(status)
    }
    return '请求未成功，请稍后重试'
  }
  if (err instanceof Error && err.message) {
    return err.message
  }
  return '操作失败'
}

client.interceptors.response.use(
  (res) => {
    const raw = res.data
    // 文件下载（blob / arraybuffer）不走统一 JSON 信封
    if (res.config.responseType === 'blob' || res.config.responseType === 'arraybuffer') {
      return raw as never
    }
    if (raw instanceof Blob) {
      return raw as never
    }
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
      if (!res.config?.silentBizError) {
        appMessage().error({ content: '服务返回数据异常', key: GLOBAL_MESSAGE_KEYS.invalidResponse })
      }
      return Promise.reject(new BizError(50000, '服务返回数据异常', ''))
    }
    const data = raw as ApiResponse
    if (data.code !== 0) {
      const errText = formatApiBodyMessage(data) || '操作失败'
      if (!res.config?.silentBizError) {
        appMessage().error({ content: errText, key: `${GLOBAL_MESSAGE_KEYS.bizError}-${data.code}` })
      }
      return Promise.reject(new BizError(data.code, errText, data.trace_id || ''))
    }
    return data.data as never
  },
  async (error: AxiosError<ApiResponse>) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error)
    }

    if (error.config && isDeployBlipRetryable(error)) {
      const cfg = error.config
      cfg._networkRetry = (cfg._networkRetry ?? 0) + 1
      await sleep(DEPLOY_BLIP_RETRY_DELAY_MS)
      return client.request(cfg)
    }

    const status = error.response?.status
    const rawData = error.response?.data
    const parsed = await parseErrorResponseData(rawData)
    const silent = error.config?.silentBizError
    const bizMsg = parsed ? formatApiBodyMessage(parsed) : ''
    const statusHint = status && !bizMsg ? userMessageForHttpStatus(status) : ''
    const rejectErr =
      parsed?.code != null && parsed.code !== 0
        ? new BizError(parsed.code, bizMsg || '请求失败', parsed.trace_id || '')
        : error

    if (status === 401) {
      const isLoginReq = error.config?.url?.includes('/auth/login')

      if (isLoginReq) {
        if (!silent) appMessage().error(bizMsg || '用户名或密码错误')
        return Promise.reject(rejectErr)
      }

      const alreadyRetried = (error.config as unknown as Record<string, unknown>)?._retried
      if (!alreadyRetried) {
        const refreshed = await tryRefreshToken()
        if (refreshed && error.config) {
          ;(error.config as unknown as Record<string, unknown>)._retried = true
          return client.request(error.config)
        }
      }
      useAuthStore.getState().logout()
      appMessage().warning({ content: '登录已失效，请重新登录', key: GLOBAL_MESSAGE_KEYS.sessionExpired })
      window.setTimeout(() => {
        if (isElectron()) {
          window.location.hash = '#/login'
        } else {
          const loginHref =
            import.meta.env.BASE_URL === '/' ? '/login' : `${import.meta.env.BASE_URL}login`
          window.location.href = loginHref
        }
      }, 150)
      return Promise.reject(error)
    }

    if (status === 403) {
      if (!silent) {
        appMessage().error({
          content: bizMsg || '没有操作权限',
          key: GLOBAL_MESSAGE_KEYS.forbidden,
        })
      }
      return Promise.reject(rejectErr)
    }

    if (status === 409) {
      if (!silent) {
        appMessage().warning({
          content: bizMsg || '当前数据存在引用或冲突，无法完成操作',
          key: GLOBAL_MESSAGE_KEYS.conflict,
        })
      }
      return Promise.reject(rejectErr)
    }

    if (status === 429) {
      if (!silent) {
        appMessage().warning({
          content: '操作过于频繁，请稍后再试',
          key: GLOBAL_MESSAGE_KEYS.rateLimit,
        })
      }
      return Promise.reject(rejectErr)
    }

    if (!silent) {
      const showMsg = bizMsg || statusHint
      if (showMsg) {
        appMessage().error({
          content: showMsg,
          key: status ? `${GLOBAL_MESSAGE_KEYS.request}-${status}` : GLOBAL_MESSAGE_KEYS.request,
        })
      } else if (!error.response) {
        appMessage().error({
          content: '无法连接服务器，请确认后端已启动或代理配置正确',
          key: GLOBAL_MESSAGE_KEYS.network,
        })
      } else {
        appMessage().error({ content: '网络异常，请稍后重试', key: GLOBAL_MESSAGE_KEYS.request })
      }
    }
    return Promise.reject(rejectErr)
  },
)

export class BizError extends Error {
  code: number
  traceId: string
  constructor(code: number, message: string, traceId: string) {
    super(message)
    this.code = code
    this.traceId = traceId
  }
}

/**
 * 判断错误是否已经被全局 axios 拦截器消化掉（已经向用户弹过 toast）。
 *
 * 必须在调用方写自定义 toast 前先 short-circuit 这一类错误，否则会出现
 * 「全局拦截器弹一条 + 调用方 catch/onError 再弹一条」的重复 message。
 * 历史上证书报告编制「批量相同」按钮就是因为没做这层判断，409 时同时显示
 * 「资源冲突」+「批量同步失败」，被产品视为 bug。
 *
 * 仅用于"调用方在 await mutation/api 之后想再追加一条业务文案"的场景；
 * 当 API 显式传了 `silentBizError: true` 时，全局拦截器没有弹过 toast，
 * 调用方应当直接弹自己的（而不是借助这个辅助函数）。
 */
export function isHandledApiError(err: unknown): boolean {
  return err instanceof BizError || axios.isAxiosError(err)
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  return client.request<ApiResponse<T>, T>(config)
}

/** 合并并发 refresh（StrictMode 双 mount、多请求同时 401），避免轮换 refresh 时竞态 */
let refreshInFlight: Promise<LoginResp | null> | null = null
const REFRESH_REQUEST_TIMEOUT_MS = 10_000

/**
 * 调用刷新接口获取新的 access token，不经带拦截器的 client（避免 401 递归）。
 * Web 端通过 HttpOnly Cookie 携带 refresh token；
 * Electron 端 file:// 下 SameSite Cookie 无法跨站携带，改用 body 传递。
 * 供首屏会话恢复与 401 重试共用；多路并发只会发起一次 HTTP。
 */
export async function refreshAccessToken(): Promise<LoginResp | null> {
  if (refreshInFlight) {
    return refreshInFlight
  }
  refreshInFlight = (async () => {
    try {
      const baseURL = getApiBaseUrl()
      const requestRefresh = async (
        body: unknown,
        headers: Record<string, string>,
      ): Promise<LoginResp | null> => {
        try {
          const res = await axios.post<ApiResponse<LoginResp>>(
            `${baseURL}/api/v1/auth/refresh`,
            body,
            {
              withCredentials: true,
              timeout: REFRESH_REQUEST_TIMEOUT_MS,
              headers: {
                ...headers,
                'X-LIMS-Client': limsClientMarker(),
                'X-Trace-ID': generateTraceId(),
              },
            },
          )
          const resp = res.data
          if (resp == null || typeof resp !== 'object' || resp.code !== 0) {
            return null
          }
          const data = resp.data
          if (!data?.access_token) {
            return null
          }
          return data
        } catch {
          return null
        }
      }

      if (!isElectron()) {
        return await requestRefresh(null, {})
      }

      const storedRefresh = await ensureElectronRefreshTokenLoaded()
      // Electron 优先走 body token（规避 SameSite），并回退一次 cookie 刷新，兼容不同网关/部署策略。
      if (storedRefresh) {
        const byBody = await requestRefresh(
          { refresh_token: storedRefresh },
          {
            'X-Token-In-Body': 'true',
            'Content-Type': 'application/json',
          },
        )
        if (byBody?.access_token) {
          return byBody
        }
      }

      return await requestRefresh(
        null,
        {
          'X-Token-In-Body': 'true',
        },
      )
    } catch {
      return null
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

async function tryRefreshToken(): Promise<boolean> {
  const data = await refreshAccessToken()
  if (!data?.access_token) {
    return false
  }
  await applyRefreshSession(data)
  return true
}

export default client
