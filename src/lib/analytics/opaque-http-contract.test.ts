import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { POST as issue } from "@/app/api/analytics/purchase-consent-proof/route";
import { POST as withdraw } from "@/app/api/analytics/purchase-withdrawal/route";
import { POST as create } from "@/app/api/applications/route";
import { POST as resume } from "@/app/api/applications/me/[applicationId]/payment/continue/route";
import { PUT as link } from "@/app/api/applications/me/[applicationId]/analytics-link/route";
import { analyticsContextForToken } from "@/app/api/_utils/analytics-bff";
import { postBackend } from "@/lib/auth/backend";

// HTTP wire fixture from backend 66c8b29 PurchaseConsentController/Service.
// This executes real frontend fetch/BFF code, not Java, SQL, PG or Google.
const origin = "https://hanbuddy.kr";
const proof = `granted.v2.${"A".repeat(43)}`;
const denied = proof.replace("granted", "denied");
const expiresAt = "2099-01-01T00:00:00Z"; // synthetic, never an approved lifetime
const token = "synthetic-owner";
const context = { params: Promise.resolve({ applicationId: "42" }) };
const calls: { method?: string; path?: string; headers: Record<string, unknown>; body: unknown }[] =
  [];
let server: Server;
let reply = { status: 200, result: {} as object, code: "200" };
beforeAll(async () => {
  server = createServer(async (request, response) => {
    let raw = "";
    for await (const chunk of request) raw += chunk;
    calls.push({
      method: request.method,
      path: request.url,
      headers: request.headers,
      body: raw ? JSON.parse(raw) : null,
    });
    response.writeHead(reply.status, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    response.end(
      JSON.stringify(
        reply.status < 400
          ? { isSuccess: true, code: "200", message: "ok", result: reply.result }
          : { isSuccess: false, code: reply.code, message: "internal details must not escape" },
      ),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  vi.stubEnv("HANBUDDY_API_BASE_URL", `http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  vi.stubEnv("GA_ENABLED", "true");
  vi.stubEnv("GA_MEASUREMENT_ID", "G-TEST");
});
afterAll(async () => {
  vi.unstubAllEnvs();
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});
function request(path: string, body?: object, selected = proof, method = "POST") {
  return new NextRequest(`${origin}/api${path}`, {
    method,
    headers: {
      origin,
      "Content-Type": "application/json",
      "X-Analytics-Request": "1",
      cookie: `hanbuddy_access_token=${token}; __Host-hb_ga_consent=${selected}; unrelated=discard`,
      "X-Analytics-Context": analyticsContextForToken(token),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
function expectCall(
  method: string,
  path: string,
  body: unknown,
  selected = proof,
  authenticated = false,
) {
  expect(calls.at(-1)).toMatchObject({ method, path, body });
  expect(calls.at(-1)?.headers).toMatchObject({ origin, "x-analytics-request": "1" });
  expect(calls.at(-1)?.headers.cookie).toBe(
    selected ? `__Host-hb_ga_consent=${selected}` : undefined,
  );
  expect(calls.at(-1)?.headers.authorization).toBe(authenticated ? `Bearer ${token}` : undefined);
}
it("transports action-only ACCEPT/RESTORE and original expiry without cookies or policy queries", async () => {
  reply = { status: 200, result: { proof, expiresAt, privateField: "discard" }, code: "200" };
  for (const action of ["ACCEPT", "RESTORE"]) {
    const response = await issue(
      request(
        "/analytics/purchase-consent-proof",
        { action, policyVersion: "discard" },
        action === "ACCEPT" ? "" : proof,
      ),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).result).toEqual({ proof, expiresAt });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expectCall(
      "POST",
      "/analytics/purchase-consent-proof",
      { action },
      action === "ACCEPT" ? "" : proof,
    );
  }
  expect(calls).toHaveLength(2);
});
it("preserves capture before create/continue and actual currency; register stays a separate backend operation", async () => {
  reply = {
    status: 200,
    result: { applicationId: 42, amount: 12.34, currency: "USD" },
    code: "200",
  };
  const body = { activityId: 7, scheduleId: 9, numberOfGuests: 1 };
  const created = await create(request("/applications", body));
  expect((await created.json()).result).toEqual(reply.result);
  expect(created.headers.get("X-Analytics-Context")).toBe(analyticsContextForToken(token));
  expectCall("POST", "/applications", body, proof, true);
  const continued = await resume(request("/applications/me/42/payment/continue"), context);
  expect((await continued.json()).result).toEqual(reply.result);
  expectCall("POST", "/applications/me/42/payment/continue", null, proof, true);
  reply.result = { registered: true };
  const registered = await postBackend(
    "/applications/me/42/analytics-consent",
    {},
    {
      bearerToken: token,
      cookieHeader: `__Host-hb_ga_consent=${proof}`,
      origin,
      analyticsRequest: true,
    },
  );
  expect(registered.status).toBe(200);
  expectCall("POST", "/applications/me/42/analytics-consent", {}, proof, true);
});
it("projects identifier linkage and preserves terminal409 and owner404 with one request each", async () => {
  for (const [status, code] of [
    [200, "200"],
    [409, "ANALYTICS_LINK_CONFLICT"],
    [404, "ANALYTICS_NOT_FOUND"],
  ] as const) {
    reply = { status, code, result: { linked: true } };
    const count = calls.length;
    const response = await link(
      request(
        "/applications/me/42/analytics-link",
        { clientId: "123.456", sessionId: "789", userId: "discard", paymentId: "discard" },
        proof,
        "PUT",
      ),
      context,
    );
    expect(response.status).toBe(status);
    expect(calls).toHaveLength(count + 1);
    expectCall(
      "PUT",
      "/applications/me/42/analytics-link",
      { clientId: "123.456", sessionId: "789" },
      proof,
      true,
    );
    if (status !== 200)
      expect(await response.json()).toEqual({
        isSuccess: false,
        code,
        message: "Analytics request unavailable",
      });
  }
});
it("keeps revoked410 and backend-disabled503 terminal and withdrawal available when frontend is OFF", async () => {
  for (const [status, code] of [
    [410, "ANALYTICS_REVOKED_OR_EXPIRED"],
    [503, "ANALYTICS_DISABLED"],
  ] as const) {
    reply = { status, code, result: {} };
    const count = calls.length;
    expect(
      (await issue(request("/analytics/purchase-consent-proof", { action: "RESTORE" }))).status,
    ).toBe(status);
    expect(calls).toHaveLength(count + 1);
    expectCall("POST", "/analytics/purchase-consent-proof", { action: "RESTORE" });
  }
  vi.stubEnv("GA_ENABLED", "false");
  const count = calls.length;
  expect(
    (await issue(request("/analytics/purchase-consent-proof", { action: "ACCEPT" }))).status,
  ).toBe(503);
  expect(calls).toHaveLength(count);
  reply = { status: 200, code: "200", result: { withdrawalAcknowledged: true } };
  const response = await withdraw(request("/analytics/purchase-withdrawal", {}, denied));
  expect((await response.json()).result).toEqual({ withdrawalAcknowledged: true });
  expectCall("POST", "/analytics/purchase-withdrawal", {}, denied);
  expect(calls.every((call) => !call.path?.includes("policy"))).toBe(true);
});
