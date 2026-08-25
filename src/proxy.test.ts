import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { config, proxy } from "./proxy";

async function runProxy(
  pathname: string,
  cookies: Record<string, string> = {},
  headers: Record<string, string> = {},
) {
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  return proxy(
    new NextRequest(`http://localhost${pathname}`, {
      headers: {
        ...headers,
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
    }),
  );
}

describe("route access proxy", () => {
  it.each(["/dashboard", "/my-activities/create", "/my-page/edit"])(
    "redirects unauthenticated access to %s before rendering",
    async (pathname) => {
      const response = await runProxy(pathname);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        `http://localhost/en/login?next=${encodeURIComponent(pathname)}`,
      );
    },
  );

  it("keeps the booking destination so login returns to it", async () => {
    const response = await runProxy("/en/activities/42/book?scheduleId=101");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `http://localhost/en/login?next=${encodeURIComponent("/activities/42/book?scheduleId=101")}`,
    );
  });

  it("requires a signup session for onboarding", async () => {
    const response = await runProxy("/onboarding");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/en/login");
  });

  it.each([
    ["TOURIST", "/dashboard", "/en"],
    ["BUDDY", "/activities/1/book", "/ko/dashboard"],
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

    const exploreResponse = await runProxy("/en/explore", cookies);
    const myPageResponse = await runProxy("/en/my-page", cookies);

    expect(exploreResponse.status).toBe(200);
    expect(myPageResponse.status).toBe(200);
    expect(exploreResponse.headers.get("location")).toBeNull();
    expect(myPageResponse.headers.get("location")).toBeNull();
  });

  it("allows unauthenticated visitors to browse activities", async () => {
    const exploreResponse = await runProxy("/en/explore");
    const activityResponse = await runProxy("/en/activities/1");

    expect(exploreResponse.status).toBe(200);
    expect(activityResponse.status).toBe(200);
    expect(exploreResponse.headers.get("location")).toBeNull();
    expect(activityResponse.headers.get("location")).toBeNull();
  });

  it("allows onboarding with a signup token", async () => {
    const response = await runProxy("/en/onboarding", {
      [AUTH_COOKIES.signupToken]: "signup-token",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("protects bare admin routes without locale rewriting", async () => {
    const unauthenticated = await runProxy("/admin/buddies");
    expect(unauthenticated.headers.get("location")).toBe("http://localhost/admin/login");

    const nonAdmin = await runProxy("/admin/buddies", {
      [AUTH_COOKIES.accessToken]: "access-token",
      [AUTH_COOKIES.userType]: "TOURIST",
    });
    expect(nonAdmin.headers.get("location")).toBe("http://localhost/admin/login?error=adminOnly");

    const admin = await runProxy("/admin/buddies", {
      [AUTH_COOKIES.accessToken]: "access-token",
      [AUTH_COOKIES.userType]: "ADMIN",
    });
    expect(admin.status).toBe(200);
    expect(admin.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("redirects authenticated admins away from the admin login", async () => {
    const response = await runProxy("/admin/login", {
      [AUTH_COOKIES.accessToken]: "access-token",
      [AUTH_COOKIES.userType]: "ADMIN",
    });
    expect(response.headers.get("location")).toBe("http://localhost/admin/buddies");
  });

  it("redirects authenticated users away from login", async () => {
    const response = await runProxy("/en/login", {
      [AUTH_COOKIES.accessToken]: "access-token",
      [AUTH_COOKIES.userType]: "BUDDY",
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/en/dashboard");
  });

  it("allows an unauthenticated Korean request to browse Explore", async () => {
    const response = await runProxy(
      "/explore",
      {},
      {
        "accept-language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
    );

    expect([200, 307]).toContain(response.status);
    expect(response.headers.get("location") ?? "").not.toContain("/login");
  });

  it("keeps the explicit locale when browsing Explore", async () => {
    const response = await runProxy("/en/explore");

    expect([200, 307]).toContain(response.status);
    const location = response.headers.get("location");
    expect(location ?? "").not.toContain("/login");

    if (response.status === 307) {
      expect(new URL(location ?? "http://localhost").pathname).toMatch(/^\/en(?:\/|$)/);
    }
  });

  it.each(["ja", "zh-Hans", "zh-Hant"] as const)(
    "keeps the explicit %s locale when browsing Explore",
    async (locale) => {
      const response = await runProxy(`/${locale}/explore`);

      expect(response.status).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    },
  );

  it.each([
    ["TOURIST", "/ko/dashboard", "/ko"],
    ["BUDDY", "/en/activities/1/book", "/en/dashboard"],
  ] as const)(
    "preserves locale when redirecting %s away from %s",
    async (userType, pathname, home) => {
      const response = await runProxy(pathname, {
        [AUTH_COOKIES.accessToken]: "access-token",
        [AUTH_COOKIES.userType]: userType,
      });

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(`http://localhost${home}`);
    },
  );

  it("uses the locale cookie for an unprefixed authenticated route", async () => {
    const response = await runProxy("/explore", {
      NEXT_LOCALE: "ko",
      [AUTH_COOKIES.accessToken]: "access-token",
      [AUTH_COOKIES.userType]: "TOURIST",
    });

    expect([200, 307]).toContain(response.status);
    expect(response.headers.get("location") ?? "").not.toContain("/login");
  });

  it("defaults an unprefixed tourist landing request to English", async () => {
    const response = await runProxy("/", {}, { "accept-language": "ko-KR,ko;q=0.9" });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/en");
  });

  it("defaults an unprefixed buddy landing request to Korean", async () => {
    const response = await runProxy("/buddy", {}, { "accept-language": "en-US,en;q=0.9" });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/ko/buddy");
  });

  it.each([
    ["/", "ko", "TOURIST", "/ko"],
    ["/dashboard", "en", "BUDDY", "/en/dashboard"],
  ] as const)(
    "preserves the saved locale for an authenticated %s request",
    async (path, locale, userType, target) => {
      const response = await runProxy(path, {
        NEXT_LOCALE: locale,
        [AUTH_COOKIES.accessToken]: "access-token",
        [AUTH_COOKIES.userType]: userType,
      });

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(`http://localhost${target}`);
    },
  );

  it.each([
    ["/", "ko", "/en"],
    ["/buddy", "en", "/ko/buddy"],
  ] as const)(
    "uses the public landing default for an unauthenticated %s request",
    async (path, savedLocale, target) => {
      const response = await runProxy(path, { NEXT_LOCALE: savedLocale });

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(`http://localhost${target}`);
    },
  );

  it("lets an unsupported language segment reach the locale 404 boundary", async () => {
    const response = await runProxy("/fr/explore");

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it.each([
    "/login",
    "/onboarding",
    "/home",
    "/home/settings",
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
    "/admin",
    "/admin/login",
    "/admin/buddies",
  ])("matches the protected page route %s", (url) => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
  });

  it.each(["/api/users/me", "/auth/google/callback", "/_next/static/file.js", "/favicon.ico"])(
    "does not match the fixed handler or infrastructure route %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false);
    },
  );
});
