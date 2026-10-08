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

  it.each(["EARLY_15", "EARLY_10", "STANDARD_20"])(
    "validates and forwards %s",
    async (commissionPolicy) => {
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
            commissionPolicy,
            reason: "  초기 버디 혜택 기간 종료  ",
          }),
        }),
        { params: Promise.resolve({ segments: ["7", "commission"] }) },
      );

      expect(response.status).toBe(200);
      expect(mockedPatchBackend).toHaveBeenCalledWith(
        "/admin/buddies/7/commission",
        { commissionPolicy, reason: "초기 버디 혜택 기간 종료" },
        { bearerToken: "admin-token" },
      );
    },
  );

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

  it("rejects a non-string commission reason without calling the backend mutation", async () => {
    mockedGetBackend.mockResolvedValueOnce(adminProfile);

    const response = await PATCH(
      adminRequest("http://localhost/api/admin/buddies/7/commission", {
        method: "PATCH",
        body: JSON.stringify({ commissionPolicy: "STANDARD_20", reason: 123 }),
      }),
      { params: Promise.resolve({ segments: ["7", "commission"] }) },
    );

    expect(response.status).toBe(400);
    expect(mockedPatchBackend).not.toHaveBeenCalled();
  });
  it.each([
    { commissionPolicy: "UNKNOWN", reason: "manual" },
    { commissionPolicy: "EARLY_15", reason: " " },
    { commissionPolicy: "EARLY_15", reason: "a".repeat(501) },
    { reason: "manual" },
  ])("rejects invalid policy/reason %j without mutation", async (body) => {
    mockedGetBackend.mockResolvedValueOnce(adminProfile);
    const response = await PATCH(
      adminRequest("http://localhost/api/admin/buddies/7/commission", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ segments: ["7", "commission"] }) },
    );
    expect(response.status).toBe(400);
    expect(mockedPatchBackend).not.toHaveBeenCalled();
  });

  it.each([
    [400, "VALIDATION400_FORMAT", "요청 값 형식이 올바르지 않습니다."],
    [403, "USER403_ADMIN", "관리자만 접근할 수 있습니다."],
    [404, "ADMIN_BUDDY404_PROFILE", "버디 프로필을 찾을 수 없습니다."],
    [409, "ADMIN_BUDDY409_COMMISSION", "현재와 동일한 수수료 정책으로 변경할 수 없습니다."],
  ])("preserves backend error %s and its payload", async (status, code, message) => {
    mockedGetBackend.mockResolvedValueOnce(adminProfile);
    const payload = { isSuccess: false as const, code, message, result: null };
    mockedPatchBackend.mockResolvedValueOnce({ status, payload, setCookies: [] });
    const response = await PATCH(
      adminRequest("http://localhost/api/admin/buddies/7/commission", {
        method: "PATCH",
        body: JSON.stringify({ commissionPolicy: "EARLY_15", reason: "manual" }),
      }),
      { params: Promise.resolve({ segments: ["7", "commission"] }) },
    );
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(payload);
  });

  it("rejects unauthenticated commission changes", async () => {
    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/buddies/7/commission", {
        method: "PATCH",
        body: JSON.stringify({ commissionPolicy: "EARLY_15", reason: "manual" }),
      }),
      { params: Promise.resolve({ segments: ["7", "commission"] }) },
    );
    expect(response.status).toBe(401);
    expect(mockedGetBackend).not.toHaveBeenCalled();
    expect(mockedPatchBackend).not.toHaveBeenCalled();
  });

  it("checks server role rather than trusting the ADMIN cookie", async () => {
    mockedGetBackend.mockResolvedValueOnce({
      ...adminProfile,
      payload: { isSuccess: true, code: "OK", message: "ok", result: { userType: "BUDDY" } },
    });
    const response = await PATCH(
      adminRequest("http://localhost/api/admin/buddies/7/commission", {
        method: "PATCH",
        body: JSON.stringify({ commissionPolicy: "EARLY_15", reason: "manual" }),
      }),
      { params: Promise.resolve({ segments: ["7", "commission"] }) },
    );
    expect(response.status).toBe(403);
    expect(mockedPatchBackend).not.toHaveBeenCalled();
  });
});
