import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { config, proxy } from "./proxy";

async function runProxy(pathname: string, cookies: Record<string, string> = {}) {
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  return proxy(
    new NextRequest(`http://localhost${pathname}`, {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    }),
  );
}

describe("route access proxy", () => {
  it.each(["/dashboard", "/my-activities/create", "/explore", "/my-page/edit"])(
    "redirects unauthenticated access to %s before rendering",
    async (pathname) => {
      const response = await runProxy(pathname);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost/login");
    },
  );

  it("requires a signup session for onboarding", async () => {
    const response = await runProxy("/onboarding");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it.each([
    ["TOURIST", "/dashboard", "/explore"],
    ["BUDDY", "/activities/1", "/dashboard"],
  ] as const)("redirects %s away from %s", async (userType, pathname, homePath) => {
    const response = await runProxy(pathname, {
      [AUTH_COOKIES.accessToken]: "access-token",
      [AUTH_COOKIES.userType]: userType,
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`http://localhost${homePath}`);
  });

  it("allows a tourist to enter tourist and shared routes", async () => {
    const cookies = {
      [AUTH_COOKIES.accessToken]: "access-token",
      [AUTH_COOKIES.userType]: "TOURIST",
    };

    const exploreResponse = await runProxy("/explore", cookies);
    const myPageResponse = await runProxy("/my-page", cookies);

    expect(exploreResponse.status).toBe(200);
    expect(myPageResponse.status).toBe(200);
    expect(exploreResponse.headers.get("location")).toBeNull();
    expect(myPageResponse.headers.get("location")).toBeNull();
  });

  it("allows onboarding with a signup token", async () => {
    const response = await runProxy("/onboarding", {
      [AUTH_COOKIES.signupToken]: "signup-token",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects authenticated users away from login", async () => {
    const response = await runProxy("/login", {
      [AUTH_COOKIES.accessToken]: "access-token",
      [AUTH_COOKIES.userType]: "BUDDY",
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/dashboard");
  });

  it.each([
    "/login",
    "/onboarding",
    "/home",
    "/explore",
    "/activities/1",
    "/activities/1/book",
    "/applications",
    "/dashboard",
    "/my-activities",
    "/my-activities/create",
    "/my-activities/1/applicants",
    "/my-page",
    "/my-page/edit",
  ])("matches the protected page route %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
  });

  it.each(["/", "/auth/google/callback", "/api/users/me", "/_next/static/app.js", "/favicon.ico"])(
    "does not match the public or infrastructure route %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false);
    },
  );
});
