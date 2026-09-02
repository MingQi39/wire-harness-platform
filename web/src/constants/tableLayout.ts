/**
 * 列表页 ConfigurableDataTable + scroll.y 时，从容器高度中扣除的像素：
 * 工具栏 + 表头 + 底部分页及间距（与 size=small、紧凑分页样式对齐，略小于历史 150）。
 */
/** 略减预留：行数多时在「按内容封顶」前尽量吃满容器 */
export const TABLE_BODY_SCROLL_RESERVE = 88

/** 主列表 Card 内容区：上/左右内边距 */
export const TABLE_CARD_BODY_PADDING = 8

/** 表格卡片底边：与分页紧贴，不再额外垫高 */
export const TABLE_CARD_BODY_PADDING_BOTTOM = 0

/** 与表格配套的 Card body 四边 padding（底边 10px，其余 8px） */
export const TABLE_LIST_CARD_BODY_PADDING = {
  paddingTop: TABLE_CARD_BODY_PADDING,
  paddingLeft: TABLE_CARD_BODY_PADDING,
  paddingRight: TABLE_CARD_BODY_PADDING,
  paddingBottom: TABLE_CARD_BODY_PADDING_BOTTOM,
} as const
