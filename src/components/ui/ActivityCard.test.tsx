import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Activity } from "@/types/activity";
import { renderWithIntl } from "@/test/render-with-intl";
import { ActivityCard } from "./ActivityCard";

const activity: Activity = {
  id: "1",
  title: "Market walk",
  description: "Explore a traditional market with a local buddy.",
  location: "Seoul",
  district: "Jongno-gu",
  imageUrl: "/images/landing/gwangjang-market.webp",
  heroImageUrl: "/images/landing/gwangjang-market.webp",
  price: 35000,
  rating: 4.8,
  host: { name: "Min Buddy", bio: "Local host", avatarUrl: null },
  included: [],
  restrictions: [],
  sessions: [],
  meetingPoint: { name: "Gwangjang Market", area: "Jongno-gu" },
};

describe("ActivityCard", () => {
  it("renders a photography-first card with title, buddy, place, and price", () => {
    renderWithIntl(<ActivityCard activity={activity} />);

    expect(screen.getByRole("heading", { name: "Market walk" })).toHaveClass("text-ink");
    expect(screen.getByText("Min Buddy · Seoul")).toHaveClass("text-muted");
    expect(screen.getByText("₩35,000 per person")).toHaveClass("text-ink");
    expect(screen.queryByText("Sold out")).not.toBeInTheDocument();
  });

  it("shows the struck original price, discounted price, and discount badge", () => {
    renderWithIntl(
      <ActivityCard
        activity={{ ...activity, price: 31500, originalPrice: 35000, discountPercent: 10 }}
      />,
    );

    const struckPrice = screen.getByText("₩35,000");
    expect(struckPrice.tagName).toBe("S");
    expect(screen.getByText("₩31,500 per person")).toHaveClass("text-primary-strong");
    expect(screen.getByText("10% off")).toBeInTheDocument();
  });

  it("marks sold-out activities and hides the discount badge", () => {
    renderWithIntl(
      <ActivityCard
        activity={{
          ...activity,
          price: 31500,
          originalPrice: 35000,
          discountPercent: 10,
          isSoldOut: true,
        }}
      />,
    );

    expect(screen.getByText("Sold out")).toBeInTheDocument();
    expect(screen.queryByText("10% off")).not.toBeInTheDocument();
  });

  it("loads the card image eagerly when requested", () => {
    renderWithIntl(<ActivityCard activity={activity} eagerImage />);

    expect(screen.getByRole("img", { name: "Market walk" })).toHaveAttribute("loading", "eager");
  });
});
