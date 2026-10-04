import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { BookingPanel } from "./BookingPanel";

describe("BookingPanel", () => {
  it("groups the mobile summary in a bordered card with a compact heading", () => {
    renderWithIntl(
      <BookingPanel>
        <p>Activity summary content</p>
      </BookingPanel>,
    );
    const panel = screen.getByTestId("booking-panel");
    expect(panel).toHaveClass(
      "rounded-2xl",
      "border",
      "border-line-soft",
      "lg:sticky",
      "lg:top-24",
    );
    expect(panel).not.toHaveClass("max-lg:contents");
    expect(screen.getByRole("heading", { name: "Application summary" })).toHaveClass(
      "text-sm",
      "text-primary",
      "lg:hidden",
    );
    expect(panel).toContainElement(screen.getByText("Activity summary content"));
  });
});
