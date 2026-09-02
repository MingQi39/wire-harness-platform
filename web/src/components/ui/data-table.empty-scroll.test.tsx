/** @vitest-environment jsdom */
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "./data-table";

afterEach(() => {
  cleanup();
});

describe("DataTable empty + scroll.x", () => {
  beforeEach(() => {
    class ResizeObserverMock {
      private readonly callback: ResizeObserverCallback;

      constructor(callback: ResizeObserverCallback) {
        this.callback = callback;
      }

      observe(target: Element) {
        Object.defineProperty(target, "clientWidth", {
          configurable: true,
          value: 480,
        });
        this.callback([], this as unknown as ResizeObserver);
      }

      unobserve() {}

      disconnect() {}
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("空数据时仍保留列宽并允许横向滚动，避免表头被裁切", () => {
    const columns = [
      { id: "order_number", header: "委托单号", width: 100, filter: { placeholder: "筛选委托单号" } },
      { id: "cert_number", header: "证书编号", width: 100, filter: { placeholder: "筛选证书编号" } },
      { id: "customer_name", header: "客户", width: 80, filter: { placeholder: "筛选客户" } },
      { id: "customer_address", header: "客户地址", width: 88 },
      { id: "cert_org_name_zh", header: "证书单位", width: 80 },
      { id: "cert_address_zh", header: "证书地址", width: 80 },
      { id: "device_name", header: "设备名称", width: 80, filter: { placeholder: "筛选设备名称" } },
      { id: "device_model", header: "设备型号", width: 80, filter: { placeholder: "筛选设备型号" } },
      { id: "factory_number", header: "出厂编号", width: 80, filter: { placeholder: "筛选出厂编号" } },
      {
        id: "manage_number",
        header: "管理编号",
        width: 80,
        filter: { placeholder: "筛选管理编号" },
      },
      { id: "action", header: "操作", width: 240, fixed: "right" as const },
    ];

    const { container } = render(
      <DataTable
        data={[]}
        columns={columns}
        selectionMode="multiple"
        onSelectedRowKeysChange={() => {}}
        scroll={{ x: "max-content", y: 200 }}
      />,
    );

    const table = container.querySelector("table.ui-data-table-table");
    expect(table).toBeTruthy();
    const minWidth = table?.getAttribute("style") ?? "";
    expect(minWidth).toMatch(/min-width:\s*\d+(\.\d+)?px/i);
    expect(minWidth).not.toMatch(/min-width:\s*100%/i);

    const manageHeader = container.querySelector('[aria-label="管理编号"]');
    expect(manageHeader).toBeTruthy();
    expect(manageHeader?.textContent).toContain("管理编号");

    const viewport = container.querySelector(".ui-data-table-viewport");
    expect(viewport?.className ?? "").not.toContain("overflow-x-hidden");
  });
});
