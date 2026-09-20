import { expect, it, vi } from "vitest";
import { createMetaBrowser } from "./meta-browser";

const policy = {
  pixelId: "123456789012345",
  origin: "https://example.test",
};
const page = {
  page_location: "https://example.test/activities/detail",
  page_referrer: "" as const,
  page_title: "Activity",
};

it("is inert until start and maps only approved app events without Purchase", async () => {
  const appended: HTMLScriptElement[] = [];
  const delivered: unknown[][] = [];
  type PixelQueue = ((...args: unknown[]) => void) & {
    callMethod?: (...args: unknown[]) => void;
    loaded?: boolean;
    push?: (...args: unknown[]) => void;
    queue?: unknown[][];
  };
  const target = { location: { origin: policy.origin, search: "" } } as unknown as Window;
  const document = {
    cookie: "",
    createElement: () => ({ dataset: {}, remove: vi.fn() }) as unknown as HTMLScriptElement,
    head: {
      appendChild: (script: HTMLScriptElement) => {
        appended.push(script);
        const pixel = (target as Window & { fbq: PixelQueue }).fbq;
        pixel.callMethod = (...args) => delivered.push(args);
        pixel.queue?.forEach((args) => pixel.callMethod?.(...args));
        pixel.queue = [];
        script.onload?.(new Event("load"));
      },
    },
  } as unknown as Document;
  const browser = createMetaBrowser(target, document, policy.pixelId);

  expect(appended).toHaveLength(0);
  browser.send("page_view", page);
  expect((target as Window & { fbq?: unknown }).fbq).toBeUndefined();

  await browser.start(policy, page);
  browser.send("page_view", page);
  browser.send("view_item", { ...page, items: [{ item_id: "42" }] });
  browser.send("sign_up", { ...page, method: "google" });
  browser.send("inquiry_click", {
    ...page,
    channel: "email",
    placement: "landing_contact",
    locale: "en",
  });
  browser.send("begin_checkout", { ...page, items: [{ item_id: "42" }] });
  browser.send("select_item", {
    ...page,
    item_list_id: "explore_activities",
    item_list_name: "Explore activities",
    items: [{ item_id: "42", index: 1 }],
  });

  const pixel = (target as Window & { fbq: PixelQueue }).fbq;
  expect(pixel.loaded).toBe(true);
  expect(pixel.push).toBe(pixel);
  expect(delivered).toContainEqual(["track", "PageView"]);
  expect(delivered).toContainEqual([
    "track",
    "ViewContent",
    { content_ids: ["42"], content_type: "product" },
  ]);
  expect(delivered).toContainEqual(["track", "CompleteRegistration"]);
  expect(delivered).toContainEqual(["track", "Contact"]);
  expect(delivered).toContainEqual([
    "track",
    "InitiateCheckout",
    { content_ids: ["42"], content_type: "product" },
  ]);
  expect(delivered.flat()).not.toContain("Purchase");
  expect(delivered.flat()).not.toContain("select_item");
  expect(appended[0].src).toBe("https://connect.facebook.net/en_US/fbevents.js");
  expect(appended[0].referrerPolicy).toBe("no-referrer");
});

it("revokes queued Meta consent and clears only Meta cookies on withdrawal", async () => {
  const writes: string[] = [];
  const document = {
    get cookie() {
      return "_fbp=fb.1.1700000000000.123; _fbc=fb.1.1700000000000.click";
    },
    set cookie(value: string) {
      writes.push(value);
    },
    createElement: () => ({ dataset: {}, remove: vi.fn() }) as unknown as HTMLScriptElement,
    head: { appendChild: (script: HTMLScriptElement) => script.onload?.(new Event("load")) },
  } as unknown as Document;
  const target = {
    location: { origin: policy.origin, hostname: "example.test" },
  } as unknown as Window;
  const browser = createMetaBrowser(target, document, policy.pixelId);
  await browser.start(policy, page);

  browser.stop(true);

  const queue = (target as Window & { fbq: { queue: unknown[][] } }).fbq.queue;
  expect(queue).toContainEqual(["consent", "revoke"]);
  expect(writes.some((value) => value.startsWith("_fbp=;"))).toBe(true);
  expect(writes.some((value) => value.startsWith("_fbc=;"))).toBe(true);
  expect(writes.every((value) => !value.startsWith("_ga"))).toBe(true);
});

it.each(["/login", "/auth/google/callback", "/payments/success"])(
  "does not emit Meta events on sensitive route %s",
  async (path) => {
    const delivered: unknown[][] = [];
    type PixelQueue = ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[][];
    };
    const target = {
      location: { origin: policy.origin, hostname: "example.test" },
    } as unknown as Window;
    const document = {
      cookie: "",
      createElement: () => ({ dataset: {}, remove: vi.fn() }) as unknown as HTMLScriptElement,
      head: {
        appendChild: (script: HTMLScriptElement) => {
          const pixel = (target as Window & { fbq: PixelQueue }).fbq;
          pixel.callMethod = (...args) => delivered.push(args);
          pixel.queue?.forEach((args) => pixel.callMethod?.(...args));
          pixel.queue = [];
          script.onload?.(new Event("load"));
        },
      },
    } as unknown as Document;
    const browser = createMetaBrowser(target, document, policy.pixelId);
    await browser.start(policy, page);

    browser.send("page_view", { ...page, page_location: `${policy.origin}${path}` });

    expect(delivered.filter(([command]) => command === "track")).toEqual([]);
  },
);
