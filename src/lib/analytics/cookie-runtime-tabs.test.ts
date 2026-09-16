import { afterEach, expect, it, vi } from "vitest";
import { createCookieRuntime } from "./cookie-runtime";
import { createGoogleBrowser } from "./browser";
vi.mock("./browser", () => ({
  createGoogleBrowser: vi.fn(() => ({
    start: vi.fn(async () => {}),
    send: vi.fn(),
    stop: vi.fn(),
    identifiers: vi.fn(async () => ({ clientId: "1.2", sessionId: "3" })),
  })),
}));
const policy = {
  measurementId: "G-TEST",
  origin: "https://example.test",
  version: "synthetic",
  consentMaxAgeMs: 60000,
  cookieMaxAgeSeconds: 60,
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
function environment() {
  let blocked = false;
  const cookies = new Map<string, string>();
  let tail = Promise.resolve();
  const document = {
    get cookie() {
      return [...cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    },
    set cookie(value: string) {
      if (blocked) return;
      const [entry] = value.split(";"),
        [key, ...rest] = entry.split("=");
      if (value.includes("Max-Age=0")) cookies.delete(key);
      else cookies.set(key, rest.join("="));
    },
  };
  const issue = vi.fn<typeof fetch>(async (path) => {
    if (String(path).includes("withdrawal"))
      return Response.json({ isSuccess: true, result: { withdrawalAcknowledged: true } });
    const now = Math.floor(Date.now() / 1000),
      existing = cookies.get("__Host-hb_ga_consent");
    return Response.json({
      isSuccess: true,
      result: {
        proof: existing?.startsWith("granted.")
          ? existing
          : `granted.v1.00000000-0000-4000-8000-000000000001.${now}.${now + 60}.synthetic.${"a".repeat(43)}`,
        expiresAt: new Date((now + 60) * 1000).toISOString(),
      },
    });
  });
  const target = {
    location: { origin: policy.origin },
    navigator: {
      locks: {
        request: (_name: string, work: () => Promise<unknown>) => {
          const next = tail.then(work);
          tail = next.then(
            () => {},
            () => {},
          );
          return next;
        },
      },
    },
    fetch: issue,
  } as unknown as Window;
  return {
    document: document as Document,
    target,
    issue,
    blockWrites: () => {
      blocked = true;
    },
  };
}
it("fails closed when cross-tab invalidation is unavailable", () => {
  vi.stubGlobal("BroadcastChannel", undefined);
  const e = environment(),
    r = createCookieRuntime(policy, e.target, e.document);
  expect(r.controller.enabled).toBe(false);
  r.dispose();
});
it("two tabs converge without RESTORE broadcast loops and stop on withdrawal", async () => {
  const channels = new Set<{ onmessage: ((e: { data: string }) => void) | null }>();
  let messages = 0;
  vi.stubGlobal(
    "BroadcastChannel",
    class {
      onmessage: ((e: { data: string }) => void) | null = null;
      constructor() {
        channels.add(this);
      }
      postMessage(data: string) {
        messages++;
        if (messages > 30) throw new Error("broadcast loop");
        for (const c of channels) if (c !== this) c.onmessage?.({ data });
      }
      close() {
        channels.delete(this);
      }
    },
  );
  const e = environment(),
    a = createCookieRuntime(policy, e.target, e.document),
    b = createCookieRuntime(policy, e.target, e.document);
  a.controller.visit("/en/explore");
  b.controller.visit("/en/explore");
  await a.controller.accept();
  await vi.waitFor(() => expect(b.controller.isActive()).toBe(true));
  expect(messages).toBeLessThan(5);
  expect(e.issue.mock.calls.length).toBeLessThan(5);
  await a.controller.reject();
  await vi.waitFor(() => expect(b.controller.isActive()).toBe(false));
  const second = vi.mocked(createGoogleBrowser).mock.results[1].value;
  expect(second.stop).toHaveBeenCalledWith(true);
  a.dispose();
  b.dispose();
});
it("unavailable channel construction cannot break the application", () => {
  vi.stubGlobal(
    "BroadcastChannel",
    class {
      constructor() {
        throw new Error("blocked");
      }
    },
  );
  const e = environment();
  const r = createCookieRuntime(policy, e.target, e.document);
  expect(r.controller.enabled).toBe(false);
  r.dispose();
});
it("withdraws another active tab even when all cookie writes silently fail", async () => {
  const channels = new Set<{ onmessage: ((e: { data: unknown }) => void) | null }>();
  vi.stubGlobal(
    "BroadcastChannel",
    class {
      onmessage: ((e: { data: unknown }) => void) | null = null;
      constructor() {
        channels.add(this);
      }
      postMessage(data: unknown) {
        for (const c of channels) if (c !== this) c.onmessage?.({ data });
      }
      close() {
        channels.delete(this);
      }
    },
  );
  const e = environment(),
    a = createCookieRuntime(policy, e.target, e.document),
    b = createCookieRuntime(policy, e.target, e.document);
  a.controller.visit("/en/activities/42");
  b.controller.visit("/en/activities/42");
  await a.controller.accept();
  await vi.waitFor(() => expect(b.controller.isActive()).toBe(true));
  e.blockWrites();
  await a.controller.reject();
  expect(b.controller.isActive()).toBe(false);
  expect(b.controller.track("booking_cta_click", "/en/activities/42", 42)).toBe(false);
  expect(vi.mocked(createGoogleBrowser).mock.results[1].value.stop).toHaveBeenCalledWith(true);
  a.dispose();
  b.dispose();
});
