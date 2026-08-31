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
  it("renders the title and per-person price without the buddy name or location", () => {
    renderWithIntl(<ActivityCard activity={activity} />);

    expect(screen.getByRole("heading", { name: "Market walk" })).toHaveClass("text-ink");
    expect(screen.getByText("₩35,000")).toHaveClass("text-ink");
    expect(screen.getByText("per person")).toBeInTheDocument();
    expect(screen.queryByText("Min Buddy")).not.toBeInTheDocument();
    expect(screen.queryByText("Seoul")).not.toBeInTheDocument();
    expect(screen.queryByText("Sold out")).not.toBeInTheDocument();
  });

  it("shows the discount percent chip and the signature-colored discounted price", () => {
    renderWithIntl(
      <ActivityCard
        activity={{ ...activity, price: 31500, originalPrice: 35000, discountPercent: 10 }}
      />,
    );

    const struckPrice = screen.getByText("₩35,000");
    const discountedPrice = screen.getByText("₩31,500");
    expect(struckPrice.tagName).toBe("S");
    expect(screen.getByText("10% off")).toHaveClass("bg-primary");
    expect(discountedPrice).toHaveClass("text-primary");
    expect(
      struckPrice.compareDocumentPosition(discountedPrice) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("shows the locale currency returned by the activity API", () => {
    renderWithIntl(
      <ActivityCard
        activity={{
          ...activity,
          referencePrice: 32.5,
          referenceCurrency: "USD",
          referencePriceEstimated: true,
          referencePriceExchangeRateDate: "2026-08-31",
        }}
      />,
    );

    expect(screen.getByText("≈ $32.50")).toHaveClass("text-ink");
    expect(screen.getByText("Estimated · per person")).toBeInTheDocument();
    expect(screen.queryByText("₩35,000")).not.toBeInTheDocument();
  });

  it("replaces the discount chip with a sold-out chip when sold out", () => {
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

  it("omits the duration row when the API does not provide a duration", () => {
    renderWithIntl(<ActivityCard activity={activity} />);

    expect(screen.queryByText(/hour|min/)).not.toBeInTheDocument();
  });

  it.each([
    [30, "30min"],
    [45, "45min"],
    [60, "1 hour"],
    [90, "1.5 hours"],
    [150, "2.5 hours"],
  ])("formats a %i minute duration as %s", (durationMinutes, expected) => {
    renderWithIntl(<ActivityCard activity={{ ...activity, durationMinutes }} />);

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("localizes the duration and per-person label in Korean", () => {
    renderWithIntl(<ActivityCard activity={{ ...activity, durationMinutes: 90 }} />, {
      locale: "ko",
    });

    expect(screen.getByText("1.5시간")).toBeInTheDocument();
    expect(screen.getByText("1인당")).toBeInTheDocument();
  });

  it("shows the average rating alone, without the review count", () => {
    renderWithIntl(<ActivityCard activity={{ ...activity, rating: 4.8, reviewCount: 12 }} />);

    expect(screen.getByLabelText("Rated 4.8 out of 5")).toBeInTheDocument();
    expect(screen.getByText("4.8")).toBeInTheDocument();
    expect(screen.queryByText("(12)")).not.toBeInTheDocument();
  });

  it("names the rating for assistive technology as an image", () => {
    renderWithIntl(<ActivityCard activity={{ ...activity, rating: 4.8, reviewCount: 12 }} />);

    // 카드는 평균만 보여주므로 접근성 이름에도 후기 수를 넣지 않는다
    expect(screen.getByRole("img", { name: "Rated 4.8 out of 5" })).toBeInTheDocument();
    // 화면에 보이는 숫자는 중복 낭독되지 않도록 감춘다
    expect(screen.getByText("4.8")).toHaveAttribute("aria-hidden", "true");
  });

  it("hides the rating entirely when the activity has no reviews yet", () => {
    renderWithIntl(<ActivityCard activity={{ ...activity, rating: undefined, reviewCount: 0 }} />);

    expect(screen.queryByLabelText(/Rated/)).not.toBeInTheDocument();
  });

  it("loads the card image eagerly when requested", () => {
    renderWithIntl(<ActivityCard activity={activity} eagerImage />);

    expect(screen.getByRole("img", { name: "Market walk" })).toHaveAttribute("loading", "eager");
  });
});
