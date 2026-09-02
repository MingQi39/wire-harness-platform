import { useMemo } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ApiSelect } from "@/components/ApiSelect";
import { Switch } from "@/components/ui/switch";
import { SemanticButton } from "@/components/SemanticButton";
import type { ColumnPreferences, TableColumnDef } from "./types";
import { countVisible, normalizeOrder } from "./columnUtils";

const FIXED_OPTIONS = [
  { label: "不冻结", value: "none" as const },
  { label: "冻结在左侧", value: "left" as const },
  { label: "冻结在右侧", value: "right" as const },
];
const FIELD_LABEL_CLASS = "shrink-0 whitespace-nowrap text-xs text-gray-600 dark:text-slate-400";

export interface TableColumnSettingsDrawerProps<T = unknown> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  columnDefs: TableColumnDef<T>[];
  prefs: ColumnPreferences;
  onChange: (next: ColumnPreferences) => void;
  onReset: () => void;
}

export function TableColumnSettingsDrawer<T = unknown>({
  open,
  onOpenChange,
  title = "列设置",
  columnDefs,
  prefs,
  onChange,
  onReset,
}: TableColumnSettingsDrawerProps<T>) {
  const orderedKeys = useMemo(
    () => normalizeOrder(prefs.order, columnDefs.map((d) => d.key)),
    [prefs.order, columnDefs],
  );

  const defMap = useMemo(
    () => Object.fromEntries(columnDefs.map((d) => [d.key, d])) as Record<string, TableColumnDef<T>>,
    [columnDefs],
  );

  const visibleCount = countVisible(prefs, columnDefs);

  const moveKey = (key: string, dir: -1 | 1) => {
    const idx = orderedKeys.indexOf(key);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= orderedKeys.length) return;
    const nextOrder = [...orderedKeys];
    [nextOrder[idx], nextOrder[j]] = [nextOrder[j]!, nextOrder[idx]!];
    onChange({ ...prefs, order: nextOrder });
  };

  const patch = (partial: Partial<ColumnPreferences>) => {
    onChange({ ...prefs, ...partial });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-[400px] sm:max-w-[400px] p-0" onClose={() => onOpenChange(false)}>
        <SheetHeader className="mb-0 border-b border-border px-5 pb-4 pr-10">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        <div className="px-5 py-4">
          <div className="mb-4 flex items-start justify-between gap-2">
            <SheetDescription className="max-w-[260px]">
              调整列显示、冻结、过滤、排序与单元格复制；设置会同步到服务端。
            </SheetDescription>
            <SemanticButton size="sm" onClick={onReset}>
              恢复默认
            </SemanticButton>
          </div>

          <div className="flex flex-col gap-3">
            {orderedKeys.map((key) => {
              const def = defMap[key];
              if (!def) return null;
              const hideable = def.hideable !== false;
              const visible = prefs.visibility[key] !== false;
              const fixed = prefs.fixed[key] ?? false;
              const fixedVal = fixed === false ? "none" : fixed;
              const hideSwitchDisabled = !hideable || (visible && visibleCount <= 1);
              const filterable = def.dataIndex != null && def.filterable !== false;
              const sortable = def.dataIndex != null && def.sortable !== false;

              return (
                <Card key={key} size="small" className="p-3 dark:bg-white/[0.03]">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{def.title}</span>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon-xs" className="text-slate-500 hover:text-primary dark:text-slate-400" disabled={orderedKeys.indexOf(key) <= 0} onClick={() => moveKey(key, -1)} aria-label="上移">
                        <ArrowUpIcon />
                      </Button>
                      <Button type="button" variant="ghost" size="icon-xs" className="text-slate-500 hover:text-primary dark:text-slate-400" disabled={orderedKeys.indexOf(key) >= orderedKeys.length - 1} onClick={() => moveKey(key, 1)} aria-label="下移">
                        <ArrowDownIcon />
                      </Button>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={FIELD_LABEL_CLASS}>显示</span>
                      <Switch size="sm" checked={visible} disabled={hideSwitchDisabled} onCheckedChange={(checked) => {
                        if (!hideable) return;
                        if (!checked && visibleCount <= 1) return;
                        patch({ visibility: { ...prefs.visibility, [key]: checked } });
                      }} />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className={FIELD_LABEL_CLASS}>冻结</span>
                      <ApiSelect
                        value={fixedVal}
                        options={FIXED_OPTIONS}
                        className="w-[130px] shrink-0"
                        onChange={(v) => {
                          const nextFixed: false | "left" | "right" = v === "none" ? false : v === "left" ? "left" : "right";
                          patch({ fixed: { ...prefs.fixed, [key]: nextFixed } });
                        }}
                      />
                    </div>

                    {filterable ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className={FIELD_LABEL_CLASS}>过滤</span>
                        <Switch size="sm" checked={!!prefs.filterOn[key]} onCheckedChange={(checked) => patch({ filterOn: { ...prefs.filterOn, [key]: checked } })} />
                      </div>
                    ) : null}

                    {sortable ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className={FIELD_LABEL_CLASS}>排序</span>
                        <Switch size="sm" checked={!!prefs.sortOn[key]} onCheckedChange={(checked) => patch({ sortOn: { ...prefs.sortOn, [key]: checked } })} />
                      </div>
                    ) : null}

                    {def.copyable === false ? null : (
                      <div className="flex items-center justify-between gap-2">
                        <span className={FIELD_LABEL_CLASS}>复制</span>
                        <Switch size="sm" checked={!!prefs.copyOn[key]} onCheckedChange={(checked) => patch({ copyOn: { ...prefs.copyOn, [key]: checked } })} />
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
