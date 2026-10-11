import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { postBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { POST } from "./route";
vi.mock("@/lib/auth/backend", async (original) => ({
  ...(await original<typeof import("@/lib/auth/backend")>()),
  postBackend: vi.fn(),
}));
const body = {
  price: 45000,
  currency: "KRW",
  maxGuestCount: 4,
  discountPercent: 10,
  discountEndDate: "2099-12-31",
  priceTiers: [{ minGuests: 2, maxGuests: null, unitPrice: 40000 }],
};
beforeEach(() => vi.clearAllMocks());
it("requires authentication", async () => {
  const res = await POST(
    new NextRequest("http://localhost/api/activities/pricing-preview", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );
  expect(res.status).toBe(401);
  expect(postBackend).not.toHaveBeenCalled();
});
it("forwards the full price configuration and preserves no-store", async () => {
  const result = {
    currency: "KRW",
    commissionRate: 0.15,
    rows: [
      {
        guestCount: 2,
        finalAmountKrw: 72000,
        totalDeductionAmountKrw: 10800,
        estimatedGuidePayoutAmountKrw: 61200,
      },
    ],
  };
  vi.mocked(postBackend).mockResolvedValue({
    status: 200,
    payload: { isSuccess: true, code: "200", message: "ok", result },
    setCookies: [],
  });
  const res = await POST(
    new NextRequest("http://localhost/api/activities/pricing-preview", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { cookie: `${AUTH_COOKIES.accessToken}=buddy-token` },
    }),
  );
  expect(postBackend).toHaveBeenCalledWith("/activities/pricing-preview", body, {
    bearerToken: "buddy-token",
  });
  expect(res.headers.get("cache-control")).toBe("no-store");
  expect((await res.json()).result).toEqual(result);
});
it("rejects malformed JSON without a backend write", async () => {
  const res = await POST(
    new NextRequest("http://localhost/api/activities/pricing-preview", {
      method: "POST",
      body: "{",
    }),
  );
  expect(res.status).toBe(400);
  expect(postBackend).not.toHaveBeenCalled();
});
