import { afterEach, expect, it, vi } from "vitest";
import { createGoogleBrowser } from "./browser";

const policy = {
  measurementId: "G-TEST123",
  origin: "http://localhost:3000",
  version: "synthetic",
  consentMaxAgeMs: 10000,
  cookieMaxAgeSeconds: 10,
};
const page = {
  page_location: "http://localhost:3000/activities/detail",
  page_referrer: "",
  page_title: "Activity",
};
afterEach(() => {
  document.head.querySelectorAll("[data-hanbuddy-analytics]").forEach((el) => el.remove());
  vi.unstubAllGlobals();
});
it("loads nothing on construction and sends only explicit safe fields after start", async () => {
  const queue: unknown[][] = [];
  const target = { location: { origin: policy.origin }, dataLayer: queue };
  const browser = createGoogleBrowser(target as unknown as Window, document);
  expect(document.querySelector("[data-hanbuddy-analytics]")).toBeNull();
  const loading = browser.start(policy, page);
  const script = document.querySelector("script[data-hanbuddy-analytics]") as HTMLScriptElement;
  expect(script.referrerPolicy).toBe("no-referrer");
  script.dispatchEvent(new Event("load"));
  await loading;
  browser.send("view_item", { ...page, items: [{ item_id: "42" }] });
  expect(Array.from(queue.find((entry) => entry[0] === "config")!)).toEqual([
    "config",
    "G-TEST123",
    {
      ...page,
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_expires: 10,
      cookie_update: false,
    },
  ]);
  expect(queue.filter((entry) => entry[0] === "event").map((entry) => Array.from(entry))).toEqual([
    ["event", "view_item", { ...page, items: [{ item_id: "42" }] }],
  ]);
  expect(
    Array.from(queue.find((entry) => entry[0] === "consent" && entry[1] === "update")!),
  ).toEqual([
    "consent",
    "update",
    {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    },
  ]);
});
it("cancels a pending load and never re-enables it from its late callback", async () => {
  const queue: unknown[][] = [];
  const target = { location: { origin: policy.origin }, dataLayer: queue };
  const browser = createGoogleBrowser(target as unknown as Window, document);
  const pending = browser.start(policy, page);
  const expectation = expect(pending).rejects.toThrow();
  const script = document.querySelector("script[data-hanbuddy-analytics]")!;
  browser.stop();
  script.dispatchEvent(new Event("load"));
  await expectation;
  browser.send("page_view", page);
  expect(
    queue.filter((entry) => entry[0] === "event").map((entry) => Array.from(entry)),
  ).toHaveLength(0);
  expect((target as Record<string, unknown>)["ga-disable-G-TEST123"]).toBe(true);
});
it("does not load on a different origin", async () => {
  const browser = createGoogleBrowser(
    { location: { origin: "https://unapproved.test" } } as Window,
    document,
  );
  await expect(browser.start(policy, page)).rejects.toThrow();
  expect(document.querySelector("[data-hanbuddy-analytics]")).toBeNull();
});
it("validates identifier callbacks and refuses identities after stop", async () => {
  const target = {
    location: { origin: policy.origin },
    dataLayer: [] as unknown[][],
    gtag: vi.fn((...args: unknown[]) => {
      if (args[0] === "get")
        (args[3] as (value: unknown) => void)(args[2] === "client_id" ? "123.456" : "789");
    }),
  };
  const browser = createGoogleBrowser(target as unknown as Window, document);
  const loading = browser.start(policy, page);
  document.querySelector("script[data-hanbuddy-analytics]")!.dispatchEvent(new Event("load"));
  await loading;
  await expect(browser.identifiers()).resolves.toEqual({ clientId: "123.456", sessionId: "789" });
  browser.stop();
  await expect(browser.identifiers()).rejects.toThrow();
});

it("uses the documented Arguments command queue and preserves cookies until explicit reset", async () => {
  const queue: ArrayLike<unknown>[] = [];
  const target = { location: { origin: policy.origin, hostname: "localhost" }, dataLayer: queue };
  const browser = createGoogleBrowser(target as unknown as Window, document);
  document.cookie = "_ga=synthetic-client; Path=/";
  document.cookie = "_ga_TEST123=synthetic-session; Path=/";
  const loading = browser.start(policy, page);
  expect(Object.prototype.toString.call(queue[0])).toBe("[object Arguments]");
  document.querySelector("script[data-hanbuddy-analytics]")!.dispatchEvent(new Event("load"));
  await loading;
  browser.stop();
  expect(document.cookie).toContain("_ga=synthetic-client");
  expect(document.cookie).toContain("_ga_TEST123=synthetic-session");
  browser.send("page_view", page);
  expect(queue.some((command) => command[0] === "event")).toBe(false);
  // Explicit reset is the withdrawal/expiry operation, distinct from pagehide.
  browser.stop(true);
  expect(document.cookie).not.toContain("_ga=");
  expect(document.cookie).not.toContain("_ga_TEST123=");
});

it("can clear expired identity on reload before any tag has been loaded", () => {
  document.cookie = "_ga=synthetic-client; Path=/";
  document.cookie = "_ga_TEST123=synthetic-session; Path=/";
  const browser = createGoogleBrowser(
    { location: { origin: policy.origin, hostname: "localhost" } } as Window,
    document,
    policy.measurementId,
  );
  browser.stop(true);
  expect(document.cookie).not.toContain("_ga=");
  expect(document.cookie).not.toContain("_ga_TEST123=");
  expect(document.querySelector("[data-hanbuddy-analytics]")).toBeNull();
});

it.each(["unset", "timeout"])(
  "fails closed when Google's identifier is %s without fabricating a session",
  async (mode) => {
    vi.useFakeTimers();
    try {
      const target = {
        location: { origin: policy.origin },
        gtag: vi.fn((...args: unknown[]) => {
          if (args[0] === "get" && mode === "unset")
            (args[3] as (value: unknown) => void)(undefined);
        }),
      };
      const browser = createGoogleBrowser(target as unknown as Window, document);
      const loading = browser.start(policy, page);
      document.querySelector("script[data-hanbuddy-analytics]")!.dispatchEvent(new Event("load"));
      await loading;
      const unavailable = expect(browser.identifiers()).rejects.toThrow("Analytics unavailable");
      await vi.advanceTimersByTimeAsync(3000);
      await unavailable;
      expect(target.gtag.mock.calls.some((command) => command[0] === "event")).toBe(false);
      browser.stop(true);
    } finally {
      vi.useRealTimers();
    }
  },
);
it("returns a real client identifier without inventing an unset optional session", async () => {
  const target = {
    location: { origin: policy.origin },
    gtag: vi.fn((...args: unknown[]) => {
      if (args[0] === "get")
        (args[3] as (v: unknown) => void)(args[2] === "client_id" ? "123.456" : undefined);
    }),
  };
  const browser = createGoogleBrowser(target as unknown as Window, document);
  const loading = browser.start(policy, page);
  document.querySelector("script[data-hanbuddy-analytics]")!.dispatchEvent(new Event("load"));
  await loading;
  await expect(browser.identifiers()).resolves.toEqual({ clientId: "123.456" });
  browser.stop();
});
