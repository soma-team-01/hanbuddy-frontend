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
  it("renders a responsive marketplace card using the semantic surface tokens", () => {
    renderWithIntl(<ActivityCard activity={activity} />);

    expect(screen.getByRole("article")).toHaveClass(
      "rounded-2xl",
      "border-line-soft",
      "bg-panel",
    );
    expect(screen.getByRole("heading", { name: "Market walk" })).toHaveClass("text-ink");
    expect(screen.getByText("Seoul")).toHaveClass("text-muted");
  });
});
