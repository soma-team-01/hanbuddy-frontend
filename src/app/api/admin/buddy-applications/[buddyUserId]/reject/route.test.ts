import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBackend, postBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { POST } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, getBackend: vi.fn(), postBackend: vi.fn() };
});

const mockedGetBackend = vi.mocked(getBackend);
const mockedPostBackend = vi.mocked(postBackend);
const routeContext = { params: Promise.resolve({ buddyUserId: "42" }) };

function mockAdminProfile() {
  mockedGetBackend.mockResolvedValue({
    status: 200,
    payload: {
      isSuccess: true,
      code: "OK",
      message: "ok",
      result: { userType: "ADMIN" },
    },
    setCookies: [],
  } as Awaited<ReturnType<typeof getBackend>>);
}

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/buddy-applications/42/reject", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie: `${AUTH_COOKIES.accessToken}=admin-token`,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/buddy-applications/[buddyUserId]/reject", () => {
  beforeEach(() => {
    mockedGetBackend.mockReset();
    mockedPostBackend.mockReset();
    mockAdminProfile();
  });

  it.each([{ reason: 123 }, { reason: null }, [], null])(
    "returns 400 for a non-string rejection reason",
    async (body) => {
      const response = await POST(createRequest(body), routeContext);

      expect(response.status).toBe(400);
      expect(mockedPostBackend).not.toHaveBeenCalled();
    },
  );

  it("trims and forwards a valid rejection reason", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "OK", message: "ok", result: "rejected" },
      setCookies: [],
    });

    const response = await POST(
      createRequest({ reason: "  프로필 확인이 필요합니다.  " }),
      routeContext,
    );

    expect(mockedPostBackend).toHaveBeenCalledWith(
      "/admin/buddy-applications/42/reject",
      { reason: "프로필 확인이 필요합니다." },
      { bearerToken: "admin-token" },
    );
    expect(response.status).toBe(200);
  });
});
