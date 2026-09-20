import { afterEach, expect, it, vi } from "vitest";
import { createProofApi, createPaymentLinker, createCookieJar } from "./cookie-runtime";
afterEach(() => vi.useRealTimers());
it("persists only the browser decision marker without an expiry or server proof", () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const document = { cookie: "" };
  const jar = createCookieJar(document, undefined, storage);
  const decision = `denied.${"A".repeat(43)}`;
  jar.decide(decision);
  document.cookie = "";
  expect(createCookieJar(document, undefined, storage).decision()).toBe(decision);
  expect([...values.values()]).toEqual([decision]);
  values.clear();
  expect(createCookieJar(document, undefined, storage).decision()).toBe("");
});
it("uses same origin exact proof operations and rejects unavailable/malformed acknowledgement", async () => {
  const request = vi.fn(
    async () =>
      new Response(
        JSON.stringify({ isSuccess: true, result: { proof: "synthetic", expiresAt: "date" } }),
      ),
  );
  const api = createProofApi(request);
  await api.issue("ACCEPT");
  expect(request).toHaveBeenLastCalledWith(
    "/api/analytics/purchase-consent-proof",
    expect.objectContaining({
      credentials: "same-origin",
      body: '{"action":"ACCEPT"}',
      headers: { "Content-Type": "application/json", "X-Analytics-Request": "1" },
    }),
  );
  await expect(api.withdraw("denied.synthetic")).rejects.toThrow();
  expect(request).toHaveBeenLastCalledWith(
    "/api/analytics/purchase-withdrawal",
    expect.objectContaining({
      body: "{}",
      headers: expect.objectContaining({ "X-Analytics-Proof": "denied.synthetic" }),
    }),
  );
});
it("writes host-only secure finite cookies without extending server expiry", () => {
  const document = { cookie: "" };
  const jar = createCookieJar(document);
  jar.write("denied", 27);
  expect(document.cookie).toBe(
    "__Host-hb_measurement_consent=denied; Path=/; Secure; SameSite=Lax; Max-Age=27",
  );
  jar.decide("denied.synthetic", 10);
  expect(document.cookie).not.toContain("Domain");
  expect(jar.decision()).toBe("denied.synthetic");
});
function linker() {
  let proof: string | null = "synthetic",
    epoch = 0;
  let resolve!: (v: { clientId: string; sessionId: string }) => void;
  const identifiers = vi.fn(
    () =>
      new Promise<{ clientId: string; sessionId: string }>((r) => {
        resolve = r;
      }),
  );
  const request = vi.fn(async (url: string | URL | Request) =>
    String(url).endsWith("/analytics-consent")
      ? Response.json({ isSuccess: true, result: { registered: true } })
      : Response.json({ isSuccess: true, result: { linked: true } }),
  );
  const link = createPaymentLinker({
    proof: () => proof,
    epoch: () => epoch,
    origin: "https://hanbuddy.kr",
    identifiers,
    request,
  });
  return {
    link,
    request,
    identifiers,
    resolve: () => resolve({ clientId: "123.456", sessionId: "789" }),
    deny: () => {
      proof = null;
    },
    switchAccount: () => {
      epoch++;
    },
  };
}
it("registers consent before reading identifiers and linking the owned application", async () => {
  const s = linker(),
    ticket = s.link.capture();
  expect(ticket?.headers).toEqual({ "X-Analytics-Request": "1" });
  const pending = ticket!.complete(42, "a".repeat(64));
  await vi.waitFor(() => expect(s.request).toHaveBeenCalledTimes(1));
  expect(s.request.mock.calls[0]).toEqual([
    "/api/applications/me/42/analytics-consent",
    expect.objectContaining({ method: "POST", body: "{}" }),
  ]);
  await vi.waitFor(() => expect(s.identifiers).toHaveBeenCalledTimes(1));
  s.resolve();
  await pending;
  expect(s.request).toHaveBeenNthCalledWith(
    2,
    "/api/applications/me/42/analytics-link",
    expect.objectContaining({
      method: "PUT",
      body: '{"clientId":"123.456","sessionId":"789"}',
      headers: expect.objectContaining({ "X-Analytics-Context": "a".repeat(64) }),
    }),
  );
});
it.each([409, 410])(
  "treats registration %s as terminal without identifier lookup",
  async (status) => {
    const s = linker();
    s.request.mockResolvedValueOnce(Response.json({ isSuccess: false }, { status }));
    await s.link.capture()!.complete(42, "a".repeat(64));
    expect(s.identifiers).not.toHaveBeenCalled();
    expect(s.request).toHaveBeenCalledTimes(1);
  },
);
it.each(["deny", "switchAccount"] as const)(
  "drops delayed identifiers after %s",
  async (action) => {
    const s = linker(),
      ticket = s.link.capture()!;
    const pending = ticket.complete(42, "a".repeat(64));
    await vi.waitFor(() => expect(s.identifiers).toHaveBeenCalledTimes(1));
    s[action]();
    s.resolve();
    await pending;
    expect(s.request).toHaveBeenCalledTimes(1);
    expect(String(s.request.mock.calls[0][0])).toContain("/analytics-consent");
  },
);
it("disabled capture and missing response fence never obtain identifiers", async () => {
  const s = linker();
  await s.link.capture()!.complete(42, null);
  expect(s.identifiers).not.toHaveBeenCalled();
  s.deny();
  expect(s.link.capture()).toBeNull();
});
it.each(["registration", "link"] as const)(
  "bounds a stalled optional analytics %s request",
  async (phase) => {
    vi.useFakeTimers();
    const never = new Promise<Response>(() => {});
    const request = vi.fn<typeof fetch>(async (path) => {
      if (String(path).endsWith("/analytics-consent"))
        return phase === "registration"
          ? never
          : Response.json({ isSuccess: true, result: { registered: true } });
      return never;
    });
    const link = createPaymentLinker({
      proof: () => "synthetic",
      epoch: () => 0,
      origin: "https://hanbuddy.kr",
      identifiers: async () => ({ clientId: "123.456", sessionId: "789" }),
      request,
    });
    let settled = false;
    void link
      .capture()!
      .complete(42, "a".repeat(64))
      .then(() => {
        settled = true;
      });

    await vi.advanceTimersByTimeAsync(3000);

    expect(settled).toBe(true);
    expect(request).toHaveBeenCalledTimes(phase === "registration" ? 1 : 2);
  },
);
it.each([410, 503])(
  "does not query configuration or retry after terminal %s without retrying proof",
  async (status) => {
    const request = vi.fn<typeof fetch>(async () =>
      Response.json({ isSuccess: false }, { status }),
    );
    await expect(createProofApi(request).issue("RESTORE")).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  },
);
