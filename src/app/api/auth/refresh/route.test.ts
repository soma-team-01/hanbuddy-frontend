import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { postBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { POST } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, postBackend: vi.fn() };
});

const mockedPostBackend = vi.mocked(postBackend);

function expectAuthenticatedSessionCookiesCleared(setCookie: string) {
  for (const cookieName of [AUTH_COOKIES.accessToken, AUTH_COOKIES.userId, AUTH_COOKIES.userType]) {
    expect(setCookie).toContain(`${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`);
  }
}

describe("POST /api/auth/refresh", () => {
  beforeEach(() => {
    mockedPostBackend.mockReset();
  });

  it("clears authenticated session cookies when refresh is rejected", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 401,
      payload: {
        isSuccess: false,
        code: "TOKEN401",
        message: "토큰이 유효하지 않습니다.",
      },
      setCookies: [],
    });

    const response = await POST(
      new NextRequest("http://localhost/api/auth/refresh", { method: "POST" }),
    );
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(401);
    expectAuthenticatedSessionCookiesCleared(setCookie);
  });

  it("clears authenticated session cookies when refresh is forbidden", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 403,
      payload: {
        isSuccess: false,
        code: "TOKEN403",
        message: "토큰이 거부되었습니다.",
      },
      setCookies: [],
    });

    const response = await POST(
      new NextRequest("http://localhost/api/auth/refresh", { method: "POST" }),
    );
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(403);
    expectAuthenticatedSessionCookiesCleared(setCookie);
  });

  it("sets the renewed access token cookie when refresh succeeds", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      payload: {
        isSuccess: true,
        code: "SUCCESS",
        message: "요청에 성공했습니다.",
        result: { accessToken: "renewed-access-token" },
      },
      setCookies: [],
    });

    const response = await POST(
      new NextRequest("http://localhost/api/auth/refresh", { method: "POST" }),
    );
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    expect(setCookie).toContain(`${AUTH_COOKIES.accessToken}=renewed-access-token`);
  });

  it("preserves authenticated session cookies when the backend returns a server error", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 500,
      payload: {
        isSuccess: false,
        code: "SERVER500",
        message: "인증 서버 오류가 발생했습니다.",
      },
      setCookies: [],
    });

    const response = await POST(
      new NextRequest("http://localhost/api/auth/refresh", { method: "POST" }),
    );
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(500);
    expect(setCookie).not.toContain(`${AUTH_COOKIES.accessToken}=`);
    expect(setCookie).not.toContain(`${AUTH_COOKIES.userId}=`);
    expect(setCookie).not.toContain(`${AUTH_COOKIES.userType}=`);
  });
});
