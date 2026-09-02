/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import { getAccessTokenExpirySec, isAccessTokenExpired } from '@/utils/accessToken'

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `${header}.${body}.sig`
}

describe('accessToken utils', () => {
  it('reads exp from jwt payload', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const token = makeJwt({ exp })
    expect(getAccessTokenExpirySec(token)).toBe(exp)
  })

  it('treats token as expired within skew window', () => {
    const exp = Math.floor(Date.now() / 1000) + 10
    const token = makeJwt({ exp })
    expect(isAccessTokenExpired(token, 30_000)).toBe(true)
  })

  it('treats token as valid when far from expiry', () => {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const token = makeJwt({ exp })
    expect(isAccessTokenExpired(token)).toBe(false)
  })
})
