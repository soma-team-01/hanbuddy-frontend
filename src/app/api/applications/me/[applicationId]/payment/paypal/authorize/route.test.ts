import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { postBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { POST } from "./route";
vi.mock("@/lib/auth/backend", async (original) => ({
  ...(await original<typeof import("@/lib/auth/backend")>()),
  postBackend: vi.fn(),
}));
beforeEach(() => vi.mocked(postBackend).mockReset());
const request = (body: unknown, auth = true) =>
  new NextRequest("http://localhost/api/applications/me/11/payment/paypal/authorize?language=EN", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { cookie: `${AUTH_COOKIES.accessToken}=token` } : {}),
    },
  });
const context = { params: Promise.resolve({ applicationId: "11" }) };
it("proxies authorization with auth/language and nullable hold timestamps", async () => {
  const result = {
    status: "PENDING_APPROVAL",
    paymentStatus: "AUTHORIZED",
    paypalAuthorization: {
      state: "AUTHORIZED",
      authorizedAt: null,
      expiresAt: null,
      releasedAt: null,
    },
  };
  vi.mocked(postBackend).mockResolvedValue({
    status: 200,
    payload: { isSuccess: true, code: "200", message: "ok", result },
    setCookies: [],
  });
  const response = await POST(request({ orderId: " ORDER " }), context);
  expect(postBackend).toHaveBeenCalledWith(
    "/applications/me/11/payment/paypal/authorize?language=EN",
    { orderId: "ORDER" },
    { bearerToken: "token" },
  );
  expect(await response.json()).toMatchObject({ result });
});
it.each([
  "PAYMENT409_PAYPAL_PROCESSING",
  "PAYMENT409_PAYPAL_DECLINED",
  "PAYMENT409_REVIEW_REQUIRED",
  "PAYMENT409_CONFIRM_MISMATCH",
])("preserves %s", async (code) => {
  vi.mocked(postBackend).mockResolvedValue({
    status: 409,
    payload: { isSuccess: false, code, message: "server" },
    setCookies: [],
  });
  const response = await POST(request({ orderId: "ORDER" }), context);
  expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ code });
});
it.each([null, {}, { orderId: " " }])("rejects malformed order bodies %s", async (body) => {
  expect((await POST(request(body), context)).status).toBe(400);
  expect(postBackend).not.toHaveBeenCalled();
});
it("requires authentication", async () => {
  expect((await POST(request({ orderId: "ORDER" }, false), context)).status).toBe(401);
  expect(postBackend).not.toHaveBeenCalled();
});
