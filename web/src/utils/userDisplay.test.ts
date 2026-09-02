import { describe, expect, it } from "vitest";
import {
  buildUserDisplayNameMap,
  resolveActorPrefixedSummary,
  resolveUserDisplayName,
} from "./userDisplay";

describe("resolveActorPrefixedSummary", () => {
  it("用最新姓名替换 summary 开头的用户名快照", () => {
    const map = buildUserDisplayNameMap([{ id: 7, name: "张三", username: "bjy" }]);
    const summary = resolveActorPrefixedSummary(
      'bjy 批量将设备「卡尺」样品状态由「带回」改为「现场」',
      "bjy",
      7,
      map,
    );
    expect(summary).toBe('张三 批量将设备「卡尺」样品状态由「带回」改为「现场」');
  });

  it("兼容历史「姓名 (用户名)」快照", () => {
    const map = buildUserDisplayNameMap([{ id: 7, name: "李四", username: "bjy" }]);
    const summary = resolveActorPrefixedSummary(
      '旧名 (bjy) 将设备「卡尺」样品状态由「带回」改为「现场」',
      "旧名 (bjy)",
      7,
      map,
    );
    expect(summary).toBe('李四 将设备「卡尺」样品状态由「带回」改为「现场」');
  });

  it("无映射时至少剥离括号展示姓名", () => {
    expect(
      resolveActorPrefixedSummary(
        '王五 (bjy) 登记设备「卡尺」为现场检测',
        "王五 (bjy)",
        0,
        new Map(),
      ),
    ).toBe('王五 登记设备「卡尺」为现场检测');
  });
});

describe("resolveUserDisplayName", () => {
  it("按用户 id / 用户名命中最新姓名", () => {
    const map = buildUserDisplayNameMap([{ id: 7, name: "张三", username: "bjy" }]);
    expect(resolveUserDisplayName("bjy", map)).toBe("张三");
    expect(resolveUserDisplayName("7", map)).toBe("张三");
  });
});
