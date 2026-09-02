/**
 * 修正 AI 回复中不规范的 Markdown，便于 react-markdown 正确渲染。
 * 逻辑需与 lims-server/internal/service/ai_service.go 的 sanitizeMarkdown 保持一致。
 */
export function sanitizeMarkdown(reply: string): string {
  // ##标题 → ## 标题
  reply = reply.replace(/^(#{1,6})([^\s#])/gm, '$1 $2')

  // >引用 → > 引用
  reply = reply.replace(/^(>([^\s>]))/gm, '> $2')

  // 冒号后直接跟无序列表：包括：-标准 → 包括：\n- 标准
  reply = reply.replace(/([：:])\s*-(\S)/g, '$1\n- $2')

  // 右括号后直接跟无序列表
  reply = reply.replace(/(）|\))\s*-(\S)/g, '$1\n- $2')

  // 中文词后直接跟下一项（至少 2 个汉字，避免「年-月」误拆）
  reply = reply.replace(/([\u4e00-\u9fff])-([\u4e00-\u9fff]{2,})/g, '$1\n- $2')

  // 冒号后直接跟有序列表
  reply = reply.replace(/([：:])(\d{1,2})\.(\S)/g, '$1\n$2. $3')

  // 中文/括号后直接跟有序列表
  reply = reply.replace(/([\u4e00-\u9fff]|）|\))(\d{1,2})\.([\u4e00-\u9fffA-Za-z])/g, '$1\n$2. $3')

  // 行首 -item → - item
  reply = reply.replace(/^-(\S)/gm, '- $1')

  // 行首 1.item → 1. item
  reply = reply.replace(/^(\d{1,2})\.(\S)/gm, '$1. $2')

  return reply
}
