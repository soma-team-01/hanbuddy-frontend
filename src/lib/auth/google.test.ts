import { describe, expect, it } from "vitest";
import { buildGoogleAuthorizationUrl } from "./google";

describe("buildGoogleAuthorizationUrl", () => {
  it("builds a Google OAuth authorization URL for the backend code exchange", () => {
    const url = new URL(
      buildGoogleAuthorizationUrl({
        clientId: "google-client-id",
        redirectUri: "http://localhost:3000/auth/google/callback",
        state: "csrf-state",
      }),
    );

    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("google-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe("http://localhost:3000/auth/google/callback");
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("state")).toBe("csrf-state");
    expect(url.searchParams.get("prompt")).toBe("select_account");
  });
});
