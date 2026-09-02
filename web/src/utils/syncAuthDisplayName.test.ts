import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  setUserName: vi.fn(),
}))

vi.mock('@/api/auth', () => ({
  authApi: {
    getProfile: mocks.getProfile,
  },
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      setUserName: mocks.setUserName,
    }),
  },
}))

describe('syncAuthDisplayNameFromProfile', () => {
  beforeEach(() => {
    mocks.getProfile.mockReset()
    mocks.setUserName.mockReset()
  })

  it('优先用姓名更新侧边栏展示', async () => {
    mocks.getProfile.mockResolvedValue({ name: '张三', username: 'bjy' })
    const { syncAuthDisplayNameFromProfile } = await import('./syncAuthDisplayName')
    await expect(syncAuthDisplayNameFromProfile()).resolves.toBe('张三')
    expect(mocks.setUserName).toHaveBeenCalledWith('张三')
  })

  it('姓名为空时回落用户名', async () => {
    mocks.getProfile.mockResolvedValue({ name: '  ', username: 'bjy' })
    const { syncAuthDisplayNameFromProfile } = await import('./syncAuthDisplayName')
    await expect(syncAuthDisplayNameFromProfile()).resolves.toBe('bjy')
    expect(mocks.setUserName).toHaveBeenCalledWith('bjy')
  })
})
