import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { ActivityPriceTiers } from "./ActivityPriceTiers";

const tiers = [
  { minGuests: 2, maxGuests: 3, unitPrice: 35000 },
  { minGuests: 4, maxGuests: 5, unitPrice: 30000 },
  { minGuests: 6, maxGuests: null, unitPrice: 28000 },
];

describe("ActivityPriceTiers", () => {
  it("shows original prices struck out and discounted per-person prices in red", () => {
    renderWithIntl(<ActivityPriceTiers tiers={tiers} basePrice={40000} discountPercent={2} />);
    const section = screen.getByRole("region", { name: "Pricing" });
    const rows = within(section).getAllByRole("row").slice(1);
    for (const [i, price] of ["₩39,200", "₩34,300", "₩29,400", "₩27,440"].entries()) {
      expect(within(rows[i]).getByText(price)).toHaveClass("text-primary");
      expect(rows[i].querySelector("del")).not.toBeNull();
    }
    expect(section.querySelector("p")).toBeNull();
  });

  it("keeps undiscounted prices unchanged without a strike-through", () => {
    renderWithIntl(<ActivityPriceTiers tiers={tiers} basePrice={40000} />);
    expect(screen.getByText("₩35,000")).toBeInTheDocument();
    expect(screen.getByRole("table").querySelector("del")).toBeNull();
  });

  it("rounds positive KRW unit prices half-up like the backend", () => {
    renderWithIntl(
      <ActivityPriceTiers
        tiers={[{ minGuests: 2, maxGuests: null, unitPrice: 15025 }]}
        basePrice={20000}
        discountPercent={2}
      />,
    );
    expect(screen.getByText("₩14,725")).toHaveClass("text-primary");
  });
});
