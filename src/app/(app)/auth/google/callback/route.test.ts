import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { postBackend } from "@/lib/auth/backend";
import type { GoogleLoginResponse } from "@/lib/auth/types";
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

    expect(response.headers.get("location")).toContain("/login?error=%EB%A1%9C%EA%B7%B8%EC%9D%B8");
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

    const response = await GET(createCallbackRequest());

    expect(response.headers.get("location")).toBe("http://localhost/explore");
    expect(response.headers.get("set-cookie") ?? "").toContain("refresh_token=backend");
  });
});

function createCallbackRequest() {
  return new NextRequest("http://localhost/auth/google/callback?code=code&state=state", {
    headers: {
      cookie: `${AUTH_COOKIES.oauthState}=state`,
    },
  });
}
