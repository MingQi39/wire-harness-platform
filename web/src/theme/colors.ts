/**
 * ===== 主题色配置（唯一入口）=====
 *
 * 修改 THEME_PRIMARY 后，应用主题和 Tailwind CSS 会同步生效。
 * 其他语义色（成功、警告、错误）也在此统一管理。
 */

/** B 端常见主色，B 端常见、与成功/危险色对比清晰 */
export const THEME_PRIMARY = '#1677ff'

export const THEME_SUCCESS = '#52c41a'
export const THEME_WARNING = '#faad14'
export const THEME_ERROR = '#f5222d'

export const THEME_BG_LAYOUT = '#f7fafc'
export const THEME_BG_CONTAINER = '#ffffff'
export const THEME_DARK_BG_LAYOUT = '#0b1117'
export const THEME_DARK_BG_CONTAINER = '#151d27'
export const THEME_DARK_BORDER = '#344252'

/**
 * ===== 语义按钮配色（按钮语义色键）=====
 *
 * 设计原则（参考常见优质 B 端：单一品牌主色 + 中性次要，避免「满屏预设蓝/金/橙」）：
 * - **commit**：唯一高饱和主 CTA（实心），与 `colorPrimary` / THEME_PRIMARY 一致。
 * - **brandSoft**：与主色同系的**描边/弱强调**（如导入、导出），不用 旧组件库预设 geekblue，避免和主色打架。
 * - **success / danger**：仅流程通过、删除类，语义清晰。
 * - **neutral**：取消、关闭、搜索、重置等控制型操作，灰描边不抢视觉。
 *
 * `semanticButtonStyles.ts` 只从此对象取键，禁止页面硬编码 `color`。
 */
export const SEMANTIC_BTN_COLORS = {
  /** 确定 / 提交 / 登录 / 新增 / 流程 / 批量提交 等主操作 — 实心主色 */
  commit: 'primary',
  /** 批量批准等流程通过动作 — 成功色 */
  success: 'green',
  /** 删除、危险操作 */
  danger: 'danger',
  /**
   * 导入、导出、上传源文件等「数据进出」— **outlined + primary**，与主色同色相，
   * 区别于实心主按钮的权重，又比灰按钮略有点题。
   */
  brandSoft: 'primary',
  /** 取消、关闭、搜索、重置等 — **outlined + default**，中性 */
  neutral: 'default',
} as const

export type SemanticButtonColor = (typeof SEMANTIC_BTN_COLORS)[keyof typeof SEMANTIC_BTN_COLORS]

// ---------- 色板生成工具 ----------

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
      .join('')
  )
}

function mixColor(hex: string, target: string, weight: number): string {
  const [r1, g1, b1] = hexToRgb(hex)
  const [r2, g2, b2] = hexToRgb(target)
  return rgbToHex(
    r1 + (r2 - r1) * weight,
    g1 + (g2 - g1) * weight,
    b1 + (b2 - b1) * weight,
  )
}

/**
 * 从单个主色生成完整的 50-950 色板
 */
export function generatePalette(primary: string) {
  return {
    50: mixColor(primary, '#ffffff', 0.93),
    100: mixColor(primary, '#ffffff', 0.82),
    200: mixColor(primary, '#ffffff', 0.65),
    300: mixColor(primary, '#ffffff', 0.42),
    400: mixColor(primary, '#ffffff', 0.18),
    500: primary,
    600: mixColor(primary, '#000000', 0.15),
    700: mixColor(primary, '#000000', 0.3),
    800: mixColor(primary, '#000000', 0.45),
    900: mixColor(primary, '#000000', 0.6),
    950: mixColor(primary, '#000000', 0.75),
  }
}

export const primaryPalette = generatePalette(THEME_PRIMARY)

const darkPrimaryPalette = {
  50: '#102033',
  100: '#15345b',
  200: '#1e4f8f',
  300: '#3478c6',
  400: '#60a5fa',
  500: '#4f9cff',
  600: '#2f8cff',
  700: '#1d74db',
  800: '#1759a6',
  900: '#123f76',
  950: '#0d294d',
}

// ---------- 注入 CSS 变量（供 Tailwind 运行时使用） ----------

/**
 * 在 React 渲染前调用，将主题色写入 :root CSS 变量，
 * 覆盖 index.css 中 @theme 的默认值，使 Tailwind 的 bg-primary 等 class 跟随变化。
 */
export function injectThemeVars(mode: 'light' | 'dark' = 'light') {
  const root = document.documentElement.style
  const p = mode === 'dark' ? darkPrimaryPalette : primaryPalette
  const primary = mode === 'dark' ? darkPrimaryPalette[500] : THEME_PRIMARY

  root.setProperty('--color-primary', primary)
  root.setProperty('--color-primary-50', p[50])
  root.setProperty('--color-primary-100', p[100])
  root.setProperty('--color-primary-200', p[200])
  root.setProperty('--color-primary-300', p[300])
  root.setProperty('--color-primary-400', p[400])
  root.setProperty('--color-primary-500', p[500])
  root.setProperty('--color-primary-600', p[600])
  root.setProperty('--color-primary-700', p[700])
  root.setProperty('--color-primary-800', p[800])
  root.setProperty('--color-primary-900', p[900])
  root.setProperty('--color-primary-950', p[950])

  root.setProperty('--color-success', THEME_SUCCESS)
  root.setProperty('--color-warning', THEME_WARNING)
  root.setProperty('--color-error', THEME_ERROR)
  root.setProperty('--color-info', primary)

  root.setProperty('--color-layout', mode === 'dark' ? THEME_DARK_BG_LAYOUT : THEME_BG_LAYOUT)
  root.setProperty('--color-background', mode === 'dark' ? THEME_DARK_BG_CONTAINER : THEME_BG_CONTAINER)
  root.setProperty('--color-container', mode === 'dark' ? THEME_DARK_BG_CONTAINER : THEME_BG_CONTAINER)
  root.setProperty('--color-card', mode === 'dark' ? THEME_DARK_BG_CONTAINER : THEME_BG_CONTAINER)
  root.setProperty('--color-muted', mode === 'dark' ? 'rgba(255, 255, 255, 0.10)' : '#f5f5f5')
  root.setProperty('--color-muted-foreground', mode === 'dark' ? 'rgba(255, 255, 255, 0.72)' : '#6b7280')
  root.setProperty('--color-base-text', mode === 'dark' ? 'rgba(255, 255, 255, 0.94)' : '#1f1f1f')
  root.setProperty('--color-border', mode === 'dark' ? THEME_DARK_BORDER : '#e8e8e8')
  root.setProperty(
    '--shadow-header',
    mode === 'dark' ? '0 1px 2px rgba(0, 0, 0, 0.42)' : '0 1px 2px rgba(0, 21, 41, 0.08)',
  )
  root.setProperty(
    '--shadow-sider',
    mode === 'dark' ? '2px 0 10px 0 rgba(0, 0, 0, 0.34)' : '2px 0 8px 0 rgba(29, 35, 41, 0.05)',
  )
  root.setProperty(
    '--shadow-card',
    mode === 'dark'
      ? '0 1px 2px rgba(0, 0, 0, 0.42), 0 10px 28px -22px rgba(0, 0, 0, 0.75)'
      : '0 1px 2px rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px rgba(0, 0, 0, 0.02)',
  )
}
