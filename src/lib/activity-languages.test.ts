import { describe, expect, it } from "vitest";
import { isValidActivityLanguages, activityLanguagesForRequest } from "./activity-languages";

describe("activity language contract", () => {
  it.each([[], ["KO", "KO"], ["UNKNOWN"], ["ZH_HANT"], [null]])("rejects %j", (...values) => {
    expect(isValidActivityLanguages(values)).toBe(false);
  });
  it("keeps spoken languages separate from content translation languages", () => {
    expect(isValidActivityLanguages(["KO", "ZH", "YUE"])).toBe(true);
  });
  it("omits untouched legacy empty languages on edit", () => {
    expect(activityLanguagesForRequest(undefined)).toEqual({});
    expect(activityLanguagesForRequest([])).toEqual({});
    expect(activityLanguagesForRequest(["JA"])).toEqual({ availableLanguages: ["JA"] });
  });
});
