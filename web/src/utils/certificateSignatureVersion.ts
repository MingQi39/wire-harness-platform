const CERTIFICATE_SIGNATURE_VERSION_KEY = 'lims:certificate-signature-version'

let memoryCertificateSignatureVersion = ''
let preferMemoryCertificateSignatureVersion = false

export function getCertificateSignatureVersion(): string {
  if (preferMemoryCertificateSignatureVersion) {
    return memoryCertificateSignatureVersion
  }
  try {
    return window.localStorage.getItem(CERTIFICATE_SIGNATURE_VERSION_KEY) || memoryCertificateSignatureVersion
  } catch {
    return memoryCertificateSignatureVersion
  }
}

export function bumpCertificateSignatureVersion(): string {
  const version = `${Date.now()}:${Math.random().toString(36).slice(2)}`
  memoryCertificateSignatureVersion = version
  try {
    window.localStorage.setItem(CERTIFICATE_SIGNATURE_VERSION_KEY, version)
    preferMemoryCertificateSignatureVersion = false
  } catch {
    preferMemoryCertificateSignatureVersion = true
    // localStorage 不可用时，内存版本仍能使本会话的旧 PDF 缓存失效。
  }
  return version
}
