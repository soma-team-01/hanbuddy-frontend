import { describe, expect, it } from "vitest";
import { getPresetLabelVariants, getPresetLineSet } from "./preset-labels";

describe("preset labels", () => {
  it("returns every locale variant for a preset option", () => {
    expect(getPresetLabelVariants("inclusions", "equipment")).toEqual([
      "Equipment rental",
      "장비 대여",
    ]);
  });

  it("builds a line set that recognizes preset labels from any locale", () => {
    const lineSet = getPresetLineSet("inclusions", ["equipment", "meal"]);

    // 영어로 선택한 뒤 한국어로 전환해도 사용자 정의 항목으로 오인하지 않는다
    expect(lineSet.has("Equipment rental")).toBe(true);
    expect(lineSet.has("장비 대여")).toBe(true);
    expect(lineSet.has("Custom item")).toBe(false);
  });

  it("returns an empty list for an unknown option key", () => {
    expect(getPresetLabelVariants("restrictions", "unknown")).toEqual([]);
  });
});
