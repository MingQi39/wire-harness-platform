/**
 * 密码 AES-CBC 加密工具
 *
 * 前端加密流程: plaintext → AES-CBC(randomIV, PKCS7) → base64(IV + ciphertext)
 * 后端解密流程: base64 decode → 取前 16 字节为 IV → AES-CBC 解密 → 去 PKCS7 padding
 *
 * 密钥需与后端 PASSWORD_ENCRYPT_KEY 保持一致。
 * 生产环境必须通过 VITE_PASSWORD_ENCRYPT_KEY 环境变量注入。
 *
 * 说明：`crypto.subtle` 仅在「安全上下文」可用（HTTPS 或 localhost）。
 * Electron 从 file:// 加载、局域网 IP + HTTP 访问等场景 `subtle` 可能不存在或
 * 功能受限，此时自动降级为 aes-js 纯 JS 实现，输出格式与 Web Crypto 路径一致。
 */

import aesjs from 'aes-js'
import { sha256HexSync } from '@/utils/sha256'

const DEFAULT_KEY_HEX = 'b98d14225ca0a153cbf1df41462c5727'

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

/**
 * 校验并规范化 PASSWORD 传输密钥 hex，与后端支持的 16/24/32 字节（32/48/64 hex）一致。
 * 生产环境非法配置直接抛错；开发环境非法时回退默认密钥并打日志（与后端非 prod 行为对齐）。
 */
function normalizePasswordEncryptKeyHex(raw: string | undefined): string {
  if (raw == null || String(raw).trim() === '') {
    if (import.meta.env.PROD) {
      throw new Error('生产环境必须配置 VITE_PASSWORD_ENCRYPT_KEY（须与后端 PASSWORD_ENCRYPT_KEY 一致）')
    }
    return DEFAULT_KEY_HEX
  }
  const s = String(raw).trim().replace(/^0x/i, '')
  if (!/^[0-9a-fA-F]+$/.test(s)) {
    if (import.meta.env.PROD) {
      throw new Error(
        'VITE_PASSWORD_ENCRYPT_KEY 须为十六进制字符串（须与后端 PASSWORD_ENCRYPT_KEY 一致）',
      )
    }
    console.error('[lims] VITE_PASSWORD_ENCRYPT_KEY 含非十六进制字符，已回退内置开发密钥')
    return DEFAULT_KEY_HEX
  }
  if (s.length !== 32 && s.length !== 48 && s.length !== 64) {
    if (import.meta.env.PROD) {
      throw new Error(
        'VITE_PASSWORD_ENCRYPT_KEY 长度须为 32、48 或 64 个十六进制字符（AES-128/192/256）',
      )
    }
    console.error('[lims] VITE_PASSWORD_ENCRYPT_KEY 长度无效，已回退内置开发密钥')
    return DEFAULT_KEY_HEX
  }
  return s.toLowerCase()
}

const KEY_HEX: string = normalizePasswordEncryptKeyHex(import.meta.env.VITE_PASSWORD_ENCRYPT_KEY)
const KEY_BYTES: Uint8Array = hexToBytes(KEY_HEX)

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  try {
    if (typeof globalThis.crypto?.subtle?.digest === 'function') {
      const buf = await crypto.subtle.digest('SHA-256', bytes)
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    }
  } catch {
    /* Web Crypto 在部分 Electron file:// 场景下不可用，与 aes-js 加密降级策略一致 */
  }
  return sha256HexSync(bytes)
}

/** 与后端 auth.EncryptKeyFingerprint 一致：对当前 AES 密钥字节做 SHA256 后十六进制小写字符串 */
export async function computeLocalPasswordEncryptKeyFingerprint(): Promise<string> {
  return sha256Hex(KEY_BYTES)
}

function toBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[])
  }
  return btoa(binary)
}

function encryptPasswordAesJs(plaintext: string): string {
  const iv = crypto.getRandomValues(new Uint8Array(16))
  const encoded = new TextEncoder().encode(plaintext)
  const padded = aesjs.padding.pkcs7.pad(encoded)
  const aesCbc = new aesjs.ModeOfOperation.cbc(KEY_BYTES, iv)
  const cipherBytes = aesCbc.encrypt(padded)

  const result = new Uint8Array(iv.length + cipherBytes.length)
  result.set(iv)
  result.set(cipherBytes, iv.length)

  return toBase64(result)
}

let subtleVerified = false
let subtleAvailable = false
let cachedKey: CryptoKey | null = null

async function trySubtleEncrypt(plaintext: string): Promise<string | null> {
  if (subtleVerified && !subtleAvailable) return null

  try {
    if (typeof globalThis.crypto?.subtle?.encrypt !== 'function') {
      subtleVerified = true
      subtleAvailable = false
      return null
    }

    if (!cachedKey) {
      cachedKey = await crypto.subtle.importKey('raw', KEY_BYTES, 'AES-CBC', false, ['encrypt'])
    }

    const iv = crypto.getRandomValues(new Uint8Array(16))
    const encoded = new TextEncoder().encode(plaintext)
    const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, cachedKey, encoded)
    const cipherBytes = new Uint8Array(cipherBuf)

    const result = new Uint8Array(iv.length + cipherBytes.length)
    result.set(iv)
    result.set(cipherBytes, iv.length)

    subtleVerified = true
    subtleAvailable = true
    return toBase64(result)
  } catch (e) {
    console.warn('[encrypt] crypto.subtle 加密失败，降级为 aes-js', e)
    subtleVerified = true
    subtleAvailable = false
    cachedKey = null
    return null
  }
}

export async function encryptPassword(plaintext: string): Promise<string> {
  const result = await trySubtleEncrypt(plaintext)
  if (result !== null) return result
  return encryptPasswordAesJs(plaintext)
}
