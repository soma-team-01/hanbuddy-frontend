import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { ActivityDateFilter } from "./ActivityDateFilter";

const { trackLandingCta } = vi.hoisted(() => ({ trackLandingCta: vi.fn() }));
vi.mock("@/components/analytics/AnalyticsProvider", () => ({
  useMeasurementEvents: () => ({ trackLandingCta }),
}));
const push = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/explore",
  useRouter: () => ({ push }),
}));

describe("public activity date filter", () => {
  beforeEach(() => {
    push.mockClear();
    trackLandingCta.mockClear();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-30T12:00:00+09:00"));
    window.history.replaceState(null, "", "/en/explore?source=home");
  });
  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState(null, "", "/");
  });
  it("searches a KST day in the URL while retaining unrelated query parameters", () => {
    renderWithIntl(<ActivityDateFilter />);
    fireEvent.click(screen.getByRole("button", { name: /Participation date/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    fireEvent.click(screen.getByRole("button", { name: "Saturday, October 10, 2026" }));
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(push).toHaveBeenCalledWith("/explore?source=home&date=2026-10-10", { scroll: false });
    expect(trackLandingCta).not.toHaveBeenCalled();
  });
  it("uses a single-line placeholder without a visible field heading", () => {
    renderWithIntl(<ActivityDateFilter />, { locale: "ko" });
    expect(screen.getByRole("button", { name: /참여 날짜/ })).toHaveTextContent(
      /^언제 참여하시나요\?$/,
    );
    expect(screen.queryByText("참여 날짜", { exact: true })).not.toBeInTheDocument();
  });
  it("sends a home search to explore with the selected date and resets page scroll", () => {
    window.history.replaceState(null, "", "/en?utm_source=landing");
    renderWithIntl(<ActivityDateFilter destination="/explore" />);
    fireEvent.click(screen.getByRole("button", { name: /Participation date/ }));
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    fireEvent.click(screen.getByRole("button", { name: "Saturday, October 10, 2026" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(push).toHaveBeenCalledWith("/explore?date=2026-10-10", { scroll: true });
    expect(trackLandingCta).toHaveBeenCalledExactlyOnceWith({
      ctaId: "hero_explore",
      sectionId: "hero",
      position: 1,
      destinationType: "explore",
      locale: "en",
    });
  });
  it("keeps home clear and search local until a selected day is explicitly applied", () => {
    window.history.replaceState(null, "", "/en");
    renderWithIntl(<ActivityDateFilter date="2026-10-10" destination="/explore" />);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Participation date/ })).toHaveTextContent(
      "When would you like to join?",
    );
    fireEvent.click(screen.getByRole("button", { name: "Sunday, October 11, 2026" }));
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(push).toHaveBeenCalledWith("/explore?date=2026-10-11", { scroll: true });
  });
  it("focuses the floating calendar and returns focus without scrolling the page", () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    try {
      renderWithIntl(<ActivityDateFilter />);
      const trigger = screen.getByRole("button", { name: /Participation date/ });
      fireEvent.click(trigger);
      expect(screen.getByRole("dialog").parentElement).toBe(document.body);
      expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
      fireEvent.keyDown(document, { key: "Escape" });
      expect(trigger).toHaveFocus();
      expect(focus).toHaveBeenLastCalledWith({ preventScroll: true });
    } finally {
      focus.mockRestore();
    }
  });
  it("shows the current date and clears it from the URL", () => {
    window.history.replaceState(null, "", "/en/explore?date=2026-10-10&source=home");
    renderWithIntl(<ActivityDateFilter date="2026-10-10" />);
    expect(screen.getByRole("button", { name: /Participation date/ })).toHaveTextContent("Oct 10");
    fireEvent.click(screen.getByRole("button", { name: /Participation date/ }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(push).toHaveBeenCalledWith("/explore?source=home", { scroll: false });
  });
  it("shows a recoverable localized error for an invalid URL date", () => {
    renderWithIntl(<ActivityDateFilter date="2026-02-30" />, { locale: "ko" });
    expect(screen.getByRole("alert")).toHaveTextContent("올바른 날짜");
    fireEvent.click(screen.getByRole("button", { name: /참여 날짜/ }));
    expect(screen.getByRole("button", { name: "초기화" })).toBeEnabled();
  });
  it("discards a draft date on Escape and restores trigger focus", () => {
    renderWithIntl(<ActivityDateFilter date="2026-10-10" />);
    const trigger = screen.getByRole("button", { name: /Participation date/ });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Sunday, October 11, 2026" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: "Saturday, October 10, 2026" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
  it("supports keyboard day navigation and outside dismissal", () => {
    renderWithIntl(<ActivityDateFilter date="2026-10-10" />);
    fireEvent.click(screen.getByRole("button", { name: /Participation date/ }));
    const day = screen.getByRole("button", { name: "Saturday, October 10, 2026" });
    day.focus();
    fireEvent.keyDown(day, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "Sunday, October 11, 2026" })).toHaveFocus();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
