import { expect, it, vi } from "vitest";
import { createCookieAnalytics } from "./cookie-controller";
import { createCookieConsent } from "./cookie-consent";
const policy = {
  measurementId: "G-TEST",
  origin: "https://example.test",
  version: "v1",
  consentMaxAgeMs: 60000,
  cookieMaxAgeSeconds: 60,
};
function setup() {
  let cookie = "",
    choice = "";
  const proof = `granted.v1.00000000-0000-4000-8000-000000000001.1000.1060.v1.${"a".repeat(43)}`;
  const consent = createCookieConsent({
    policy,
    jar: {
      read: () => cookie,
      write: (v) => {
        cookie = v;
      },
      decision: () => choice,
      decide: (v) => {
        choice = v;
      },
    },
    api: {
      issue: async () => ({ proof, expiresAt: "1970-01-01T00:17:40Z" }),
      withdraw: async () => {},
    },
    exclusive: async (f) => f(),
    now: () => 1000000,
  });
  const browser = {
    start: vi.fn(async () => {}),
    send: vi.fn(),
    stop: vi.fn(),
    identifiers: vi.fn(async () => ({ clientId: "123.456", sessionId: "789" })),
  };
  const controller = createCookieAnalytics({ policy, consent, browser });
  return { controller, browser, consent };
}
it("keeps prelogin events and preapplication checkout independent of linkage", async () => {
  const { controller, browser } = setup();
  controller.visit("/en/activities/42");
  expect(controller.track("booking_cta_click", "/en/activities/42", 42)).toBe(false);
  await controller.accept();
  controller.track("view_item", "/en/activities/42", 42);
  controller.track("view_item", "/en/activities/42", 42);
  controller.track("booking_cta_click", "/en/activities/42", 42);
  controller.visit("/en/login");
  controller.track("begin_checkout", "/en/activities/42/book", 42);
  expect(browser.send.mock.calls.map((c) => c[0])).toEqual([
    "page_view",
    "view_item",
    "booking_cta_click",
    "page_view",
    "page_view",
    "begin_checkout",
  ]);
  expect(browser.identifiers).not.toHaveBeenCalled();
  await controller.reject();
  expect(controller.isActive()).toBe(false);
  expect(browser.stop).toHaveBeenLastCalledWith(true);
});
it("cancels a late tag load after withdrawal, and never records sensitive paths", async () => {
  const { controller, browser } = setup();
  let finish!: () => void;
  browser.start.mockImplementationOnce(
    () =>
      new Promise((r) => {
        finish = r;
      }),
  );
  controller.visit("/en/activities/42");
  const accepting = controller.accept();
  await vi.waitFor(() => expect(finish).toBeDefined());
  await controller.reject();
  finish();
  await accepting;
  controller.track("view_item", "/en/activities/42?paymentKey=synthetic", 42);
  expect(browser.send).not.toHaveBeenCalled();
});
it("suspends without deleting identity and restores without repeating a page view", async () => {
  const { controller, browser } = setup();
  controller.visit("/en/explore");
  await controller.accept();
  controller.suspend();
  expect(browser.stop).toHaveBeenLastCalledWith(false);
  await controller.restore();
  expect(browser.send).toHaveBeenCalledTimes(1);
});
