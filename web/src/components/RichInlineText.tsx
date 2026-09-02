import { Fragment, type ReactNode, useMemo } from "react";

/**
 * 受限内联富文本渲染：把字段中可能包含的 `<i>` `<b>` `<sub>` `<sup>` 标签转换为对应 React 节点，
 * 其它内容均按纯文本输出；遇到未识别标签或非法 HTML 时整体退化为纯文本，避免 XSS。
 *
 * 设计目标：与 `readSpreadsheetFileAsMatrix({ preserveRichText: true })` 序列化产物保持完全对称。
 * 该函数不会调用 `dangerouslySetInnerHTML`：所有节点都是由白名单标签构造的真实 React 元素。
 *
 * 模块边界：本文件刻意不依赖 `OverflowTooltip` 等 UI 组件，使得 `OverflowTooltip` 可以反向引用
 * `maybeRenderRichInline` 以为「tooltip 富文本兼容」做统一兜底。`RichInlineTextCell`（带 hover
 * 浮层的列表单元格）抽到 `RichInlineTextCell.tsx`，避免环引入。
 */

/** 仅识别这四种标签；属性一律忽略，未识别标签会让本片段整体回退为纯文本 */
type AllowedTag = "i" | "b" | "sub" | "sup";
const ALLOWED_TAGS = new Set<AllowedTag>(["i", "b", "sub", "sup"]);

/** 把 `&amp;` `&lt;` `&gt;` `&quot;` `&#10;` 等转回原字符（与导入侧 escapeHtmlAttrText 反向匹配） */
function decodeHtmlEntities(s: string): string {
  return s.replace(/&(#x?[0-9A-Fa-f]+|amp|lt|gt|quot|apos|nbsp);/g, (m, code: string) => {
    if (code === "amp") return "&";
    if (code === "lt") return "<";
    if (code === "gt") return ">";
    if (code === "quot") return '"';
    if (code === "apos") return "'";
    if (code === "nbsp") return "\u00a0";
    if (code.startsWith("#x") || code.startsWith("#X")) {
      const n = parseInt(code.slice(2), 16);
      if (Number.isFinite(n)) return String.fromCodePoint(n);
    } else if (code.startsWith("#")) {
      const n = parseInt(code.slice(1), 10);
      if (Number.isFinite(n)) return String.fromCodePoint(n);
    }
    return m;
  });
}

type Node = { kind: "text"; text: string } | { kind: "tag"; tag: AllowedTag; children: Node[] };

/**
 * 极简流式解析：每次寻找下一个 `<` 处理标签；遇到不是白名单标签的 `<` 就抛错让外层走纯文本兜底。
 * 标签语法严格：`<tag>` / `</tag>`（小写，无属性），与导入侧序列化输出一一对应。
 */
function parseRichInline(html: string): Node[] | null {
  const stack: { tag: AllowedTag | null; children: Node[] }[] = [{ tag: null, children: [] }];
  let i = 0;
  const len = html.length;
  while (i < len) {
    const lt = html.indexOf("<", i);
    if (lt < 0) {
      stack[stack.length - 1]!.children.push({
        kind: "text",
        text: decodeHtmlEntities(html.slice(i)),
      });
      i = len;
      break;
    }
    if (lt > i) {
      stack[stack.length - 1]!.children.push({
        kind: "text",
        text: decodeHtmlEntities(html.slice(i, lt)),
      });
    }
    const gt = html.indexOf(">", lt + 1);
    if (gt < 0) return null;
    const raw = html.slice(lt + 1, gt);
    const isClose = raw.startsWith("/");
    const tagName = (isClose ? raw.slice(1) : raw).trim().toLowerCase();
    if (!ALLOWED_TAGS.has(tagName as AllowedTag)) return null;
    if (isClose) {
      const top = stack[stack.length - 1];
      if (!top || top.tag !== tagName) return null;
      stack.pop();
    } else {
      const next = { tag: tagName as AllowedTag, children: [] as Node[] };
      stack[stack.length - 1]!.children.push({ kind: "tag", tag: next.tag, children: next.children });
      stack.push(next);
    }
    i = gt + 1;
  }
  if (stack.length !== 1) return null;
  return stack[0]!.children;
}

function renderNodes(nodes: Node[]): ReactNode {
  return nodes.map((n, idx) => {
    if (n.kind === "text") {
      return <Fragment key={idx}>{n.text}</Fragment>;
    }
    const inner = renderNodes(n.children);
    if (n.tag === "i") return <i key={idx}>{inner}</i>;
    if (n.tag === "b") return <b key={idx}>{inner}</b>;
    if (n.tag === "sub") return <sub key={idx}>{inner}</sub>;
    if (n.tag === "sup") return <sup key={idx}>{inner}</sup>;
    return <Fragment key={idx}>{inner}</Fragment>;
  });
}

export interface RichInlineTextProps {
  /** 原始字段值；可能是纯文本（旧数据）或受限 HTML（导入富文本字段） */
  value: string | null | undefined;
  /** 仅在含富文本标签时渲染为 span；否则原样输出，避免污染父容器布局（如 ellipsis/title） */
  wrap?: boolean;
  className?: string;
  title?: string;
}

/**
 * 安全的内联富文本展示：当字段确实包含白名单标签时按结构渲染；纯文本或解析失败时直接输出字符串。
 * 列表 cell 通常希望 ellipsis 与 title 由父容器接管，因此默认不包一层 span。
 */
export function RichInlineText({ value, wrap, className, title }: RichInlineTextProps) {
  const raw = typeof value === "string" ? value : value == null ? "" : String(value);
  const parsed = useMemo(() => {
    if (!raw) return null;
    // 早退：字段中不含 `<` 直接当纯文本
    if (raw.indexOf("<") < 0) return null;
    return parseRichInline(raw);
  }, [raw]);

  if (!raw) return null;
  if (!parsed) {
    // 解析失败或纯文本：原样输出，调用方负责省略号/title
    if (wrap) {
      return (
        <span className={className} title={title}>
          {raw}
        </span>
      );
    }
    return <>{raw}</>;
  }
  const inner = renderNodes(parsed);
  if (wrap) {
    return (
      <span className={className} title={title}>
        {inner}
      </span>
    );
  }
  return <>{inner}</>;
}

/** 取「显示用纯文本」：可用于 title、搜索匹配；与列表表格的 ellipsis tooltip 配合。 */
export function richInlineTextToPlain(value: string | null | undefined): string {
  const raw = typeof value === "string" ? value : value == null ? "" : String(value);
  if (!raw || raw.indexOf("<") < 0) return raw;
  return decodeHtmlEntities(raw.replace(/<\/?(?:i|b|sub|sup)\s*>/gi, ""));
}

/**
 * 通用兜底：把「可能含白名单富文本标签的字符串」自动升级为 `<RichInlineText>`，其它节点原样返回。
 *
 * 用于 `OverflowTooltip` / 表格 cell 渲染器把 content / children 自动渲染为富文本，
 * 避免 hover 浮层或单元格里出现 `<i>U</i>` 字面值；同时保留对 ReactNode 结构的零侵入。
 *
 * - 非字符串：原样返回，避免把组件结构吞掉；
 * - 字符串不含 `<`：原样返回，零成本；
 * - 字符串含 `<` 但解析失败：`RichInlineText` 内部回退为纯文本，无 XSS / 数据失真风险。
 */
export function maybeRenderRichInline(node: ReactNode): ReactNode {
  if (typeof node !== "string") return node;
  if (!node || node.indexOf("<") < 0) return node;
  return <RichInlineText value={node} />;
}
