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
    window.history.replaceState(null, "", "/en/explore?source=home");
  });
  afterEach(() => window.history.replaceState(null, "", "/"));
  it("searches a KST day in the URL while retaining unrelated query parameters", () => {
    renderWithIntl(<ActivityDateFilter />);
    fireEvent.change(screen.getByLabelText("Participation date", { selector: "input" }), {
      target: { value: "2026-10-10" },
    });
    fireEvent.submit(screen.getByRole("form"));
    expect(push).toHaveBeenCalledWith("/explore?source=home&date=2026-10-10", { scroll: false });
  });
  it("shows the current date and clears it from the URL", () => {
    window.history.replaceState(null, "", "/en/explore?date=2026-10-10&source=home");
    renderWithIntl(<ActivityDateFilter date="2026-10-10" />);
    expect(screen.getByLabelText("Participation date", { selector: "input" })).toHaveValue(
      "2026-10-10",
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(push).toHaveBeenCalledWith("/explore?source=home", { scroll: false });
  });
  it("shows a recoverable localized error for an invalid URL date", () => {
    renderWithIntl(<ActivityDateFilter date="2026-02-30" />, { locale: "ko" });
    expect(screen.getByRole("alert")).toHaveTextContent("올바른 날짜");
    expect(screen.getByRole("button", { name: "초기화" })).toBeEnabled();
  });
});
