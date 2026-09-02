import type { ReactNode } from "react";
import { CopyIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { OverflowTooltip } from "@/components/ui/overflow-tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { appMessage } from "@/utils/appMessage";

export interface TableCellWithCopyProps {
  copyText: string;
  children: ReactNode;
}

export function TableCellWithCopy({ copyText, children }: TableCellWithCopyProps) {
  const textChild = typeof children === "string" || typeof children === "number" ? String(children) : null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const t = copyText.trim();
    if (!t) {
      appMessage().warning("暂无可复制内容");
      return;
    }
    try {
      await navigator.clipboard.writeText(t);
      appMessage().success("已复制");
    } catch {
      appMessage().error("复制失败，请检查浏览器权限或 HTTPS 环境");
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-0.5">
      <div className="min-w-0 flex-1">
        {textChild != null ? (
          <OverflowTooltip content={textChild} className="block truncate whitespace-nowrap">
            {textChild}
          </OverflowTooltip>
        ) : (
          children
        )}
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-muted-foreground opacity-100 transition-opacity duration-150 hover:text-primary md:opacity-0 md:group-hover/ctcell:opacity-100 md:group-focus-within/ctcell:opacity-100"
            onClick={handleCopy}
            aria-label="复制单元格内容"
          >
            <CopyIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>复制到剪贴板</TooltipContent>
      </Tooltip>
    </div>
  );
}
