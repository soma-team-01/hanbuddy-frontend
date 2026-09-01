import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBackend, postBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { GET, POST } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, getBackend: vi.fn(), postBackend: vi.fn() };
});

const mockedGetBackend = vi.mocked(getBackend);
const mockedPostBackend = vi.mocked(postBackend);
const adminProfile = {
  status: 200,
  payload: {
    isSuccess: true,
    code: "OK",
    message: "ok",
    result: { userType: "ADMIN" },
  },
  setCookies: [],
} as Awaited<ReturnType<typeof getBackend>>;

function adminRequest(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  const headers = new Headers(init?.headers);
  headers.set("cookie", `${AUTH_COOKIES.accessToken}=admin-token; ${AUTH_COOKIES.userType}=ADMIN`);
  return new NextRequest(url, {
    ...init,
    headers,
  });
}

describe("admin users BFF", () => {
  beforeEach(() => {
    mockedGetBackend.mockReset();
    mockedPostBackend.mockReset();
  });

  it("forwards only supported filters to the user list API", async () => {
    mockedGetBackend.mockResolvedValueOnce(adminProfile).mockResolvedValueOnce({
      status: 200,
      payload: { isSuccess: true, code: "OK", message: "ok", result: { content: [] } },
      setCookies: [],
    });

    const response = await GET(
      adminRequest(
        "http://localhost/api/admin/users?email=user%40example.com&page=2&unknown=ignored",
      ),
      { params: Promise.resolve({ segments: [] }) },
    );

    expect(response.status).toBe(200);
    expect(mockedGetBackend).toHaveBeenNthCalledWith(
      2,
      "/admin/users?email=user%40example.com&page=2",
      { bearerToken: "admin-token" },
    );
  });

  it("forwards a paginated user history request", async () => {
    mockedGetBackend.mockResolvedValueOnce(adminProfile).mockResolvedValueOnce({
      status: 200,
      payload: { isSuccess: true, code: "OK", message: "ok", result: { content: [] } },
      setCookies: [],
    });

    await GET(adminRequest("http://localhost/api/admin/users/42/payments?page=1&size=10"), {
      params: Promise.resolve({ segments: ["42", "payments"] }),
    });

    expect(mockedGetBackend).toHaveBeenNthCalledWith(2, "/admin/users/42/payments?page=1&size=10", {
      bearerToken: "admin-token",
    });
  });

  it("trims the suspension reason before forwarding it", async () => {
    mockedGetBackend.mockResolvedValueOnce(adminProfile);
    mockedPostBackend.mockResolvedValueOnce({
      status: 200,
      payload: { isSuccess: true, code: "OK", message: "ok", result: {} },
      setCookies: [],
    });

    const response = await POST(
      adminRequest("http://localhost/api/admin/users/42/suspend", {
        method: "POST",
        body: JSON.stringify({ reason: "  반복적인 운영 정책 위반  " }),
      }),
      { params: Promise.resolve({ segments: ["42", "suspend"] }) },
    );

    expect(response.status).toBe(200);
    expect(mockedPostBackend).toHaveBeenCalledWith(
      "/admin/users/42/suspend",
      { reason: "반복적인 운영 정책 위반" },
      { bearerToken: "admin-token" },
    );
  });
});
