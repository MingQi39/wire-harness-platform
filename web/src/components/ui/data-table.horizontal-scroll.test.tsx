/** @vitest-environment jsdom */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "./data-table";

afterEach(() => {
  cleanup();
});

function stubViewportWidth(width: number) {
  class ResizeObserverMock {
    private readonly callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element) {
      Object.defineProperty(target, "clientWidth", {
        configurable: true,
        value: width,
      });
      this.callback([], this as unknown as ResizeObserver);
    }

    unobserve() {}

    disconnect() {}
  }

  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
}

describe("DataTable scroll.x horizontal scrollbar", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("列宽合计明显超出视口时，保留横向滚动条（不压列）", () => {
    stubViewportWidth(300);
    const { container } = render(
      <DataTable
        data={[{ id: 1, a: "1", b: "2", c: "3", d: "4", e: "5" }]}
        columns={[
          { id: "a", header: "A", width: 120, ellipsis: true },
          { id: "b", header: "B", width: 120, ellipsis: true },
          { id: "c", header: "C", width: 120, ellipsis: true },
          { id: "d", header: "D", width: 120, ellipsis: true },
          { id: "e", header: "E", width: 120, ellipsis: true },
        ]}
        rowKey="id"
        scroll={{ x: "max-content", y: 200 }}
      />,
    );

    const viewport = container.querySelector(".ui-data-table-viewport");
    expect(viewport?.className ?? "").not.toContain("overflow-x-hidden");

    const table = container.querySelector("table.ui-data-table-table");
    const style = table?.getAttribute("style") ?? "";
    // 5 * 120，不因视口变窄而压成 ~299
    expect(style).toMatch(/min-width:\s*600px/i);
  });

  it("列宽合计刚好等于视口时，不因 1px 容差误出横向滚动条", () => {
    // selection(28) + 180 + 160 = 368
    stubViewportWidth(368);
    const { container } = render(
      <DataTable
        data={[{ id: 1, name: "东洋碳素", address: "浙江嘉兴" }]}
        columns={[
          { id: "name", header: "客户名称", width: 180, ellipsis: true },
          { id: "address", header: "客户地址", width: 160, ellipsis: true },
        ]}
        rowKey="id"
        selectionMode="single"
        onSelectedRowKeysChange={() => {}}
        scroll={{ x: "max-content", y: 200 }}
      />,
    );

    const viewport = container.querySelector(".ui-data-table-viewport");
    expect(viewport?.className ?? "").toContain("overflow-x-hidden");
  });

  it("列宽合计小于视口时，隐藏横向滚动条", () => {
    stubViewportWidth(800);
    const { container } = render(
      <DataTable
        data={[{ id: 1, name: "东洋碳素", address: "浙江嘉兴" }]}
        columns={[
          { id: "name", header: "客户名称", width: 180, ellipsis: true },
          { id: "address", header: "客户地址", width: 160, ellipsis: true },
        ]}
        rowKey="id"
        selectionMode="single"
        onSelectedRowKeysChange={() => {}}
        scroll={{ x: "max-content", y: 200 }}
      />,
    );

    const viewport = container.querySelector(".ui-data-table-viewport");
    expect(viewport?.className ?? "").toContain("overflow-x-hidden");
  });

  it("空表单选时，横向滚动容器应撑满 scroll.y 高度（避免滚动条贴在表头下）", () => {
    stubViewportWidth(300);
    const { container } = render(
      <DataTable
        data={[]}
        columns={[
          { id: "a", header: "A", width: 120, ellipsis: true },
          { id: "b", header: "B", width: 120, ellipsis: true },
          { id: "c", header: "C", width: 120, ellipsis: true },
          { id: "d", header: "D", width: 120, ellipsis: true },
          { id: "e", header: "E", width: 120, ellipsis: true },
        ]}
        rowKey="id"
        selectionMode="single"
        onSelectedRowKeysChange={() => {}}
        scroll={{ x: "max-content", y: 200 }}
      />,
    );

    const scrollHost = container.querySelector(
      ".ui-data-table-viewport table",
    )?.parentElement;
    expect(scrollHost?.className ?? "").toContain("h-full");

    const radioGroup = container.querySelector('[role="radiogroup"]');
    expect(radioGroup?.className ?? "").toContain("h-full");
  });
});
