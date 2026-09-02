/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DataTable } from "./data-table";

afterEach(() => {
  cleanup();
});

describe("DataTable single selection", () => {
  it("clicking row selects and calls onSelectedRowKeysChange", () => {
    const onChange = vi.fn();
    const { container } = render(
      <DataTable
        data={[
          { id: 1, name: "A" },
          { id: 2, name: "B" },
        ]}
        columns={[{ id: "name", header: "Name", cell: (r) => r.name }]}
        rowKey="id"
        selectionMode="single"
        onSelectedRowKeysChange={onChange}
      />,
    );

    const rows = container.querySelectorAll("tbody tr");
    fireEvent.click(rows[1]!);
    expect(onChange).toHaveBeenCalledWith([2], [{ id: 2, name: "B" }]);
  });

  it("clicking radio selects via RadioGroup", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <DataTable
        data={[
          { id: 1, name: "A" },
          { id: 2, name: "B" },
        ]}
        columns={[{ id: "name", header: "Name", cell: (r) => r.name }]}
        rowKey="id"
        selectionMode="single"
        selectedRowKeys={[]}
        onSelectedRowKeysChange={onChange}
      />,
    );

    const radios = container.querySelectorAll('[role="radio"]');
    fireEvent.click(radios[1]!);
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith([2], [{ id: 2, name: "B" }]);
    });
  });

  it("controlled selectedRowKeys shows checked radio", () => {
    const { container } = render(
      <DataTable
        data={[{ id: 2, name: "B" }]}
        columns={[{ id: "name", header: "Name", cell: (r) => r.name }]}
        rowKey="id"
        selectionMode="single"
        selectedRowKeys={["2"]}
        onSelectedRowKeysChange={() => {}}
      />,
    );

    const radio = container.querySelector('[role="radio"]');
    expect(radio?.getAttribute("data-state")).toBe("checked");
  });

  it("clicking already-selected row in single mode does not call onChange again", () => {
    const onChange = vi.fn();
    const { container } = render(
      <DataTable
        data={[{ id: 2, name: "B" }]}
        columns={[{ id: "name", header: "Name", cell: (r) => r.name }]}
        rowKey="id"
        selectionMode="single"
        selectedRowKeys={["2"]}
        onSelectedRowKeysChange={onChange}
      />,
    );

    const rows = container.querySelectorAll("tbody tr");
    fireEvent.click(rows[0]!);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clicking different row when one is selected changes selection", () => {
    const onChange = vi.fn();
    const { container } = render(
      <DataTable
        data={[
          { id: 1, name: "A" },
          { id: 2, name: "B" },
        ]}
        columns={[{ id: "name", header: "Name", cell: (r) => r.name }]}
        rowKey="id"
        selectionMode="single"
        selectedRowKeys={["1"]}
        onSelectedRowKeysChange={onChange}
      />,
    );

    const rows = container.querySelectorAll("tbody tr");
    fireEvent.click(rows[1]!);
    expect(onChange).toHaveBeenCalledWith([2], [{ id: 2, name: "B" }]);
  });
});
