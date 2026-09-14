import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { postBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import type { GoogleLoginResponse } from "@/lib/auth/types";
import { POST } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, postBackend: vi.fn() };
});

const mockedPostBackend = vi.mocked(postBackend);

function createRequest(
  body: unknown = { email: "reviewer@hanbuddy.kr", password: "review-password" },
  query = "locale=en",
) {
  return new NextRequest(`http://localhost/api/auth/review/login?${query}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function successfulPayload(result: GoogleLoginResponse) {
  return {
    isSuccess: true as const,
    code: "AUTH200_REVIEW_LOGIN",
    message: "OK",
    result,
  };
}

describe("POST /api/auth/review/login", () => {
  beforeEach(() => {
    vi.stubEnv("REVIEW_LOGIN_ENABLED", "true");
    mockedPostBackend.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed without calling the backend when review login is disabled", async () => {
    vi.stubEnv("REVIEW_LOGIN_ENABLED", "false");

    const response = await POST(createRequest());

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      isSuccess: false,
      code: "AUTH404_REVIEW_LOGIN",
    });
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });

  it("rejects malformed credentials before calling the backend", async () => {
    const response = await POST(createRequest({ email: "invalid", password: "" }));

    expect(response.status).toBe(400);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });

  it("stores an active session and returns a safe localized destination", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: ["refresh_token=backend; Path=/; HttpOnly"],
      payload: successfulPayload({
        registered: true,
        authStatus: "ACTIVE",
        userId: 7,
        userType: "TOURIST",
        accessToken: "access-token",
      }),
    });

    const response = await POST(
      createRequest(
        undefined,
        `locale=ko&next=${encodeURIComponent("/activities/42/book?scheduleId=101")}`,
      ),
    );
    const body = await response.json();
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(mockedPostBackend).toHaveBeenCalledWith("/auth/review/login", {
      email: "reviewer@hanbuddy.kr",
      password: "review-password",
    });
    expect(body.result.redirectTo).toBe("/ko/activities/42/book?scheduleId=101");
    expect(setCookie).toContain(`${AUTH_COOKIES.accessToken}=access-token`);
    expect(setCookie).toContain(`${AUTH_COOKIES.userType}=TOURIST`);
    expect(setCookie).toContain("refresh_token=backend");
  });

  it("keeps an inactive buddy signed out and returns the account status destination", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: ["refresh_token=backend; Path=/; HttpOnly"],
      payload: successfulPayload({
        registered: true,
        authStatus: "REJECTED",
        statusReason: "Please update your profile.",
        userId: 8,
        userType: "BUDDY",
        resubmissionToken: "resubmission-token",
      }),
    });

    const response = await POST(createRequest(undefined, "locale=en"));
    const body = await response.json();
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(body.result.redirectTo).toBe("/en/buddy/auth/status?status=REJECTED");
    expect(setCookie).not.toContain("refresh_token=backend");
    expect(setCookie).toContain(`${AUTH_COOKIES.accessToken}=;`);
    expect(setCookie).toContain(`${AUTH_COOKIES.statusReason}=`);
    expect(setCookie).toContain(`${AUTH_COOKIES.resubmissionToken}=resubmission-token`);
  });

  it("forwards a safe backend authentication failure", async () => {
    const backendMessage = "A review account exists, but its password hash did not match.";
    mockedPostBackend.mockResolvedValue({
      status: 401,
      setCookies: [],
      payload: {
        isSuccess: false,
        code: "AUTH401_REVIEW_LOGIN",
        message: backendMessage,
        result: { accountExists: true },
      },
    });

    const response = await POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({
      isSuccess: false,
      code: "AUTH401_REVIEW_LOGIN",
      message: "이메일 또는 비밀번호를 확인해 주세요.",
    });
    expect(JSON.stringify(body)).not.toContain(backendMessage);
    expect(body).not.toHaveProperty("result");
  });

  it("replaces an unapproved backend failure with a generic proxy error", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 500,
      setCookies: [],
      payload: {
        isSuccess: false,
        code: "AUTH500_REVIEW_LOGIN",
        message: "REVIEW_LOGIN_EMAIL is missing from the server configuration.",
        result: { configuredEmail: "reviewer@hanbuddy.kr" },
      },
    });

    const response = await POST(createRequest());

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      isSuccess: false,
      code: "AUTH_PROXY_ERROR",
      message: "인증 서버에 연결할 수 없습니다.",
    });
  });
});
