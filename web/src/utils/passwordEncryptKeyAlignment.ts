import axios from 'axios'
import { computeLocalPasswordEncryptKeyFingerprint } from '@/utils/encrypt'
import { getApiBaseUrl } from '@/utils/platform'

interface ApiEnvelope<T> {
  code: number
  message?: string
  data?: T
}

export type PasswordEncryptKeyAlignment =
  | { ok: true }
  | { ok: true; skipped: true; reason: string }
  | { ok: false; localFingerprint: string; remoteFingerprint: string }

function describeFingerprintRequestFailure(err: unknown, baseConfigured: boolean): string {
  if (!axios.isAxiosError(err)) {
    return '无法连接后端'
  }
  const st = err.response?.status
  if (st === 404) {
    return '密钥指纹接口返回 404：后端可能为旧版本，或 VITE_API_BASE_URL 指到了非 API 服务'
  }
  if (st != null && st >= 400) {
    return `密钥指纹请求失败（HTTP ${st}），请确认 VITE_API_BASE_URL 指向后端 API 根地址`
  }
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
    return baseConfigured
      ? '无法连接后端：请确认 VITE_API_BASE_URL 指向 API 服务（勿填前端页面地址）且进程已启动'
      : '无法连接后端：请确认开发代理或后端服务已启动'
  }
  return '无法连接后端或请求异常'
}

/**
 * 请求后端密钥指纹并与本地 VITE_PASSWORD_ENCRYPT_KEY（或默认）比对。
 * 网络失败时不视为不一致，避免离线/后端未启动时误报；reason 会尽量说明 API 基地址类问题。
 */
export async function checkPasswordEncryptKeyAlignment(): Promise<PasswordEncryptKeyAlignment> {
  const local = await computeLocalPasswordEncryptKeyFingerprint()
  const base = getApiBaseUrl().replace(/\/$/, '')
  const baseConfigured = base.length > 0
  const url = `${base}/api/v1/auth/password-encrypt-key-fingerprint`

  try {
    const { data } = await axios.get<ApiEnvelope<{ fingerprint: string }>>(url, {
      timeout: 8000,
      withCredentials: false,
    })
    if (data.code !== 0 || typeof data.data?.fingerprint !== 'string' || !data.data.fingerprint) {
      const reason =
        data.code !== 0 && data.message
          ? `后端未返回有效指纹（${data.message}）`
          : '后端未返回有效指纹'
      if (import.meta.env.DEV) {
        console.warn('[lims] 密码加密密钥自检跳过:', reason)
      }
      return { ok: true, skipped: true, reason }
    }
    const remote = data.data.fingerprint.trim().toLowerCase()
    const loc = local.toLowerCase()
    if (remote !== loc) {
      return { ok: false, localFingerprint: loc, remoteFingerprint: remote }
    }
    return { ok: true }
  } catch (err: unknown) {
    const reason = describeFingerprintRequestFailure(err, baseConfigured)
    if (import.meta.env.DEV) {
      console.warn('[lims] 密码加密密钥自检跳过:', reason, err)
    }
    return { ok: true, skipped: true, reason }
  }
}
