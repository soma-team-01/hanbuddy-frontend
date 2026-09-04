import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBackend, patchBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { GET, PATCH } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, getBackend: vi.fn(), patchBackend: vi.fn() };
});

const mockedGetBackend = vi.mocked(getBackend);
const mockedPatchBackend = vi.mocked(patchBackend);
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

describe("admin buddies BFF", () => {
  beforeEach(() => {
    mockedGetBackend.mockReset();
    mockedPatchBackend.mockReset();
  });

  it("forwards a buddy performance request", async () => {
    mockedGetBackend.mockResolvedValueOnce(adminProfile).mockResolvedValueOnce({
      status: 200,
      payload: { isSuccess: true, code: "OK", message: "ok", result: {} },
      setCookies: [],
    });

    const response = await GET(adminRequest("http://localhost/api/admin/buddies/7/performance"), {
      params: Promise.resolve({ segments: ["7", "performance"] }),
    });

    expect(response.status).toBe(200);
    expect(mockedGetBackend).toHaveBeenNthCalledWith(2, "/admin/buddies/7/performance", {
      bearerToken: "admin-token",
    });
  });

  it("validates and forwards a commission policy change", async () => {
    mockedGetBackend.mockResolvedValueOnce(adminProfile);
    mockedPatchBackend.mockResolvedValueOnce({
      status: 200,
      payload: { isSuccess: true, code: "OK", message: "ok", result: {} },
      setCookies: [],
    });

    const response = await PATCH(
      adminRequest("http://localhost/api/admin/buddies/7/commission", {
        method: "PATCH",
        body: JSON.stringify({
          commissionPolicy: "STANDARD_20",
          reason: "  초기 버디 혜택 기간 종료  ",
        }),
      }),
      { params: Promise.resolve({ segments: ["7", "commission"] }) },
    );

    expect(response.status).toBe(200);
    expect(mockedPatchBackend).toHaveBeenCalledWith(
      "/admin/buddies/7/commission",
      { commissionPolicy: "STANDARD_20", reason: "초기 버디 혜택 기간 종료" },
      { bearerToken: "admin-token" },
    );
  });

  it("rejects a null commission body without calling the backend mutation", async () => {
    mockedGetBackend.mockResolvedValueOnce(adminProfile);

    const response = await PATCH(
      adminRequest("http://localhost/api/admin/buddies/7/commission", {
        method: "PATCH",
        body: "null",
      }),
      { params: Promise.resolve({ segments: ["7", "commission"] }) },
    );

    expect(response.status).toBe(400);
    expect(mockedPatchBackend).not.toHaveBeenCalled();
  });
});
