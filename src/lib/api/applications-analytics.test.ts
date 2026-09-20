import { afterEach, expect, it, vi } from "vitest";
import { createApplication, continueApplicationPayment } from "./applications";
import { captureAnalyticsPayment, createPaymentLinker } from "@/lib/analytics/cookie-runtime";
vi.mock("@/lib/analytics/cookie-runtime", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics/cookie-runtime")>()),
  captureAnalyticsPayment: vi.fn(),
}));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it.each(["create", "continue"])(
  "%s captures before payment and completes consent/linkage before returning",
  async (kind) => {
    let finish!: () => void;
    const complete = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
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
    let settled = false;
    const operation =
      kind === "create"
        ? createApplication(
            { activityScheduleId: 1, guestCount: 1, refundPolicyAgreed: true },
            "EN",
            "TOSS",
          )
        : continueApplicationPayment(42, "EN", "TOSS");
    void operation.then(() => {
      settled = true;
    });
    await vi.waitFor(() => expect(complete).toHaveBeenCalledWith(42, "a".repeat(64)));
    expect(settled).toBe(false);
    finish();
    const result = await operation;
    expect(result.status).toBe("success");
    expect(request.mock.calls[0][1]?.headers).toEqual(
      expect.objectContaining({ "X-Analytics-Request": "1" }),
    );
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

it.each(["create", "continue"])(
  "%s stays successful after terminal late-link 409 without retry or regrant",
  async (kind) => {
    vi.useFakeTimers();
    let finishLink!: (response: Response) => void;
    const lateResponse = new Promise<Response>((resolve) => {
      finishLink = resolve;
    });
    const payment = {
      application: { applicationId: 42 },
      paymentId: 7,
      paymentAmount: 45000,
      paymentCurrency: "KRW",
    };
    const request = vi.fn<typeof fetch>(async (path) => {
      if (String(path).endsWith("/analytics-link")) return lateResponse;
      if (String(path).endsWith("/analytics-consent"))
        return Response.json({ isSuccess: true, result: { registered: true } });
      return Response.json(
        { isSuccess: true, result: payment },
        { headers: { "X-Analytics-Context": "a".repeat(64) } },
      );
    });
    vi.stubGlobal("fetch", request);
    const identifiers = vi.fn(async () => ({ clientId: "123.456", sessionId: "789" }));
    const ticket = createPaymentLinker({
      proof: () => "synthetic-granted-proof",
      epoch: () => 0,
      origin: "https://hanbuddy.kr",
      identifiers,
      request,
    }).capture()!;
    const complete = vi.fn(ticket.complete);
    vi.mocked(captureAnalyticsPayment).mockReturnValue({ ...ticket, complete });

    const operation =
      kind === "create"
        ? createApplication(
            { activityScheduleId: 1, guestCount: 1, refundPolicyAgreed: true },
            "EN",
            "TOSS",
          )
        : continueApplicationPayment(42, "EN", "TOSS");
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(3));
    finishLink(
      Response.json(
        {
          isSuccess: false,
          code: "ANALYTICS_LINK_CONFLICT",
          message: "Analytics request unavailable",
        },
        { status: 409 },
      ),
    );
    const result = await operation;
    await expect(complete.mock.results[0].value).resolves.toBeUndefined();
    await vi.runAllTimersAsync();

    expect(result).toEqual({ status: "success", payment });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(identifiers).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(3);
    expect(request.mock.calls.map(([path]) => String(path))).toEqual([
      expect.stringContaining(
        kind === "create" ? "/api/applications?" : "/api/applications/me/42/payment/continue?",
      ),
      "/api/applications/me/42/analytics-consent",
      "/api/applications/me/42/analytics-link",
    ]);
    expect(request.mock.calls[2][1]).toMatchObject({
      method: "PUT",
      body: '{"clientId":"123.456","sessionId":"789"}',
    });
  },
);
