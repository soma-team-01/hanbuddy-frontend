import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_COOKIES, decodeGoogleProfile } from "@/lib/auth/cookies";
import { postBackend } from "@/lib/auth/backend";
import type { GoogleLoginResponse } from "@/lib/auth/types";
import { LOCALE_COOKIE_NAME } from "@/i18n/routing";
import { GET } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return {
    ...actual,
    postBackend: vi.fn(),
  };
});

const mockedPostBackend = vi.mocked(postBackend);

describe("GET /auth/google/callback", () => {
  beforeEach(() => {
    mockedPostBackend.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects to login when Google returns an error", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/auth/google/callback?error=access_denied&error_description=denied",
        {
          headers: {
            cookie: `${LOCALE_COOKIE_NAME}=en; ${AUTH_COOKIES.oauthLocale}=ko`,
          },
        },
      ),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/ko/login?error=googleCancelled",
    );
    expect(response.headers.get("set-cookie") ?? "").toContain(`${AUTH_COOKIES.oauthLocale}=;`);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });

  it("maps an arbitrary Google provider error to unknown without reflecting it", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/auth/google/callback?error=provider_secret&error_description=do-not-reflect",
      ),
    );
    const location = response.headers.get("location") ?? "";

    expect(location).toBe("http://localhost/en/login?error=unknown");
    expect(location).not.toContain("provider_secret");
    expect(location).not.toContain("do-not-reflect");
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });

  it("redirects to login when the authorization code is missing", async () => {
    const response = await GET(
      new NextRequest("http://localhost/auth/google/callback?state=state", {
        headers: {
          cookie: `${AUTH_COOKIES.oauthState}=state`,
        },
      }),
    );

    expect(response.headers.get("location")).toBe("http://localhost/en/login?error=missingCode");
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });

  it("redirects to login when state validation fails", async () => {
    const response = await GET(
      new NextRequest("http://localhost/auth/google/callback?code=code&state=other", {
        headers: {
          cookie: `${AUTH_COOKIES.oauthState}=state`,
        },
      }),
    );

    expect(response.headers.get("location")).toBe("http://localhost/en/login?error=invalidState");
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });

  it("does not forward backend cookies when the successful payload is unusable", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: ["refresh_token=backend; Path=/; HttpOnly"],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: { registered: true, authStatus: "ACTIVE" },
      },
    });

    const response = await GET(createCallbackRequest());

    expect(response.headers.get("location")).toBe(
      "http://localhost/en/login?error=invalidLoginResponse",
    );
    expect(response.headers.get("set-cookie") ?? "").not.toContain("refresh_token=backend");
  });

  it("forwards backend cookies when authentication data is valid", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: ["refresh_token=backend; Path=/; HttpOnly"],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: {
          registered: true,
          authStatus: "ACTIVE",
          accessToken: "access-token",
          userType: "TOURIST",
        } satisfies GoogleLoginResponse,
      },
    });

    const response = await GET(createCallbackRequest("ko"));

    expect(response.headers.get("location")).toBe("http://localhost/ko");
    expect(response.headers.get("set-cookie") ?? "").toContain("refresh_token=backend");
  });

  it("uses and clears the OAuth locale after authentication", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: [],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: {
          registered: true,
          authStatus: "ACTIVE",
          accessToken: "access-token",
          userType: "TOURIST",
        } satisfies GoogleLoginResponse,
      },
    });

    const response = await GET(createCallbackRequest("en", "ko"));
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.headers.get("location")).toBe("http://localhost/ko");
    expect(setCookie).toContain(`${AUTH_COOKIES.oauthLocale}=;`);
  });

  it("returns a tourist to the page they were on before logging in", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: [],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: {
          registered: true,
          authStatus: "ACTIVE",
          accessToken: "access-token",
          userType: "TOURIST",
        } satisfies GoogleLoginResponse,
      },
    });

    const response = await GET(
      createCallbackRequest("en", undefined, undefined, [
        `${AUTH_COOKIES.oauthReturnTo}=${encodeURIComponent("/activities/42/book?scheduleId=101")}`,
      ]),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/en/activities/42/book?scheduleId=101",
    );
    expect(response.headers.get("set-cookie") ?? "").toContain(`${AUTH_COOKIES.oauthReturnTo}=;`);
  });

  it("ignores an unsafe return-to target and falls back to the home page", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: [],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: {
          registered: true,
          authStatus: "ACTIVE",
          accessToken: "access-token",
          userType: "TOURIST",
        } satisfies GoogleLoginResponse,
      },
    });

    const response = await GET(
      createCallbackRequest("en", undefined, undefined, [
        `${AUTH_COOKIES.oauthReturnTo}=${encodeURIComponent("https://evil.example.com/")}`,
      ]),
    );

    expect(response.headers.get("location")).toBe("http://localhost/en");
  });

  it("redirects a registered tourist without a locale cookie to the default locale", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: [],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: {
          registered: true,
          authStatus: "ACTIVE",
          accessToken: "access-token",
          userType: "TOURIST",
        } satisfies GoogleLoginResponse,
      },
    });

    const response = await GET(createCallbackRequest());

    expect(response.headers.get("location")).toBe("http://localhost/en");
  });

  it("redirects registered buddies to the localized dashboard", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: [],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: {
          registered: true,
          authStatus: "ACTIVE",
          accessToken: "access-token",
          userType: "BUDDY",
        } satisfies GoogleLoginResponse,
      },
    });

    const response = await GET(createCallbackRequest("ko"));

    expect(response.headers.get("location")).toBe("http://localhost/ko/dashboard");
  });

  it("redirects a registered admin intent to the admin dashboard", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: [],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: {
          registered: true,
          authStatus: "ACTIVE",
          accessToken: "admin-access-token",
          userType: "ADMIN",
        } satisfies GoogleLoginResponse,
      },
    });

    const response = await GET(createCallbackRequest(undefined, undefined, "admin"));

    expect(response.headers.get("location")).toBe("http://localhost/admin/users");
    expect(response.headers.get("set-cookie") ?? "").toContain(`${AUTH_COOKIES.userType}=ADMIN`);
  });

  it("rejects non-admin and unregistered users from the admin login flow", async () => {
    mockedPostBackend.mockResolvedValueOnce({
      status: 200,
      setCookies: ["refresh_token=tourist; Path=/; HttpOnly"],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: {
          registered: true,
          authStatus: "ACTIVE",
          accessToken: "tourist-token",
          userType: "TOURIST",
        } satisfies GoogleLoginResponse,
      },
    });
    const touristResponse = await GET(createCallbackRequest(undefined, undefined, "admin"));
    expect(touristResponse.headers.get("location")).toBe(
      "http://localhost/admin/login?error=adminOnly",
    );
    expect(touristResponse.headers.get("set-cookie") ?? "").not.toContain("refresh_token=tourist");

    mockedPostBackend.mockResolvedValueOnce({
      status: 200,
      setCookies: ["refresh_token=signup; Path=/; HttpOnly"],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: {
          registered: false,
          authStatus: "ONBOARDING_REQUIRED",
          signupToken: "signup-token",
        } satisfies GoogleLoginResponse,
      },
    });
    const signupResponse = await GET(createCallbackRequest(undefined, undefined, "admin"));
    expect(signupResponse.headers.get("location")).toBe(
      "http://localhost/admin/login?error=adminAccountRequired",
    );
    expect(signupResponse.headers.get("set-cookie") ?? "").not.toContain(
      `${AUTH_COOKIES.signupToken}=signup-token`,
    );
    expect(signupResponse.headers.get("set-cookie") ?? "").not.toContain("refresh_token=signup");
  });

  it("redirects pending buddy accounts to the approval status page without session tokens", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: ["refresh_token=backend; Path=/; HttpOnly"],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: {
          registered: true,
          authStatus: "PENDING_APPROVAL",
          userId: 7,
          userType: "BUDDY",
        } satisfies GoogleLoginResponse,
      },
    });

    const response = await GET(createCallbackRequest("ko", undefined, "buddy"));
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.headers.get("location")).toBe(
      "http://localhost/ko/buddy/auth/status?status=PENDING_APPROVAL",
    );
    expect(setCookie).not.toContain("refresh_token=backend");
    expect(setCookie).toContain(`${AUTH_COOKIES.accessToken}=;`);
    expect(setCookie).toContain(`${AUTH_COOKIES.userType}=;`);
  });

  it("keeps a rejection reason out of the URL and stores it for the status screen", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: [],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: {
          registered: true,
          authStatus: "REJECTED",
          statusReason: "제출한 활동 정보를 확인할 수 없습니다.",
          userId: 8,
          userType: "BUDDY",
        } satisfies GoogleLoginResponse,
      },
    });

    const response = await GET(createCallbackRequest("en", undefined, "buddy"));
    const location = response.headers.get("location") ?? "";

    expect(location).toBe("http://localhost/en/buddy/auth/status?status=REJECTED");
    expect(location).not.toContain("reason");
    expect(response.headers.get("set-cookie") ?? "").toContain(`${AUTH_COOKIES.statusReason}=`);
  });

  it("redirects suspended buddy accounts to the suspended status screen", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: [],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: {
          registered: true,
          authStatus: "SUSPENDED",
          userId: 9,
          userType: "BUDDY",
        } satisfies GoogleLoginResponse,
      },
    });

    const response = await GET(createCallbackRequest("en", undefined, "buddy"));

    expect(response.headers.get("location")).toBe(
      "http://localhost/en/buddy/auth/status?status=SUSPENDED",
    );
  });

  it("redirects suspended tourist accounts to the general account status screen", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: [],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: {
          registered: true,
          authStatus: "SUSPENDED",
          userId: 10,
          userType: "TOURIST",
        } satisfies GoogleLoginResponse,
      },
    });

    const response = await GET(createCallbackRequest("ko"));

    expect(response.headers.get("location")).toBe(
      "http://localhost/ko/auth/status?status=SUSPENDED",
    );
  });

  it("redirects unregistered users to onboarding with signup cookies", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: ["refresh_token=backend; Path=/; HttpOnly"],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: {
          registered: false,
          authStatus: "ONBOARDING_REQUIRED",
          signupToken: "signup-token",
          googleProfile: {
            email: "traveler@example.com",
            name: "Traveler",
            picture: "https://lh3.googleusercontent.com/profile",
          },
        } satisfies GoogleLoginResponse,
      },
    });

    const response = await GET(
      createCallbackRequest("ko", undefined, undefined, [
        `${AUTH_COOKIES.accessToken}=old-access-token`,
        `${AUTH_COOKIES.refreshToken}=old-refresh-token`,
        `${AUTH_COOKIES.userId}=99`,
        `${AUTH_COOKIES.userType}=TOURIST`,
        `${AUTH_COOKIES.statusReason}=old-status-reason`,
      ]),
    );
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.headers.get("location")).toBe("http://localhost/ko/onboarding");
    expect(setCookie).toContain(`${AUTH_COOKIES.signupToken}=signup-token`);
    expect(setCookie).not.toContain("refresh_token=backend");
    expect(setCookie).toContain(`${AUTH_COOKIES.accessToken}=;`);
    expect(setCookie).toContain(`${AUTH_COOKIES.refreshToken}=;`);
    expect(setCookie).toContain(`${AUTH_COOKIES.userId}=;`);
    expect(setCookie).toContain(`${AUTH_COOKIES.userType}=;`);
    expect(setCookie).toContain(`${AUTH_COOKIES.statusReason}=;`);

    const profileCookieValue = setCookie.match(
      new RegExp(`${AUTH_COOKIES.googleProfile}=([^;,]+)`),
    )?.[1];
    const decodedProfile = decodeGoogleProfile(profileCookieValue);

    expect(decodedProfile).toEqual({
      name: "Traveler",
      picture: "https://lh3.googleusercontent.com/profile",
    });
    expect(decodedProfile).not.toHaveProperty("email");
  });

  it("uses the configured public origin behind the EC2 reverse proxy", async () => {
    vi.stubEnv("GOOGLE_REDIRECT_URI", "https://staging.hanbuddy.kr/auth/google/callback");
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: [],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: {
          registered: false,
          authStatus: "ONBOARDING_REQUIRED",
          signupToken: "signup-token",
        } satisfies GoogleLoginResponse,
      },
    });

    const response = await GET(
      new NextRequest("http://0.0.0.0:3000/auth/google/callback?code=code&state=state", {
        headers: {
          cookie: `${AUTH_COOKIES.oauthState}=state; ${AUTH_COOKIES.oauthLocale}=ko`,
        },
      }),
    );

    expect(response.headers.get("location")).toBe("https://staging.hanbuddy.kr/ko/onboarding");
  });

  it("redirects an unregistered buddy signup to buddy onboarding", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: [],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: {
          registered: false,
          authStatus: "ONBOARDING_REQUIRED",
          signupToken: "signup-token",
          googleProfile: { name: "Future Buddy" },
        } satisfies GoogleLoginResponse,
      },
    });

    const response = await GET(createCallbackRequest("en", undefined, "buddy"));

    expect(response.headers.get("location")).toBe("http://localhost/en/buddy/onboarding");
    expect(response.headers.get("set-cookie") ?? "").toContain(`${AUTH_COOKIES.oauthIntent}=;`);
  });

  it("uses the default locale for onboarding when the locale cookie is invalid", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: [],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: {
          registered: false,
          authStatus: "ONBOARDING_REQUIRED",
          signupToken: "signup-token",
        } satisfies GoogleLoginResponse,
      },
    });

    const response = await GET(createCallbackRequest("fr"));

    expect(response.headers.get("location")).toBe("http://localhost/en/onboarding");
  });

  it("uses a finite code when an unregistered login response has no signup token", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: ["refresh_token=backend; Path=/; HttpOnly"],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: { registered: false, authStatus: "ONBOARDING_REQUIRED" },
      },
    });

    const response = await GET(createCallbackRequest());

    expect(response.headers.get("location")).toBe(
      "http://localhost/en/login?error=missingSignupToken",
    );
    expect(response.headers.get("set-cookie") ?? "").not.toContain("refresh_token=backend");
  });

  it("redirects to login when the backend login request fails", async () => {
    mockedPostBackend.mockRejectedValue(new Error("network"));

    const response = await GET(createCallbackRequest("fr"));

    expect(response.headers.get("location")).toBe(
      "http://localhost/en/login?error=serverUnavailable",
    );
  });

  it("never reflects an arbitrary backend rejection message in the login query", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 400,
      setCookies: [],
      payload: {
        isSuccess: false,
        code: "AUTH400",
        message: "<script>backend secret exploded</script>",
      },
    });

    const response = await GET(createCallbackRequest("ko"));
    const location = response.headers.get("location") ?? "";

    expect(location).toBe("http://localhost/ko/login?error=backendRejected");
    expect(location).not.toContain("secret");
    expect(location).not.toContain("script");
  });
});

function createCallbackRequest(
  locale?: string,
  oauthLocale?: string,
  oauthIntent?: string,
  existingCookies: string[] = [],
) {
  const requestCookies = [`${AUTH_COOKIES.oauthState}=state`, ...existingCookies];
  if (locale) requestCookies.push(`${LOCALE_COOKIE_NAME}=${locale}`);
  if (oauthLocale) requestCookies.push(`${AUTH_COOKIES.oauthLocale}=${oauthLocale}`);
  if (oauthIntent) requestCookies.push(`${AUTH_COOKIES.oauthIntent}=${oauthIntent}`);

  return new NextRequest("http://localhost/auth/google/callback?code=code&state=state", {
    headers: {
      cookie: requestCookies.join("; "),
    },
  });
}
