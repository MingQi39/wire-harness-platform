/** 旧版桌面安装包缺少 preload API 时，提示用户升级客户端（仅网页热更新无法补齐主进程能力）。 */
export const DESKTOP_CLIENT_UPGRADE_MESSAGE =
  '当前桌面客户端版本较旧，请安装最新版后使用此功能'

export const DESKTOP_LABEL_PRINT_UPGRADE_MESSAGE =
  '标签打印需要新版桌面客户端，请安装最新版安装包后再试'

type ElectronFn = (...args: unknown[]) => unknown

export function getElectronAPI(): Window['electronAPI'] | undefined {
  if (typeof window === 'undefined') return undefined
  return window.electronAPI
}

/** preload 是否暴露了可调用的方法（旧壳 + 新前端兼容门禁）。 */
export function hasElectronCapability(method: keyof NonNullable<Window['electronAPI']>): boolean {
  const api = getElectronAPI()
  return typeof api?.[method] === 'function'
}

export function getElectronCapability<K extends keyof NonNullable<Window['electronAPI']>>(
  method: K,
): NonNullable<Window['electronAPI']>[K] | undefined {
  const fn = getElectronAPI()?.[method]
  return typeof fn === 'function' ? fn : undefined
}

export async function invokeElectronCapability<K extends keyof NonNullable<Window['electronAPI']>>(
  method: K,
  ...args: unknown[]
): Promise<unknown> {
  const fn = getElectronCapability(method)
  if (!fn) {
    throw new Error(`${String(method)} is not available on this desktop client`)
  }
  return await (fn as ElectronFn)(...args)
}

/** 自动更新监听：旧壳可能仅有 checkForUpdate 而无 onUpdate* 回调。 */
export function supportsDesktopAutoUpdateListeners(): boolean {
  return (
    hasElectronCapability('checkForUpdate') &&
    hasElectronCapability('onUpdateAvailable') &&
    hasElectronCapability('onUpdateNotAvailable') &&
    hasElectronCapability('onUpdateProgress') &&
    hasElectronCapability('onUpdateReady') &&
    hasElectronCapability('onUpdateError')
  )
}

export function supportsDesktopAutoUpdateStatus(): boolean {
  return hasElectronCapability('getUpdateStatus')
}

export function supportsSecureStorage(): boolean {
  return (
    hasElectronCapability('secureStorageGet') &&
    hasElectronCapability('secureStorageSet') &&
    hasElectronCapability('secureStorageRemove')
  )
}
