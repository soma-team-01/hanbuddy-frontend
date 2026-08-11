import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { RatingDistribution } from "./RatingDistribution";

const counts = { "5": 243, "4": 48, "3": 13, "2": 6, "1": 0 };

describe("RatingDistribution", () => {
  it("lists every star level from five down to one", () => {
    renderWithIntl(
      <RatingDistribution counts={counts} selectedRating={null} onSelectRating={vi.fn()} />,
    );

    const rows = screen.getAllByRole("button");
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveTextContent("5");
    expect(rows[0]).toHaveTextContent("243");
    expect(rows[4]).toHaveTextContent("1");
  });

  it("selects a rating and clears it when the same row is pressed again", () => {
    const onSelectRating = vi.fn();
    const { rerender } = renderWithIntl(
      <RatingDistribution counts={counts} selectedRating={null} onSelectRating={onSelectRating} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Show only 5-star reviews/ }));
    expect(onSelectRating).toHaveBeenCalledWith(5);

    rerender(
      <RatingDistribution counts={counts} selectedRating={5} onSelectRating={onSelectRating} />,
    );
    const selectedRow = screen.getByRole("button", { name: /Show only 5-star reviews/ });
    expect(selectedRow).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(selectedRow);
    expect(onSelectRating).toHaveBeenLastCalledWith(null);
  });

  it("disables a star level that has no reviews", () => {
    renderWithIntl(
      <RatingDistribution counts={counts} selectedRating={null} onSelectRating={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: /Show only 1-star reviews/ })).toBeDisabled();
  });
});
