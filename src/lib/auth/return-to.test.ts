import { describe, expect, it } from "vitest";
import { sanitizeReturnToPath, stripLocaleFromPathname } from "./return-to";

describe("sanitizeReturnToPath", () => {
  it("accepts internal paths with query strings", () => {
    expect(sanitizeReturnToPath("/activities/42/book?scheduleId=101")).toBe(
      "/activities/42/book?scheduleId=101",
    );
    expect(sanitizeReturnToPath("/applications")).toBe("/applications");
  });

  it("rejects open-redirect and self-referencing targets", () => {
    expect(sanitizeReturnToPath("https://evil.example.com")).toBeNull();
    expect(sanitizeReturnToPath("//evil.example.com")).toBeNull();
    // 쿼리에 절대 URL이 섞인 경로도 보수적으로 거른다
    expect(sanitizeReturnToPath("/redirect?next=https://evil.example.com/")).toBeNull();
    expect(sanitizeReturnToPath("/login")).toBeNull();
    expect(sanitizeReturnToPath("/onboarding")).toBeNull();
    expect(sanitizeReturnToPath("/buddy/onboarding")).toBeNull();
    expect(sanitizeReturnToPath("/login?next=%2Fexplore")).toBeNull();
    expect(sanitizeReturnToPath("/")).toBeNull();
    expect(sanitizeReturnToPath("")).toBeNull();
    expect(sanitizeReturnToPath(null)).toBeNull();
    expect(sanitizeReturnToPath(`/${"a".repeat(600)}`)).toBeNull();
    expect(sanitizeReturnToPath("\\\\evil")).toBeNull();
  });

  it("strips locale segments from browser pathnames", () => {
    expect(stripLocaleFromPathname("/en/activities/42")).toBe("/activities/42");
    expect(stripLocaleFromPathname("/ko")).toBe("/");
    expect(stripLocaleFromPathname("/explore")).toBe("/explore");
    expect(stripLocaleFromPathname("/environment")).toBe("/environment");
  });
});
