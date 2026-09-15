import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AnalyticsProvider, AnalyticsSettings, useFunnelEvent } from "./AnalyticsProvider";
import { createAnalytics } from "@/lib/analytics/controller";
import { renderWithQueryClient } from "@/test/render-with-query-client";

let pathname = "/en/activities/42";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
function makeController() {
  const storage = new Map<string, string>();
  const browser = {
    start: vi.fn(async () => {}),
    send: vi.fn(),
    stop: vi.fn(),
    identifiers: async () => ({ clientId: "123.456", sessionId: "789" }),
  };
  const controller = createAnalytics({
    policy: {
      measurementId: "G-TEST",
      origin: "https://example.test",
      version: "synthetic",
      consentMaxAgeMs: 10000,
      cookieMaxAgeSeconds: 10,
    },
    browser,
    storage: {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => {
        storage.set(k, v);
      },
    },
    link: { grant: async () => {}, link: async () => {}, revoke: async () => {} },
  });
  return { controller, browser };
}
function Detail({ valid = true }: { valid?: boolean }) {
  const event = useFunnelEvent();
  return (
    <button
      onClick={() => {
        if (valid) event("booking_cta_click", 42);
      }}
    >
      Book
    </button>
  );
}
it("keeps navigation usable with no operational policy and no consent collection", () => {
  renderWithQueryClient(
    <AnalyticsProvider policy={null}>
      <AnalyticsSettings />
      <Detail />
    </AnalyticsProvider>,
  );
  expect(screen.getByRole("button", { name: "Book" })).toBeEnabled();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cookie settings" })).not.toBeInTheDocument();
});
it.each([
  ["en", "Sure", "No thanks", "Cookie settings"],
  ["ko", "좋아요", "괜찮아요", "쿠키 설정"],
] as const)(
  "supports %s grant, CTA, settings withdrawal and re-navigation",
  async (locale, accept, reject, settings) => {
    pathname = `/${locale}/activities/42`;
    const { controller, browser } = makeController();
    const ui = (
      <AnalyticsProvider policy={null} controller={controller}>
        <AnalyticsSettings />
        <Detail />
      </AnalyticsProvider>
    );
    const view = renderWithQueryClient(ui, { locale });
    fireEvent.click(screen.getByRole("button", { name: "Book" }));
    expect(browser.send).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: accept }));
    await waitFor(() => expect(browser.send).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Book" }));
    expect(browser.send.mock.calls.map((c) => c[0])).toEqual(["page_view", "booking_cta_click"]);
    fireEvent.click(screen.getByRole("button", { name: settings }));
    fireEvent.click(screen.getByRole("button", { name: reject }));
    await waitFor(() => expect(controller.getSnapshot()).toBe("denied"));
    fireEvent.click(screen.getByRole("button", { name: "Book" }));
    pathname = `/${locale}/explore`;
    view.rerender(
      <AnalyticsProvider policy={null} controller={controller}>
        <AnalyticsSettings />
        <Detail />
      </AnalyticsProvider>,
    );
    expect(browser.send).toHaveBeenCalledTimes(2);
    await act(async () => {
      window.dispatchEvent(new StorageEvent("storage", { key: "hanbuddy.gaConsent.v1" }));
    });
    expect(browser.send).toHaveBeenCalledTimes(2);
  },
);
it("discards the old local controller when operational policy is removed", async () => {
  pathname = "/en/explore";
  const policy = {
    measurementId: "G-TEST",
    origin: "https://example.test",
    version: "synthetic",
    consentMaxAgeMs: 10000,
    cookieMaxAgeSeconds: 10,
  };
  const link = {
    grant: vi.fn(async () => {}),
    link: vi.fn(async () => {}),
    revoke: vi.fn(async () => {}),
  };
  const view = renderWithQueryClient(
    <AnalyticsProvider policy={policy} link={link}>
      <AnalyticsSettings />
    </AnalyticsProvider>,
  );
  await screen.findByRole("button", { name: "Cookie settings" });
  view.rerender(
    <AnalyticsProvider policy={null} link={null}>
      <AnalyticsSettings />
    </AnalyticsProvider>,
  );
  expect(screen.queryByRole("button", { name: "Cookie settings" })).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
