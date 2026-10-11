import { fireEvent, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { DiscountEndDateField } from "./DiscountEndDateField";

it("uses the custom calendar, blocks past days and selects a date without timezone conversion", () => {
  const onChange = vi.fn();
  renderWithQueryClient(
    <DiscountEndDateField value="" minDate="2026-10-11" onChange={onChange} />,
    { locale: "ko" },
  );
  const trigger = screen.getByRole("button", { name: /할인 종료일/ });
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByRole("button", { name: "2026-10-10" })).toBeDisabled();
  expect(within(dialog).getByRole("button", { name: "이전 달" })).toBeDisabled();
  fireEvent.click(within(dialog).getByRole("button", { name: "2026-10-12" }));
  expect(onChange).toHaveBeenCalledWith("2026-10-12");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it("opens on the selected month, supports month navigation and cancels without changing the value", () => {
  const onChange = vi.fn();
  renderWithQueryClient(
    <DiscountEndDateField value="2026-12-31" minDate="2026-10-11" onChange={onChange} />,
    { locale: "en" },
  );
  const trigger = screen.getByRole("button", { name: /Discount ends on/ });
  fireEvent.click(trigger);
  expect(screen.getByRole("button", { name: "2026-12-31" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  fireEvent.click(screen.getByRole("button", { name: "Next month" }));
  expect(screen.getByText("January 2027")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
  expect(onChange).not.toHaveBeenCalled();
  expect(trigger).toHaveFocus();
});

it("dismisses with native Escape cancellation and restores focus without changing the date", () => {
  const onChange = vi.fn();
  renderWithQueryClient(
    <DiscountEndDateField value="" minDate="2026-10-11" onChange={onChange} />,
    { locale: "en" },
  );
  const trigger = screen.getByRole("button", { name: /Discount ends on/ });
  fireEvent.click(trigger);
  fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(onChange).not.toHaveBeenCalled();
});

it("closes on a backdrop click but keeps clicks on dialog padding open", () => {
  const onChange = vi.fn();
  renderWithQueryClient(
    <DiscountEndDateField value="" minDate="2026-10-11" onChange={onChange} />,
    { locale: "en" },
  );
  const trigger = screen.getByRole("button", { name: /Discount ends on/ });
  fireEvent.click(trigger);
  const dialog = screen.getByRole("dialog");
  vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue({
    left: 100,
    right: 460,
    top: 100,
    bottom: 500,
  } as DOMRect);
  fireEvent.click(dialog, { clientX: 110, clientY: 110 });
  expect(dialog).toBeInTheDocument();
  fireEvent.click(dialog, { clientX: 50, clientY: 50 });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(onChange).not.toHaveBeenCalled();
});
