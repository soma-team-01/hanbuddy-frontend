import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { postBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import type { GoogleLoginResponse, GoogleSignupRequest } from "@/lib/auth/types";
import { POST } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, postBackend: vi.fn() };
});

const mockedPostBackend = vi.mocked(postBackend);

const signupRequest: GoogleSignupRequest = {
  userType: "BUDDY",
  displayName: "Han Buddy",
  nationalityCode: "KR",
  birthDate: "2000-01-01",
  contactMethod: "PHONE",
  contactCountryCode: "+82",
  contactIdentifier: "01012345678",
  agreements: [
    { type: "ADULT_CONFIRMATION", version: "2026-08-06", agreed: true },
    { type: "TERMS_OF_SERVICE", version: "2026-08-06", agreed: true },
    { type: "PRIVACY_COLLECTION_USE", version: "2026-08-06", agreed: true },
    { type: "BUDDY_OPERATION_TERMS", version: "2026-08-06", agreed: true },
    { type: "BUDDY_COMMISSION_POLICY", version: "2026-08-06", agreed: true },
    {
      type: "BUDDY_PROFILE_CONTACT_PROVISION",
      version: "2026-08-06",
      agreed: true,
    },
    { type: "MARKETING_COMMUNICATION", version: "2026-08-06", agreed: false },
  ],
};

function createSignupRequest() {
  return new NextRequest("http://localhost/api/auth/google/signup", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${AUTH_COOKIES.signupToken}=signup-token`,
    },
    body: JSON.stringify(signupRequest),
  });
}

function successfulPayload(result: GoogleLoginResponse) {
  return {
    isSuccess: true as const,
    code: "AUTH200",
    message: "OK",
    result,
  };
}

describe("POST /api/auth/google/signup", () => {
  beforeEach(() => {
    mockedPostBackend.mockReset();
  });

  it("forwards role-specific signup agreements to the backend", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: [],
      payload: successfulPayload({
        registered: true,
        authStatus: "PENDING_APPROVAL",
        userId: 16,
        userType: "BUDDY",
      }),
    });

    await POST(createSignupRequest());

    expect(mockedPostBackend).toHaveBeenCalledWith("/auth/google/signup", signupRequest, {
      bearerToken: "signup-token",
    });
  });

  it("stores the authenticated session when signup immediately becomes active", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: ["refresh_token=backend; Path=/; HttpOnly"],
      payload: successfulPayload({
        registered: true,
        authStatus: "ACTIVE",
        userId: 17,
        userType: "TOURIST",
        accessToken: "access-token",
      }),
    });

    const response = await POST(createSignupRequest());
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(setCookie).toContain("refresh_token=backend");
    expect(setCookie).toContain(`${AUTH_COOKIES.accessToken}=access-token`);
    expect(setCookie).toContain(`${AUTH_COOKIES.userType}=TOURIST`);
  });

  it("keeps a pending buddy signed out and does not forward refresh cookies", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: ["refresh_token=backend; Path=/; HttpOnly"],
      payload: successfulPayload({
        registered: true,
        authStatus: "PENDING_APPROVAL",
        userId: 18,
        userType: "BUDDY",
      }),
    });

    const response = await POST(createSignupRequest());
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(setCookie).not.toContain("refresh_token=backend");
    expect(setCookie).toContain(`${AUTH_COOKIES.accessToken}=;`);
    expect(setCookie).toContain(`${AUTH_COOKIES.userType}=;`);
  });

  it("stores the rejection reason for the status guidance page", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      setCookies: [],
      payload: successfulPayload({
        registered: true,
        authStatus: "REJECTED",
        statusReason: "신원 확인 자료가 부족합니다.",
        userId: 19,
        userType: "BUDDY",
      }),
    });

    const response = await POST(createSignupRequest());
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(setCookie).toContain(
      `${AUTH_COOKIES.statusReason}=${encodeURIComponent("신원 확인 자료가 부족합니다.")}`,
    );
  });
});
