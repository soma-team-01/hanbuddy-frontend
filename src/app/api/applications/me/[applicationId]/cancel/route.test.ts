import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { patchBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { PATCH } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, patchBackend: vi.fn() };
});

const mockedPatchBackend = vi.mocked(patchBackend);
const cancelRequest = { cancellationReason: "SCHEDULE_CONFLICT" };
const context = { params: Promise.resolve({ applicationId: "11" }) };

describe("PATCH /api/applications/me/[applicationId]/cancel", () => {
  beforeEach(() => {
    mockedPatchBackend.mockReset();
  });

  it("returns 401 without calling the backend when the access token cookie is missing", async () => {
    const response = await PATCH(
      new NextRequest("http://localhost/api/applications/me/11/cancel", {
        method: "PATCH",
        body: JSON.stringify(cancelRequest),
      }),
      context,
    );

    expect(response.status).toBe(401);
    expect(mockedPatchBackend).not.toHaveBeenCalled();
  });

  it("proxies the cancellation with the access token as bearer", async () => {
    mockedPatchBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { applicationId: 11 } },
      setCookies: [],
    });

    const response = await PATCH(
      new NextRequest("http://localhost/api/applications/me/11/cancel", {
        method: "PATCH",
        body: JSON.stringify(cancelRequest),
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
      context,
    );

    expect(mockedPatchBackend).toHaveBeenCalledWith("/applications/me/11/cancel", cancelRequest, {
      bearerToken: "access-token",
    });
    expect(response.status).toBe(200);
  });
});
