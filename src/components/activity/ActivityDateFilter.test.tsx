import { fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { ActivityDateFilter } from "./ActivityDateFilter";

const push = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/explore",
  useRouter: () => ({ push }),
}));

describe("public activity date filter", () => {
  beforeEach(() => {
    push.mockClear();
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
