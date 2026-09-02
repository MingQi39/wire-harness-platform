import type { ChangeEvent } from "react";

import { SearchIcon } from "@/components/app-icons";
import { SemanticButton } from "@/components/SemanticButton";
import { Input } from "@/components/ui/app-ui";
import { cn } from "@/lib/utils";

type ListSearchBarProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSearch: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  buttonLabel?: string;
  disabled?: boolean;
};

/**
 * 列表页统一搜索条：输入宽度随容器收缩（上限 240px），Enter/按钮触发查询，清空时立即重置筛选。
 */
export function ListSearchBar({
  value,
  onValueChange,
  onSearch,
  placeholder = "搜索关键词",
  className,
  inputClassName,
  buttonLabel = "搜索",
  disabled,
}: ListSearchBarProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    onValueChange(nextValue);
    if (!nextValue.trim()) onSearch("");
  };

  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <Input
        allowClear
        disabled={disabled}
        placeholder={placeholder}
        prefix={<SearchIcon className="text-slate-400" />}
        value={value}
        onChange={handleChange}
        onPressEnter={() => onSearch(value)}
        className={cn("w-full min-w-0 max-w-[240px]", inputClassName)}
      />
      <SemanticButton disabled={disabled} onClick={() => onSearch(value)}>
        {buttonLabel}
      </SemanticButton>
    </div>
  );
}
