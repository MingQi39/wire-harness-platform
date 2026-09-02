/**
 * 合并选择器的 onOpenChange：下拉展开时触发重新拉取（如 React Query refetch），并依次调用原有回调。
 * 业务侧优先使用 {@link ApiSelect} 或 FormFields `select.refetchOnOpen`，避免各处手写合并逻辑。
 */
export function chainSelectOpenChange(
  refetch: () => unknown,
  ...rest: Array<((open: boolean) => void) | undefined>
): (open: boolean) => void {
  return (open: boolean) => {
    if (open) void refetch();
    for (const fn of rest) fn?.(open);
  };
}
