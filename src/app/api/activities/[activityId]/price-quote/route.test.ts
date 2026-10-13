import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";
import { getBackend } from "@/lib/auth/backend";
import { GET } from "./route";
vi.mock("@/lib/auth/backend", async (original) => ({
  ...(await original<typeof import("@/lib/auth/backend")>()),
  getBackend: vi.fn(),
}));
beforeEach(() => vi.clearAllMocks());
it("proxies a public KRW quote and forwards only guestCount", async () => {
  const result = { activityId: 8, guestCount: 2, amount: 72000 };
  vi.mocked(getBackend).mockResolvedValue({
    status: 200,
    payload: { isSuccess: true, code: "200", message: "ok", result },
    setCookies: [],
  });
  const res = await GET(
    new NextRequest(
      "http://localhost/api/activities/8/price-quote?guestCount=2&displayCurrency=USD&buddyId=9",
    ),
    { params: Promise.resolve({ activityId: "8" }) },
  );
  expect(getBackend).toHaveBeenCalledWith("/activities/8/price-quote?guestCount=2");
  expect(res.headers.get("cache-control")).toBe("no-store");
  expect((await res.json()).result).toEqual(result);
});
it.each(["0", "101", "1.5", "", "NaN"])("rejects invalid count %s", async (count) => {
  const res = await GET(
    new NextRequest(`http://localhost/api/activities/8/price-quote?guestCount=${count}`),
    { params: Promise.resolve({ activityId: "8" }) },
  );
  expect(res.status).toBe(400);
  expect(getBackend).not.toHaveBeenCalled();
});
