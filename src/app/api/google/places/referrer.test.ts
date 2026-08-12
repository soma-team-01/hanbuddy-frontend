import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getGooglePlacesReferrer } from "./referrer";

describe("getGooglePlacesReferrer", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the configured public origin behind the EC2 reverse proxy", () => {
    vi.stubEnv("GOOGLE_REDIRECT_URI", "https://staging.hanbuddy.kr/auth/google/callback");
    const request = new NextRequest("http://0.0.0.0:3000/api/google/places/autocomplete");

    expect(getGooglePlacesReferrer(request)).toBe("https://staging.hanbuddy.kr/");
  });

  it("keeps the local development referrer without deployment configuration", () => {
    vi.stubEnv("GOOGLE_REDIRECT_URI", "");
    const request = new NextRequest("http://127.0.0.1:3100/api/google/places/autocomplete");

    expect(getGooglePlacesReferrer(request)).toBe("http://localhost:3000/");
  });

  it("falls back to the request origin when the configuration is invalid", () => {
    vi.stubEnv("GOOGLE_REDIRECT_URI", "not-a-url");
    const request = new NextRequest("https://preview.hanbuddy.kr/api/google/places/autocomplete");

    expect(getGooglePlacesReferrer(request)).toBe("https://preview.hanbuddy.kr/");
  });

  it.each(["file:///tmp/callback", "mailto:callback@example.com"])(
    "falls back to the request origin for the non-HTTP URL %s",
    (configuredRedirectUri) => {
      vi.stubEnv("GOOGLE_REDIRECT_URI", configuredRedirectUri);
      const request = new NextRequest("https://preview.hanbuddy.kr/api/google/places/autocomplete");

      expect(getGooglePlacesReferrer(request)).toBe("https://preview.hanbuddy.kr/");
    },
  );
});
