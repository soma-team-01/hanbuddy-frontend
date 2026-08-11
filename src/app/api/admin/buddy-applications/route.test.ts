import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { GET } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, getBackend: vi.fn() };
});

const mockedGetBackend = vi.mocked(getBackend);

describe("GET /api/admin/buddy-applications", () => {
  beforeEach(() => mockedGetBackend.mockReset());

  it("rejects a forged admin cookie when the authenticated user is not an admin", async () => {
    mockedGetBackend.mockResolvedValue({
      status: 200,
      payload: {
        isSuccess: true,
        code: "OK",
        message: "ok",
        result: { userType: "BUDDY" },
      },
      setCookies: [],
    } as Awaited<ReturnType<typeof getBackend>>);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/buddy-applications", {
        headers: {
          cookie: `${AUTH_COOKIES.accessToken}=token; ${AUTH_COOKIES.userType}=ADMIN`,
        },
      }),
    );

    expect(response.status).toBe(403);
    expect(mockedGetBackend).toHaveBeenCalledOnce();
    expect(mockedGetBackend).toHaveBeenCalledWith("/users/me", { bearerToken: "token" });
  });

  it("forwards an admin session to the backend", async () => {
    mockedGetBackend
      .mockResolvedValueOnce({
        status: 200,
        payload: {
          isSuccess: true,
          code: "OK",
          message: "ok",
          result: { userType: "ADMIN" },
        },
        setCookies: [],
      } as Awaited<ReturnType<typeof getBackend>>)
      .mockResolvedValueOnce({
        status: 200,
        payload: { isSuccess: true, code: "OK", message: "ok", result: [] },
        setCookies: [],
      });
    const response = await GET(
      new NextRequest("http://localhost/api/admin/buddy-applications", {
        headers: {
          cookie: `${AUTH_COOKIES.accessToken}=admin-token; ${AUTH_COOKIES.userType}=ADMIN`,
        },
      }),
    );

    expect(mockedGetBackend).toHaveBeenNthCalledWith(1, "/users/me", {
      bearerToken: "admin-token",
    });
    expect(mockedGetBackend).toHaveBeenNthCalledWith(2, "/admin/buddy-applications", {
      bearerToken: "admin-token",
    });
    expect(response.status).toBe(200);
  });
});
