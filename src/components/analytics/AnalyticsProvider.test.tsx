import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { expect, it, vi } from "vitest";
import {
  AnalyticsProvider,
  AnalyticsSettings,
  useFunnelEvent,
  useMeasurementEvents,
} from "./AnalyticsProvider";
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
          proof: `granted.v3.${"A".repeat(43)}`,
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
function ExploreExposure() {
  const { trackList } = useMeasurementEvents();
  useEffect(() => {
    trackList([42], "42");
  }, [trackList]);
  return null;
}
function LandingExposure() {
  const { trackSection } = useMeasurementEvents();
  useEffect(() => {
    trackSection({ sectionId: "hero", position: 1, locale: "en" });
  }, [trackSection]);
  return null;
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
  [
    "en",
    "Analytics & advertising",
    "Allow analytics and advertising tools to measure site use and campaign results. We don’t send form answers or contact details. You can change this anytime in Cookie settings.",
    "Allow",
    "No thanks",
    "Cookie settings",
  ],
  [
    "ko",
    "분석 및 광고",
    "서비스 이용과 캠페인 성과 측정을 위해 분석·광고 도구를 사용합니다. 폼 답변과 연락처는 전송하지 않으며, 쿠키 설정에서 언제든 변경할 수 있습니다.",
    "허용",
    "거절",
    "쿠키 설정",
  ],
] as const)(
  "supports exact %s combined-consent copy, grant, withdrawal and re-navigation",
  async (locale, title, body, accept, reject, settings) => {
    pathname = `/${locale}/activities/42`;
    const { controller, browser } = makeController();
    const ui = (
      <AnalyticsProvider policy={null} controller={controller}>
        <AnalyticsSettings />
        <Detail />
      </AnalyticsProvider>
    );
    const view = renderWithQueryClient(ui, { locale });
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.getByText(body)).toBeInTheDocument();
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
  expect(screen.getByRole("status").tagName).toBe("OUTPUT");
  expect(screen.getByRole("status")).toHaveClass("block", "text-xs", "text-muted");
});

it.each([
  ["/en/explore", <ExploreExposure key="explore" />, "view_item_list"],
  ["/en", <LandingExposure key="landing" />, "section_view"],
] as const)(
  "replays a rendered %s exposure once when consent becomes active",
  async (route, exposure, eventName) => {
    pathname = route;
    const { controller, browser } = makeController();
    renderWithQueryClient(
      <AnalyticsProvider policy={null} controller={controller}>
        {exposure}
      </AnalyticsProvider>,
    );
    expect(browser.send).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Allow" }));

    await waitFor(() =>
      expect(browser.send.mock.calls.map(([name]) => name)).toEqual(["page_view", eventName]),
    );
    expect(browser.send.mock.calls.filter(([name]) => name === eventName)).toHaveLength(1);
  },
);
