import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleOAuthConfigError, getGoogleRedirectUri } from "./google-config";

describe("Google OAuth server configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    "http://localhost:3000/auth/google/callback",
    "https://staging.hanbuddy.kr/auth/google/callback",
  ])("returns the single configured redirect URI unchanged: %s", (redirectUri) => {
    vi.stubEnv("GOOGLE_REDIRECT_URI", `  ${redirectUri}  `);

    expect(getGoogleRedirectUri()).toBe(redirectUri);
  });

  it("rejects a comma-separated redirect URI list", () => {
    vi.stubEnv(
      "GOOGLE_REDIRECT_URI",
      "http://localhost:3000/auth/google/callback,https://staging.hanbuddy.kr/auth/google/callback",
    );

    expect(() => getGoogleRedirectUri()).toThrow(GoogleOAuthConfigError);
  });

  it.each(["", "staging.hanbuddy.kr/auth/google/callback"])(
    "rejects a missing or non-absolute redirect URI: %s",
    (redirectUri) => {
      vi.stubEnv("GOOGLE_REDIRECT_URI", redirectUri);

      expect(() => getGoogleRedirectUri()).toThrow(GoogleOAuthConfigError);
    },
  );
});
