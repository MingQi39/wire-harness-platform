import { describe, expect, it } from "vitest";
import type { SampleWorkspaceCommissionOrder, SampleWorkspaceEquipmentLine } from "@/api/types";
import {
  filterDeliPrinters,
  filterPrintersByPatterns,
  isDeliLikePrinter,
  isNiimbotM3LikePrinter,
  pickPrinterByPatterns,
} from "@/constants/sampleLabelConfig";
import { buildSampleLabelPayloads } from "./sampleLabelPrint";

const order: SampleWorkspaceCommissionOrder = {
  id: 1,
  order_number: "CO-1-HKT2424K3U",
  customer_id: 10,
  customer_name: "测试委托单位",
  customer_address: "测试地址",
  biz_created_at: "2026-01-01T00:00:00Z",
  business_staff_name: "业务员",
  workflow_status_label: "审核完成",
  equipment_count: 2,
  updated_at: "2026-01-01T00:00:00Z",
};

function makeRow(partial: Partial<SampleWorkspaceEquipmentLine>): SampleWorkspaceEquipmentLine {
  return {
    line_index: 0,
    device_name: "",
    device_model: "",
    factory_number: "",
    manage_number: "",
    manufacturer: "",
    sample_status: "bring_back",
    assignment_status: "pending",
    ...partial,
  };
}

describe("buildSampleLabelPayloads", () => {
  it("按勾选行生成标签字段，委托单位与委托单号来自当前委托单", () => {
    const rows = [
      makeRow({
        line_index: 0,
        device_name: "1",
        factory_number: "1",
        manage_number: "1",
        attachment: "说明书",
      }),
      makeRow({
        line_index: 1,
        device_name: "2",
        factory_number: "2",
        manage_number: "2",
      }),
    ];

    expect(buildSampleLabelPayloads(rows, order)).toEqual([
      {
        commissioningUnit: "测试委托单位",
        deviceName: "1",
        factoryNumber: "1",
        manageNumber: "1",
        orderNumber: "CO-1-HKT2424K3U",
        attachment: "说明书",
      },
      {
        commissioningUnit: "测试委托单位",
        deviceName: "2",
        factoryNumber: "2",
        manageNumber: "2",
        orderNumber: "CO-1-HKT2424K3U",
        attachment: "",
      },
    ]);
  });
});

describe("pickPrinterByPatterns", () => {
  const printers = [
    { name: "Microsoft Print to PDF", displayName: "Microsoft Print to PDF" },
    { name: "DL-720W", displayName: "Deli DL-720W Label Printer" },
    { name: "TSC-Floor2", displayName: "TSC Floor2 Label Printer" },
  ];

  it("按企业配置 pattern 匹配标签机", () => {
    expect(pickPrinterByPatterns(printers, ["dl-720", "720w"])).toBe("DL-720W");
    expect(pickPrinterByPatterns(printers, ["floor2"])).toBe("TSC-Floor2");
  });

  it("无匹配时不回退到第一台普通打印机", () => {
    expect(pickPrinterByPatterns(printers, ["hp-laser"])).toBeUndefined();
  });

  it("可按 profile 过滤候选打印机列表", () => {
    expect(filterPrintersByPatterns(printers, ["floor2"]).map((item) => item.name)).toEqual([
      "TSC-Floor2",
    ]);
  });

  it("样品页不把精臣 M3 当作得力机", () => {
    const niimbotM3 = [
      { name: "M3-I413060182", displayName: "M3-I413060182" },
      { name: "Microsoft Print to PDF", displayName: "Microsoft Print to PDF" },
    ];
    expect(isNiimbotM3LikePrinter(niimbotM3[0]!)).toBe(true);
    expect(isDeliLikePrinter(niimbotM3[0]!)).toBe(false);
    expect(pickPrinterByPatterns(niimbotM3, ["dl-720"])).toBeUndefined();
    expect(filterPrintersByPatterns(niimbotM3, ["label"]).map((item) => item.name)).toEqual([]);
    expect(filterDeliPrinters(niimbotM3)).toEqual([]);
  });

  it("样品下拉只保留得力，排除精臣与普通 label 机", () => {
    const mixed = [
      { name: "Office Label Printer", displayName: "Office Label Printer" },
      { name: "M3-1413060182", displayName: "M3-1413060182" },
      { name: "DL-720W", displayName: "Deli DL-720W Label Printer" },
    ];
    expect(pickPrinterByPatterns(mixed, ["label"])).toBe("DL-720W");
    expect(filterDeliPrinters(mixed).map((item) => item.name)).toEqual(["DL-720W"]);
  });
});
