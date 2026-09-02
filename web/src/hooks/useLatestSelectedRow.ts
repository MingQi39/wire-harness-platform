import { useMemo, useRef } from "react";

/**
 * 在「多选 + 单条详情」的列表-详情布局中，按用户的勾选时序决定下方详情区域显示哪一条：
 * - 用户最新勾选的项进入详情；
 * - 取消勾选当前展示项时，自动退回到「次之最新勾选」的项；
 * - 全选 / 反选 / 程序化设置 selectedKeys 时，按 selectedKeys 中出现顺序补齐 selection order；
 * - selectedKeys 为空时返回 null。
 *
 * 实现要点：
 * - 维护一个按勾选时序排序的内部栈 `selectionOrder`：每次 selectedKeys 变化时，
 *   保留仍处于选中状态的旧顺序，并按 selectedKeys 中的出现顺序追加新增项到末尾；
 * - 直接用 `useMemo` + ref 在 render 中**同步**派生 selectionOrder，避免使用
 *   `useLayoutEffect + useState` 模式带来的「第一次渲染 selectionOrder 滞后一帧、
 *   selectedRecord 短暂指向已取消的行」的问题——这种中间状态会被下游 useEffect
 *   读取到（reset/水合 effect），在用户反复勾选/取消时与 basicModRecords 的异步
 *   加载交错，导致 form 用 stale 数据水合后再被 reset effect 清空 ref，水合不再
 *   触发，最终下方表单"卡住"在错误状态。
 * - `getKey` 通过 ref 锁定，避免父组件传 inline 函数引发 rowMap 频繁重算。
 *
 * 不持久化跨会话，仅在组件存活期间生效。
 */
export function useLatestSelectedRow<T, K = string>(
  selectedKeys: K[],
  rows: T[],
  getKey: (row: T) => K,
): T | null {
  // 用 ref 保存上一次的 selectionOrder，供下一次 useMemo 派生时作为 prev 使用。
  // 不存 state：state 必须通过 useLayoutEffect/useEffect 异步更新，先渲染再 setState，
  // 第一次渲染拿到的是上一次的 prev → selectedRecord 滞后一帧，与本 hook 注释要求的
  // 「同步切换详情」语义相悖。
  const selectionOrderRef = useRef<K[]>([]);
  const getKeyRef = useRef(getKey);
  getKeyRef.current = getKey;

  // 在 render 期间同步派生 selectionOrder：
  //  - prev 取自 ref（上一次 render 的最终结果）；
  //  - 用当前 selectedKeys 过滤掉已被取消的项，并把新增项按 selectedKeys 中的顺序追加到末尾；
  //  - 内容未变时复用旧引用，下游依赖 selectionOrder 的 useMemo / useEffect 才能正确判定未变。
  const selectionOrder = useMemo(() => {
    const prev = selectionOrderRef.current;
    const nextSet = new Set(selectedKeys);
    const surviving = prev.filter((k) => nextSet.has(k));
    const survivingSet = new Set(surviving);
    const added = selectedKeys.filter((k) => !survivingSet.has(k));
    const merged = [...surviving, ...added];
    if (merged.length === prev.length && merged.every((k, i) => k === prev[i])) {
      return prev;
    }
    return merged;
  }, [selectedKeys]);

  // 在 render body 中把派生结果同步回 ref，供下一次 useMemo 用作 prev。
  // React 允许在 render 中修改 ref（区别于 setState：不会触发额外 re-render，也不破坏 purity 保证）。
  // StrictMode 双调用 render 时本赋值幂等（两次得到相同的 selectionOrder 引用），不会引起累积偏移。
  selectionOrderRef.current = selectionOrder;

  const rowMap = useMemo(() => {
    const m = new Map<K, T>();
    for (const r of rows) m.set(getKeyRef.current(r), r);
    return m;
  }, [rows]);

  return useMemo(() => {
    if (selectionOrder.length === 0) return null;
    for (let i = selectionOrder.length - 1; i >= 0; i--) {
      const key = selectionOrder[i];
      if (key === undefined) continue;
      const found = rowMap.get(key);
      if (found != null) return found;
    }
    return null;
  }, [selectionOrder, rowMap]);
}
