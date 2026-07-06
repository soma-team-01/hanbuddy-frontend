import { afterEach, describe, expect, it } from "vitest";
import { GET } from "./route";

const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
const originalGoogleRedirectUri = process.env.GOOGLE_REDIRECT_URI;
const originalPublicGoogleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const originalPublicGoogleRedirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

describe("GET /api/auth/google/start", () => {
  afterEach(() => {
    restoreEnv("GOOGLE_CLIENT_ID", originalGoogleClientId);
    restoreEnv("GOOGLE_REDIRECT_URI", originalGoogleRedirectUri);
    restoreEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", originalPublicGoogleClientId);
    restoreEnv("NEXT_PUBLIC_GOOGLE_REDIRECT_URI", originalPublicGoogleRedirectUri);
  });

  it("requires server-only Google OAuth environment variables", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_REDIRECT_URI;
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID = "public-client-id";
    process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI = "http://localhost:3000/auth/google/callback";

    const response = GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      code: "AUTH_PROXY_ERROR",
      message: "Missing required environment variable: GOOGLE_CLIENT_ID",
    });
  });

  it("builds the Google authorization redirect from server-only environment variables", () => {
    process.env.GOOGLE_CLIENT_ID = "server-client-id";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/auth/google/callback";
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

    const response = GET();
    const location = response.headers.get("location");

    expect(response.status).toBe(307);
    expect(location).toBeTruthy();
    const authorizationUrl = new URL(location ?? "");
    expect(authorizationUrl.origin).toBe("https://accounts.google.com");
    expect(authorizationUrl.searchParams.get("client_id")).toBe("server-client-id");
    expect(authorizationUrl.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/auth/google/callback",
    );
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
