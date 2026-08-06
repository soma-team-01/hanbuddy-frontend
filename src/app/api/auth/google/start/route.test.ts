import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCALE_COOKIE_NAME } from "@/i18n/routing";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
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

    const response = GET(createRequest("ko"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/ko/login?error=configuration");
  });

  it("preserves the query locale on configuration errors without a locale cookie", () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_REDIRECT_URI;

    const response = GET(new NextRequest("http://localhost/api/auth/google/start?locale=ko"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/ko/login?error=configuration");
  });

  it("builds the Google authorization redirect from server-only environment variables", () => {
    process.env.GOOGLE_CLIENT_ID = "server-client-id";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/auth/google/callback";
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;

    const response = GET(createRequest());
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

  it("stores the requested locale for the OAuth callback", () => {
    process.env.GOOGLE_CLIENT_ID = "server-client-id";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/auth/google/callback";

    const response = GET(new NextRequest("http://localhost/api/auth/google/start?locale=ko"));
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(setCookie).toContain(`${AUTH_COOKIES.oauthLocale}=ko`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=lax");
    expect(setCookie).toContain("Max-Age=600");
    expect(setCookie).toContain("Path=/");
  });

  it("stores an admin OAuth intent and returns admin errors to the admin login", () => {
    process.env.GOOGLE_CLIENT_ID = "server-client-id";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/auth/google/callback";

    const response = GET(new NextRequest("http://localhost/api/auth/google/start?intent=admin"));

    expect(response.headers.get("set-cookie") ?? "").toContain(`${AUTH_COOKIES.oauthIntent}=admin`);

    delete process.env.GOOGLE_CLIENT_ID;
    const errorResponse = GET(
      new NextRequest("http://localhost/api/auth/google/start?intent=admin"),
    );
    expect(errorResponse.headers.get("location")).toBe(
      "http://localhost/admin/login?error=configuration",
    );
  });

  it("does not expose unexpected internal error messages", async () => {
    vi.resetModules();
    vi.doMock("@/lib/auth/google", () => ({
      createOAuthState: () => {
        throw new Error("crypto internals exploded");
      },
      buildGoogleAuthorizationUrl: vi.fn(),
    }));
    process.env.GOOGLE_CLIENT_ID = "server-client-id";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/auth/google/callback";

    const { GET: getWithFailingState } = await import("./route");
    const response = getWithFailingState(createRequest("ko"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/ko/login?error=unknown");

    vi.doUnmock("@/lib/auth/google");
  });
});

function createRequest(locale?: string) {
  return new NextRequest("http://localhost/api/auth/google/start", {
    headers: locale ? { cookie: `${LOCALE_COOKIE_NAME}=${locale}` } : undefined,
  });
}

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
