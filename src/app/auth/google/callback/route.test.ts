import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("redirects to login when Google returns an error", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/auth/google/callback?error=access_denied&error_description=denied",
        {
          headers: {
            cookie: `${LOCALE_COOKIE_NAME}=ko`,
          },
        },
      ),
    );

    expect(response.headers.get("location")).toBe(
      "http://localhost/ko/login?error=googleCancelled",
    );
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
        result: { registered: true },
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
          accessToken: "access-token",
          userType: "TOURIST",
        } satisfies GoogleLoginResponse,
      },
    });

    const response = await GET(createCallbackRequest("ko"));

    expect(response.headers.get("location")).toBe("http://localhost/ko/explore");
    expect(response.headers.get("set-cookie") ?? "").toContain("refresh_token=backend");
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
          accessToken: "access-token",
          userType: "BUDDY",
        } satisfies GoogleLoginResponse,
      },
    });

    const response = await GET(createCallbackRequest("ko"));

    expect(response.headers.get("location")).toBe("http://localhost/ko/dashboard");
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
          signupToken: "signup-token",
          googleProfile: {
            email: "traveler@example.com",
            name: "Traveler",
            picture: "https://lh3.googleusercontent.com/profile",
          },
        } satisfies GoogleLoginResponse,
      },
    });

    const response = await GET(createCallbackRequest("ko"));
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.headers.get("location")).toBe("http://localhost/ko/onboarding");
    expect(setCookie).toContain(`${AUTH_COOKIES.signupToken}=signup-token`);
    expect(setCookie).toContain("refresh_token=backend");

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

  it("uses a finite code when an unregistered login response has no signup token", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: ["refresh_token=backend; Path=/; HttpOnly"],
      payload: {
        isSuccess: true,
        code: "AUTH200",
        message: "OK",
        result: { registered: false },
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

function createCallbackRequest(locale?: string) {
  const requestCookies = [`${AUTH_COOKIES.oauthState}=state`];
  if (locale) requestCookies.push(`${LOCALE_COOKIE_NAME}=${locale}`);

  return new NextRequest("http://localhost/auth/google/callback?code=code&state=state", {
    headers: {
      cookie: requestCookies.join("; "),
    },
  });
}
