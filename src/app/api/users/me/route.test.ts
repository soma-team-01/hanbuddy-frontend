import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import type { MyProfile } from "@/types/user";
import { GET } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return {
    ...actual,
    getBackend: vi.fn(),
  };
});

const mockedGetBackend = vi.mocked(getBackend);

const profile: MyProfile = {
  userId: 1,
  email: "user@example.com",
  name: "Sarah Jenkins",
  userType: "TOURIST",
  profileImageKey: null,
  profileImageUrl: null,
  nationalityCode: "US",
  age: 28,
  contactMethod: "LINE",
  contactCountryCode: "+1",
  contactIdentifier: "555-0198",
};

describe("GET /api/users/me", () => {
  beforeEach(() => {
    mockedGetBackend.mockReset();
  });

  it("returns 401 without calling the backend when the access token cookie is missing", async () => {
    const response = await GET(new NextRequest("http://localhost/api/users/me"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ isSuccess: false });
    expect(mockedGetBackend).not.toHaveBeenCalled();
  });

  it("proxies the profile request with the access token as bearer", async () => {
    mockedGetBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: profile },
      setCookies: [],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/users/me", {
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
    );

    expect(mockedGetBackend).toHaveBeenCalledWith("/users/me", { bearerToken: "access-token" });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      isSuccess: true,
      result: { userId: 1, name: "Sarah Jenkins" },
    });
  });

  it("forwards the backend error status and payload", async () => {
    mockedGetBackend.mockResolvedValue({
      status: 401,
      payload: { isSuccess: false, code: "AUTH_401", message: "만료된 토큰입니다." },
      setCookies: [],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/users/me", {
        headers: { cookie: `${AUTH_COOKIES.accessToken}=expired-token` },
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ isSuccess: false, code: "AUTH_401" });
  });

  it("returns 502 when the backend request fails", async () => {
    mockedGetBackend.mockRejectedValue(new Error("network down"));

    const response = await GET(
      new NextRequest("http://localhost/api/users/me", {
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({ isSuccess: false });
  });
});
