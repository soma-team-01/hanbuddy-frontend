import { expect, it, vi } from "vitest";
import { createMeasurementBrowser } from "./browser";

const origin = "https://example.test";
const page = {
  page_location: `${origin}/explore`,
  page_referrer: "" as const,
  page_title: "Explore",
};

function environment(failGoogle = false) {
  const scripts: HTMLScriptElement[] = [];
  const document = {
    cookie: "",
    createElement: () => ({ dataset: {}, remove: vi.fn() }) as unknown as HTMLScriptElement,
    head: {
      appendChild: (script: HTMLScriptElement) => {
        scripts.push(script);
        if (failGoogle && script.src.includes("googletagmanager"))
          script.onerror?.(new Event("error"));
        else script.onload?.(new Event("load"));
      },
    },
  } as unknown as Document;
  const target = {
    location: { origin, hostname: "example.test" },
  } as unknown as Window;
  return { target, document, scripts };
}

it("starts both configured providers and sends one explicit app PageView to each", async () => {
  const env = environment();
  const browser = createMeasurementBrowser(env.target, env.document, {
    measurementId: "G-TEST",
    pixelId: "123456789012345",
    origin,
  });
  expect(env.scripts).toHaveLength(0);

  await browser.start({ measurementId: "G-TEST", pixelId: "123456789012345", origin }, page);
  browser.send("page_view", page);

  expect(env.scripts.map((script) => script.src)).toEqual([
    "https://www.googletagmanager.com/gtag/js?id=G-TEST",
    "https://connect.facebook.net/en_US/fbevents.js",
  ]);
  const googleQueue = (env.target as Window & { dataLayer: IArguments[] }).dataLayer;
  expect([...googleQueue.at(-1)!]).toEqual(["event", "page_view", page]);
  const metaQueue = (env.target as Window & { fbq: { queue: unknown[][] } }).fbq.queue;
  expect(metaQueue).toContainEqual(["track", "PageView"]);
});

it("keeps Meta active when a configured Google script fails", async () => {
  const env = environment(true);
  const policy = { measurementId: "G-TEST", pixelId: "123456789012345", origin };
  const browser = createMeasurementBrowser(env.target, env.document, policy);

  await browser.start(policy, page);
  browser.send("page_view", page);

  const metaQueue = (env.target as Window & { fbq: { queue: unknown[][] } }).fbq.queue;
  expect(metaQueue).toContainEqual(["track", "PageView"]);
  const googleQueue = (env.target as Window & { dataLayer: IArguments[] }).dataLayer;
  expect([...googleQueue].some((entry) => [...entry][0] === "event")).toBe(false);
});

it.each([
  [{ measurementId: "G-TEST", origin }, "googletagmanager.com"],
  [{ pixelId: "123456789012345", origin }, "connect.facebook.net"],
] as const)("loads only the configured provider", async (policy, expectedHost) => {
  const env = environment();
  const browser = createMeasurementBrowser(env.target, env.document, policy);
  await browser.start(policy, page);
  expect(env.scripts).toHaveLength(1);
  expect(env.scripts[0].src).toContain(expectedHost);
});

it("reads allowlisted Meta cookies only after both providers are active and uses the sanitized page URL", async () => {
  const env = environment();
  env.document.cookie =
    "_fbp=fb.1.1720000000000.123456789; _fbc=fb.1.1720000000000.Click_123-X; private=drop";
  const policy = { measurementId: "G-TEST", pixelId: "123456789012345", origin };
  const browser = createMeasurementBrowser(env.target, env.document, policy);
  await browser.start(policy, page);
  (env.target as Window & { gtag: (...args: unknown[]) => void }).gtag = (...args) => {
    if (args[0] !== "get") return;
    const field = args[2];
    const callback = args[3] as (value: string) => void;
    callback(field === "client_id" ? "123.456" : "789");
  };

  await expect(browser.identifiers()).resolves.toEqual({
    clientId: "123.456",
    sessionId: "789",
    fbp: "fb.1.1720000000000.123456789",
    fbc: "fb.1.1720000000000.Click_123-X",
    eventSourceUrl: `${origin}/explore`,
  });
});

it("never reads Meta attribution for a GA-only policy and drops malformed Meta values", async () => {
  for (const policy of [
    { measurementId: "G-TEST", origin },
    { measurementId: "G-TEST", pixelId: "123456789012345", origin },
  ]) {
    const env = environment();
    env.document.cookie = "_fbp=fb.1.1720000000000.not-digits; _fbc=private@example.test";
    const browser = createMeasurementBrowser(env.target, env.document, policy);
    await browser.start(policy, page);
    (env.target as Window & { gtag: (...args: unknown[]) => void }).gtag = (...args) => {
      if (args[0] === "get")
        (args[3] as (value: string) => void)(args[2] === "client_id" ? "123.456" : "789");
    };
    await expect(browser.identifiers()).resolves.toEqual({
      clientId: "123.456",
      sessionId: "789",
    });
  }
});
