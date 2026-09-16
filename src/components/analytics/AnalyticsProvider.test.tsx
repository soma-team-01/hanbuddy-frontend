import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AnalyticsProvider, AnalyticsSettings, useFunnelEvent } from "./AnalyticsProvider";
import { createCookieAnalytics } from "@/lib/analytics/cookie-controller";
import { createCookieConsent } from "@/lib/analytics/cookie-consent";
import * as runtime from "@/lib/analytics/cookie-runtime";
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
  const policy = {
    measurementId: "G-TEST",
    origin: "https://example.test",
    version: "synthetic",
    consentMaxAgeMs: 10000,
    cookieMaxAgeSeconds: 10,
  };
  const consent = createCookieConsent({
    policy,
    jar: {
      read: () => storage.get("proof") ?? "",
      write: (v) => {
        storage.set("proof", v);
      },
      decision: () => storage.get("choice") ?? "",
      decide: (v) => {
        storage.set("choice", v);
      },
    },
    exclusive: async (f) => f(),
    api: {
      issue: async () => {
        const now = Math.floor(Date.now() / 1000);
        return {
          proof: `granted.v1.00000000-0000-4000-8000-000000000001.${now}.${now + 10}.synthetic.${"a".repeat(43)}`,
          expiresAt: new Date((now + 10) * 1000).toISOString(),
        };
      },
      withdraw: async () => {},
    },
  });
  const controller = createCookieAnalytics({ policy, consent, browser });
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
  const { controller } = makeController();
  const dispose = vi.fn();
  const factory = vi
    .spyOn(runtime, "createCookieRuntime")
    .mockReturnValue({ controller, dispose } as ReturnType<typeof runtime.createCookieRuntime>);
  const view = renderWithQueryClient(
    <AnalyticsProvider policy={policy}>
      <AnalyticsSettings />
    </AnalyticsProvider>,
  );
  await screen.findByRole("button", { name: "Cookie settings" });
  view.rerender(
    <AnalyticsProvider policy={null}>
      <AnalyticsSettings />
    </AnalyticsProvider>,
  );
  expect(screen.queryByRole("button", { name: "Cookie settings" })).not.toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(dispose).toHaveBeenCalled();
  factory.mockRestore();
});
it("shows incomplete withdrawal without claiming server completion", () => {
  const { controller } = makeController();
  vi.spyOn(controller, "isWithdrawalPending").mockReturnValue(true);
  renderWithQueryClient(
    <AnalyticsProvider policy={null} controller={controller}>
      <AnalyticsSettings />
    </AnalyticsProvider>,
  );
  expect(screen.getByRole("status")).toHaveTextContent("Withdrawal is pending");
});
