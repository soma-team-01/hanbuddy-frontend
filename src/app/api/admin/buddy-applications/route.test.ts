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

  it("rejects non-admin sessions before calling the backend", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/buddy-applications", {
        headers: {
          cookie: `${AUTH_COOKIES.accessToken}=token; ${AUTH_COOKIES.userType}=BUDDY`,
        },
      }),
    );
    expect(response.status).toBe(403);
    expect(mockedGetBackend).not.toHaveBeenCalled();
  });

  it("forwards an admin session to the backend", async () => {
    mockedGetBackend.mockResolvedValue({
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
    expect(mockedGetBackend).toHaveBeenCalledWith("/admin/buddy-applications", {
      bearerToken: "admin-token",
    });
    expect(response.status).toBe(200);
  });
});
