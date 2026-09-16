import { afterEach, expect, it, vi } from "vitest";
import { createApplication, continueApplicationPayment } from "./applications";
import { captureAnalyticsPayment } from "@/lib/analytics/cookie-runtime";
vi.mock("@/lib/analytics/cookie-runtime", () => ({ captureAnalyticsPayment: vi.fn() }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it.each(["create", "continue"])(
  "%s captures before payment and does not await linkage",
  async (kind) => {
    const complete = vi.fn(() => new Promise<void>(() => {}));
    vi.mocked(captureAnalyticsPayment).mockReturnValue({
      headers: { "X-Analytics-Request": "1" },
      complete,
    });
    const request = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({ isSuccess: true, result: { application: { applicationId: 42 } } }),
          { headers: { "X-Analytics-Context": "a".repeat(64) } },
        ),
    );
    vi.stubGlobal("fetch", request);
    const result =
      kind === "create"
        ? await createApplication(
            { activityScheduleId: 1, guestCount: 1, refundPolicyAgreed: true },
            "EN",
            "TOSS",
          )
        : await continueApplicationPayment(42, "EN", "TOSS");
    expect(result.status).toBe("success");
    expect(request.mock.calls[0][1]?.headers).toEqual(
      expect.objectContaining({ "X-Analytics-Request": "1" }),
    );
    expect(complete).toHaveBeenCalledWith(42, "a".repeat(64));
  },
);
it("normal payment remains usable when analytics is unavailable", async () => {
  vi.mocked(captureAnalyticsPayment).mockReturnValue(null);
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({ isSuccess: true, result: { application: { applicationId: 42 } } }),
        ),
    ),
  );
  expect((await continueApplicationPayment(42, "EN", "TOSS")).status).toBe("success");
});
