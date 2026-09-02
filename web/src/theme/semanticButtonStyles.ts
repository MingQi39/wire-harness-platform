import { isValidElement, type ReactNode } from 'react'

type ShadcnButtonVariant = 'default' | 'success' | 'outline' | 'brandSoft' | 'secondary' | 'ghost' | 'destructive' | 'link'
export type SemanticButtonStyle = {
  variant?: ShadcnButtonVariant
}

/** 归一化：去空白、统一「模版/模板」、去掉末尾括号说明（含动态数量） */
export function normalizeButtonLabel(raw: string): string {
  let s = raw.replace(/\s+/g, '').replace(/模版/g, '模板')
  let prev = ''
  while (prev !== s) {
    prev = s
    s = s.replace(/\{[^}]*\}\s*$/, '').replace(/（[^）]*）\s*$/u, '').replace(/\([^)]*\)\s*$/, '')
  }
  return s.trim()
}

const primary: SemanticButtonStyle = { variant: 'default' }
const outline: SemanticButtonStyle = { variant: 'outline' }
const brandSoft: SemanticButtonStyle = { variant: 'brandSoft' }
const secondary: SemanticButtonStyle = { variant: 'secondary' }
const destructive: SemanticButtonStyle = { variant: 'destructive' }
const link: SemanticButtonStyle = { variant: 'link' }

const EXACT: Record<string, SemanticButtonStyle> = {
  登录: primary,
  保存: primary,
  确定: primary,
  确认: primary,
  确认应用: primary,
  立即重启: primary,
  提交: primary,
  取消: brandSoft,
  关闭: brandSoft,
  稍后: secondary,
  重试: brandSoft,
  删除: destructive,
  批量删除: destructive,
  导入: outline,
  导出: outline,
  筛选: secondary,
  重置: secondary,
  搜索: brandSoft,
  查询: brandSoft,
  全选: secondary,
  全选当前: brandSoft,
  取消全选: secondary,
  清空全部: brandSoft,
  反选: secondary,
  全部展开: brandSoft,
  全部收起: brandSoft,
  退回: secondary,
  转派: secondary,
  流程: primary,
  任务分配: primary,
  复制: brandSoft,
  均相等: brandSoft,
  批量相同: brandSoft,
  取消修改: secondary,
  下载导入模板: outline,
  下载更新: brandSoft,
  返回首页: primary,
  刷新页面: secondary,
  选择: secondary,
  选择文件: brandSoft,
  选择模版: brandSoft,
  选择模板: brandSoft,
  列设置: brandSoft,
  标记已读: link,
  全部已读: link,
  同客户名称: outline,
  同客户地址: outline,
  样品入库: primary,
  样品出库: outline,
  批量提交: primary,
  批量编辑: brandSoft,
  批量审核: brandSoft,
  批量批准: { variant: 'success' },
  批量退回: secondary,
  批量转派: secondary,
  编辑内页: secondary,
  编辑模版: brandSoft,
  编辑模板: brandSoft,
  查看模版: brandSoft,
  查看模板: brandSoft,
  上传模版文件: brandSoft,
  上传模板文件: brandSoft,
  删除模板: destructive,
  删除模版: destructive,
  导出模版: outline,
  导出模板: outline,
  导出选中: outline,
  导出全部: outline,
  添加: primary,
  恢复默认: outline,
  返回: secondary,
  插入附件到正文: outline,
  修改: brandSoft,
}

const PREFIX: Array<{ prefix: string; style: SemanticButtonStyle }> = [
  { prefix: '下载导入', style: outline },
  { prefix: '新建', style: primary },
  { prefix: '新增', style: primary },
  { prefix: '导出', style: outline },
  { prefix: '上传', style: brandSoft },
  { prefix: '下载', style: secondary },
  { prefix: '打印', style: brandSoft },
  { prefix: '查看', style: secondary },
  { prefix: '编辑', style: brandSoft },
  { prefix: '更换', style: brandSoft },
  { prefix: '删除', style: destructive },
  { prefix: '选择', style: secondary },
]

export function lookupSemanticStyle(normalizedLabel: string): SemanticButtonStyle | undefined {
  if (!normalizedLabel) return undefined
  const hit = EXACT[normalizedLabel]
  if (hit) return { ...hit }
  for (const { prefix, style } of PREFIX) {
    if (normalizedLabel.startsWith(prefix)) return { ...style }
  }
  return undefined
}

export function getSemanticButtonProps(text: string): SemanticButtonStyle {
  const n = normalizeButtonLabel(text)
  return (n ? lookupSemanticStyle(n) : undefined) ?? {}
}

export function extractButtonTextLabel(node: ReactNode): string | undefined {
  if (node == null || typeof node === 'boolean') return undefined
  if (typeof node === 'string' || typeof node === 'number') {
    const t = String(node).trim()
    return t || undefined
  }
  if (Array.isArray(node)) {
    const parts = node.map(extractButtonTextLabel).filter(Boolean) as string[]
    const j = parts.join('').trim()
    return j || undefined
  }
  if (isValidElement(node) && node.props && typeof node.props === 'object' && 'children' in node.props) {
    return extractButtonTextLabel((node.props as { children?: ReactNode }).children)
  }
  return undefined
}
