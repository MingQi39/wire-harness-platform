import type { ReactNode, Ref } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  type ResizablePanelImperativeHandle,
} from "@/components/ui/resizable";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";

type PanelSize = number | string;

type MasterDetailResizableSplitProps = {
  top: ReactNode;
  bottom: ReactNode;
  ariaLabel?: string;
  defaultTopSize?: PanelSize;
  /** 显式指定 bottom 面板的默认高度；提供后将覆盖 `defaultBottomAtMin` / `defaultTopSize`，
   *  top 面板转为自适应填充剩余空间。适合「默认高度大于最小高度，但仍希望用户能继续向下拖小」的场景。 */
  defaultBottomSize?: PanelSize;
  minTopSize?: PanelSize;
  minBottomSize?: PanelSize;
  defaultBottomAtMin?: boolean;
  /** 暴露 bottom 面板的命令式 API（`resize / getSize / collapse` 等）。
   *  配合 `defaultBottomSize` 使用可在挂载后根据内容自然高度动态调整 bottom 面板尺寸。 */
  bottomPanelRef?: Ref<ResizablePanelImperativeHandle | null>;
  className?: string;
  topClassName?: string;
  bottomClassName?: string;
  handleClassName?: string;
};

/** 主从列表页：基于 shadcn Resizable 的上下分栏；数值尺寸按 react-resizable-panels 的像素语义传递。 */
export function MasterDetailResizableSplit({
  top,
  bottom,
  ariaLabel = "拖动调整上方列表与下方详情区域高度",
  defaultTopSize = 360,
  defaultBottomSize,
  minTopSize = 140,
  minBottomSize = 340,
  defaultBottomAtMin = true,
  bottomPanelRef,
  className,
  topClassName,
  bottomClassName,
  handleClassName,
}: MasterDetailResizableSplitProps) {
  const isMobile = useIsMobile();
  // 尺寸语义（react-resizable-panels v4）：number=像素，"50%"=百分比。
  // - 同时给 top/bottom default → 原样使用（如样品页 50%/50% 对半分）
  // - 仅 defaultBottomSize → bottom 用该值，top 自适应剩余
  // - defaultBottomAtMin（且未显式 bottom）→ bottom = minBottom，top 自适应
  // - 否则 → top = defaultTopSize，bottom 自适应
  const useExplicitBottomDefault = defaultBottomSize !== undefined;
  const resolvedTopDefault =
    useExplicitBottomDefault && defaultTopSize === undefined
      ? undefined
      : defaultBottomAtMin && !useExplicitBottomDefault
        ? undefined
        : defaultTopSize;
  const resolvedBottomDefault = useExplicitBottomDefault
    ? defaultBottomSize
    : defaultBottomAtMin
      ? minBottomSize
      : undefined;

  if (isMobile) {
    return (
      <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
        <div className={cn("min-h-0 flex-1 overflow-hidden", bottomClassName)}>{bottom}</div>
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      orientation="vertical"
      className={cn("min-h-0 flex-1", className)}
      resizeTargetMinimumSize={{ fine: 10, coarse: 28 }}
    >
      <ResizablePanel
        id="master-detail-top"
        data-master-detail-panel="top"
        data-default-size={resolvedTopDefault}
        data-min-size={minTopSize}
        defaultSize={resolvedTopDefault}
        minSize={minTopSize}
        className={cn("min-h-0 overflow-hidden", topClassName)}
      >
        {top}
      </ResizablePanel>
      <ResizableHandle
        withHandle
        aria-label={ariaLabel}
        className={cn(
          "h-2 bg-transparent transition-colors hover:bg-primary/5 focus-visible:ring-primary/30",
          handleClassName,
        )}
      />
      <ResizablePanel
        id="master-detail-bottom"
        data-master-detail-panel="bottom"
        data-default-size={resolvedBottomDefault}
        data-min-size={minBottomSize}
        defaultSize={resolvedBottomDefault}
        minSize={minBottomSize}
        panelRef={bottomPanelRef}
        className={cn("min-h-0 overflow-hidden", bottomClassName)}
      >
        {bottom}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
