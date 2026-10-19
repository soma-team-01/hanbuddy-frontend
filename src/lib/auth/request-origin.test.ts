import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { isTrustedAuthOrigin } from "./request-origin";

afterEach(() => vi.unstubAllEnvs());

function request(origin?: string) {
  return new NextRequest("http://0.0.0.0:3000/api/auth/email/code", {
    headers: origin === undefined ? {} : { origin },
  });
}

describe("email authentication origin", () => {
  it.each(["https://staging.hanbuddy.kr", "https://hanbuddy.kr"])(
    "trusts only the configured public origin behind a proxy: %s",
    (origin) => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("AUTH_ORIGIN", origin);
      expect(isTrustedAuthOrigin(request(origin))).toBe(true);
      expect(isTrustedAuthOrigin(request("http://0.0.0.0:3000"))).toBe(false);
      expect(isTrustedAuthOrigin(request("https://evil.example"))).toBe(false);
      const otherEnvironment = origin.includes("staging")
        ? "https://hanbuddy.kr"
        : "https://staging.hanbuddy.kr";
      expect(isTrustedAuthOrigin(request(otherEnvironment))).toBe(false);
    },
  );

  it("does not trust spoofed host or forwarded headers", () => {
    vi.stubEnv("AUTH_ORIGIN", "https://hanbuddy.kr");
    const req = request("https://evil.example");
    req.headers.set("host", "evil.example");
    req.headers.set("x-forwarded-host", "evil.example");
    req.headers.set("x-forwarded-proto", "https");
    req.headers.set("forwarded", "host=evil.example;proto=https");
    expect(isTrustedAuthOrigin(req)).toBe(false);
  });

  it.each([
    undefined,
    "",
    "null",
    "not-a-url",
    "http://hanbuddy.kr",
    "https://hanbuddy.kr/",
    "https://hanbuddy.kr/path",
    "https://hanbuddy.kr?query=1",
    "https://hanbuddy.kr#fragment",
    "https://user:secret@hanbuddy.kr",
  ])("fails closed for invalid production configuration: %s", (origin) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_ORIGIN", origin);
    expect(isTrustedAuthOrigin(request("https://hanbuddy.kr"))).toBe(false);
  });

  it.each([
    "null",
    "https://hanbuddy.kr.evil.example",
    "https://hanbuddy.kr, https://evil.example",
  ])("rejects opaque or malformed browser origins: %s", (origin) => {
    vi.stubEnv("AUTH_ORIGIN", "https://hanbuddy.kr");
    expect(isTrustedAuthOrigin(request(origin))).toBe(false);
  });

  it("preserves non-browser requests but rejects explicit cross-site requests without Origin", () => {
    vi.stubEnv("AUTH_ORIGIN", "https://hanbuddy.kr");
    const req = request();
    expect(isTrustedAuthOrigin(req)).toBe(true);
    req.headers.set("sec-fetch-site", "cross-site");
    expect(isTrustedAuthOrigin(req)).toBe(false);
  });

  it("supports local development without production configuration", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_ORIGIN", undefined);
    const req = new NextRequest("http://localhost:3000/api/auth/email/code", {
      headers: { origin: "http://localhost:3000" },
    });
    expect(isTrustedAuthOrigin(req)).toBe(true);
    req.headers.set("origin", "https://evil.example");
    expect(isTrustedAuthOrigin(req)).toBe(false);
  });
});
