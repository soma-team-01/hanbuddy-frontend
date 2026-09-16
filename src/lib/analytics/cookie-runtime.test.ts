import { expect, it, vi } from "vitest";
import { createProofApi, createPaymentLinker, createCookieJar } from "./cookie-runtime";
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
    "__Host-hb_ga_consent=denied; Path=/; Secure; SameSite=Lax; Max-Age=27",
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
  const request = vi.fn(async () => new Response("{}"));
  const link = createPaymentLinker({
    proof: () => proof,
    epoch: () => epoch,
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
it("late links only identifiers to owned application and never waits in booking", async () => {
  const s = linker(),
    ticket = s.link.capture();
  expect(ticket?.headers).toEqual({ "X-Analytics-Request": "1" });
  const pending = ticket!.complete(42, "a".repeat(64));
  s.resolve();
  await pending;
  expect(s.request).toHaveBeenCalledWith(
    "/api/applications/me/42/analytics-link",
    expect.objectContaining({
      method: "PUT",
      body: '{"clientId":"123.456","sessionId":"789"}',
      headers: expect.objectContaining({ "X-Analytics-Context": "a".repeat(64) }),
    }),
  );
});
it.each(["deny", "switchAccount"] as const)(
  "drops delayed identifiers after %s",
  async (action) => {
    const s = linker(),
      ticket = s.link.capture()!;
    const pending = ticket.complete(42, "a".repeat(64));
    s[action]();
    s.resolve();
    await pending;
    expect(s.request).not.toHaveBeenCalled();
  },
);
it("disabled capture and missing response fence never obtain identifiers", async () => {
  const s = linker();
  await s.link.capture()!.complete(42, null);
  expect(s.identifiers).not.toHaveBeenCalled();
  s.deny();
  expect(s.link.capture()).toBeNull();
});
