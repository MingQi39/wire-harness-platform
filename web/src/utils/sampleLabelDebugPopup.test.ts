import { beforeEach, describe, expect, it, vi } from "vitest";
import { showUnsafeSampleLabelPrintWarning } from "./sampleLabelPrintActions";

const messageSpies = vi.hoisted(() => ({
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock("@/utils/appMessage", () => ({
  appMessage: () => messageSpies,
}));

describe("标签打印调试日志", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("不再用 info 弹窗展示完整打印调试日志", () => {
    showUnsafeSampleLabelPrintWarning([
      '[标签打印] job-start: 开始打印 | {"count":1}',
      '[jc-print] start-job {"count":1}',
    ]);

    expect(messageSpies.info).not.toHaveBeenCalled();
    expect(messageSpies.error).not.toHaveBeenCalled();
  });

  it("仍保留旧版精臣危险打印管线告警", () => {
    showUnsafeSampleLabelPrintWarning([
      '[标签打印] job-start: 开始打印到 M3-I413060182',
      '[标签打印] tspl-prepare: 准备 TSPL',
    ]);

    expect(messageSpies.info).not.toHaveBeenCalled();
    expect(messageSpies.error).toHaveBeenCalledOnce();
    expect(messageSpies.error).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("不安全的精臣打印管线"),
      }),
    );
  });
});
