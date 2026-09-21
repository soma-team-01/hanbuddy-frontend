import { NextRequest } from "next/server";
import { afterEach, expect, it, vi } from "vitest";
import { postBackend } from "@/lib/auth/backend";
import { POST as issueRoute } from "@/app/api/analytics/purchase-consent-proof/route";
import { POST as withdrawRoute } from "@/app/api/analytics/purchase-withdrawal/route";
import { createCookieConsent, type ConsentCookieJar } from "./cookie-consent";
import { createProofApi } from "./cookie-runtime";

vi.mock("@/lib/auth/backend", () => ({ postBackend: vi.fn() }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
const origin = "https://hanbuddy.kr";
const expiry = "1970-01-01T00:17:40Z";

// Synthetic action-only v3 server boundary, not an assertion about a deployed backend.
function environment() {
  for (const [key, value] of Object.entries({
    NODE_ENV: "production",
    GA_ENABLED: "true",
    GA_MEASUREMENT_ID: "G-TEST",
  }))
    vi.stubEnv(key, value);
  let cookie = "",
    decision = "",
    serial = 0;
  const records = new Map<string, { revoked: boolean; expiresAt: string }>();
  const calls: string[] = [];
  vi.mocked(postBackend).mockImplementation(async (path, body, options) => {
    const raw = options?.cookieHeader?.split("=")[1] ?? "";
    const id = raw.split(".")[2];
    const record = records.get(id);
    calls.push(path.endsWith("withdrawal") ? "WITHDRAW" : (body as { action: string }).action);
    const ok = (result: object) => ({
      status: 200,
      payload: { isSuccess: true as const, code: "200", message: "ok", result },
      setCookies: [],
    });
    const unavailable = (status: number) => ({
      status,
      payload: {
        isSuccess: false as const,
        code: "ANALYTICS_REVOKED_OR_EXPIRED",
        message: "unavailable",
      },
      setCookies: [],
    });
    if (path.endsWith("withdrawal")) {
      if (record) record.revoked = true;
      return ok({ withdrawalAcknowledged: true });
    }
    const action = (body as { action: string }).action;
    if (action === "RESTORE") {
      return record && !record.revoked && raw.startsWith("granted.")
        ? ok({ proof: raw, expiresAt: record.expiresAt })
        : unavailable(410);
    }
    if (raw.startsWith("granted."))
      return record && !record.revoked
        ? ok({ proof: raw, expiresAt: record.expiresAt })
        : unavailable(410);
    if (raw.startsWith("denied.") && !record?.revoked) return unavailable(409);
    const next = `${String(++serial).padStart(42, "A")}A`;
    records.set(next, { revoked: false, expiresAt: expiry });
    return ok({ proof: `granted.v3.${next}`, expiresAt: expiry });
  });
  const request: typeof fetch = async (url, init) => {
    const headers = new Headers(init?.headers);
    headers.set("origin", origin);
    if (cookie) headers.set("cookie", `__Host-hb_measurement_consent=${cookie}; unrelated=discard`);
    const req = new NextRequest(`${origin}${url}`, {
      ...init,
      headers,
      signal: init?.signal ?? undefined,
    });
    return String(url).endsWith("withdrawal") ? withdrawRoute(req) : issueRoute(req);
  };
  const jar: ConsentCookieJar = {
    read: () => cookie,
    write: (v) => {
      cookie = v;
    },
    decision: () => decision,
    decide: (v) => {
      decision = v;
    },
  };
  const api = createProofApi(request);
  const controller = createCookieConsent({
    policy: {
      measurementId: "G-TEST",
      origin,
    },
    jar,
    api,
    exclusive: async (f) => f(),
    now: () => 1000000,
  });
  return { controller, jar, api, calls, records };
}

it("uses actual adapter and BFF for accept/restore/withdraw/reaccept with original expiry", async () => {
  const e = environment();
  try {
    await e.controller.accept();
    const first = e.controller.getProof();
    expect(first).toMatch(/^granted\.v3\./);
    await e.controller.restore();
    expect(e.controller.getProof()).toBe(first);
    await e.controller.reject();
    expect(e.controller.isGranted()).toBe(false);
    expect(e.controller.isWithdrawalPending()).toBe(false);
    await e.controller.accept();
    expect(e.controller.isGranted()).toBe(true);
    expect(e.controller.getProof()).not.toBe(first);
    expect(e.calls).toContain("RESTORE");
    expect(e.calls.indexOf("WITHDRAW")).toBeLessThan(e.calls.lastIndexOf("ACCEPT"));
    expect([...e.records.values()].map((r) => r.expiresAt)).toEqual([expiry, expiry]);
  } finally {
    e.controller.dispose();
  }
});

it("withdraws while collection is OFF and unknown denied ACK creates no record", async () => {
  const e = environment();
  try {
    await e.controller.accept();
    vi.stubEnv("GA_ENABLED", "false");
    await e.controller.reject();
    expect(e.controller.isWithdrawalPending()).toBe(false);
    expect([...e.records.values()][0].revoked).toBe(true);
    await e.api.withdraw(`denied.v3.${"Z".repeat(42)}A`);
    expect(e.records.size).toBe(1);
  } finally {
    e.controller.dispose();
  }
});

it("does not convert server RESTORE 410 into new acceptance", async () => {
  const e = environment();
  try {
    e.jar.write(`granted.v3.${"Z".repeat(42)}A`, 60);
    e.jar.decide("accept.synthetic");
    await e.controller.restore();
    expect(e.controller.isGranted()).toBe(false);
    expect(e.calls).toEqual(["RESTORE"]);
    expect(e.records.size).toBe(0);
  } finally {
    e.controller.dispose();
  }
});
