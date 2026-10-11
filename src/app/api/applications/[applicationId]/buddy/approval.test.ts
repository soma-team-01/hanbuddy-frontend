import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { postBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { POST as approve } from "./approve/route";
import { POST as reject } from "./reject/route";
vi.mock("@/lib/auth/backend", async (original) => ({
  ...(await original<typeof import("@/lib/auth/backend")>()),
  postBackend: vi.fn(),
}));
beforeEach(() => vi.resetAllMocks());
it.each(["approve", "reject"] as const)(
  "authenticates and proxies %s without expecting a result",
  async (action) => {
    const payload = { isSuccess: true as const, code: "200", message: "ok" };
    vi.mocked(postBackend).mockResolvedValue({
      status: 200,
      payload,
      setCookies: [],
    } as unknown as Awaited<ReturnType<typeof postBackend>>);
    const body = action === "reject" ? { reason: "BOOKING_UNAVAILABLE" } : undefined;
    const request = new NextRequest(`http://localhost/api/applications/7/buddy/${action}`, {
      method: "POST",
      headers: { cookie: `${AUTH_COOKIES.accessToken}=token` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const response = await (action === "approve" ? approve : reject)(request, {
      params: Promise.resolve({ applicationId: "7" }),
    });
    expect(postBackend).toHaveBeenCalledWith(`/applications/7/buddy/${action}`, body, {
      bearerToken: "token",
    });
    expect(await response.json()).toEqual(payload);
  },
);
it("does not proxy unauthenticated approvals", async () => {
  const response = await approve(
    new NextRequest("http://localhost/api/applications/7/buddy/approve", { method: "POST" }),
    { params: Promise.resolve({ applicationId: "7" }) },
  );
  expect(response.status).toBe(401);
  expect(postBackend).not.toHaveBeenCalled();
});

it.each([
  { reason: "OTHER", detail: "Wrong request contract" },
  { reason: "BUDDY_OTHER", detail: "   " },
  { reason: "BUDDY_OTHER", detail: "x".repeat(256) },
])("rejects invalid buddy rejection payloads before proxying: %j", async (body) => {
  const response = await reject(
    new NextRequest("http://localhost/api/applications/7/buddy/reject", {
      method: "POST",
      headers: { cookie: `${AUTH_COOKIES.accessToken}=token` },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ applicationId: "7" }) },
  );
  expect(response.status).toBe(400);
  expect(postBackend).not.toHaveBeenCalled();
});
