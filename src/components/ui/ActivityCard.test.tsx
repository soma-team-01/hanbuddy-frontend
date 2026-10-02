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
  it("renders the title, meeting place and per-person price without the buddy name", () => {
    renderWithIntl(<ActivityCard activity={activity} />);

    expect(screen.getByRole("heading", { name: "Market walk" })).toHaveClass("text-ink");
    expect(screen.getByText("₩35,000")).toHaveClass("text-ink");
    expect(screen.getByText("per person")).toBeInTheDocument();
    expect(screen.queryByText("Min Buddy")).not.toBeInTheDocument();
    expect(screen.getByText("Gwangjang Market")).toHaveClass("truncate");
    expect(screen.queryByText("Seoul")).not.toBeInTheDocument();
    expect(screen.queryByText("Sold out")).not.toBeInTheDocument();
  });

  it("omits the meeting place when the API does not provide one", () => {
    const { container } = renderWithIntl(
      <ActivityCard activity={{ ...activity, meetingPoint: { name: "", area: "" } }} />,
    );

    expect(container.querySelector('[data-slot="activity-card-location"]')).toBeNull();
  });

  it("orders the price group as KRW price, parenthesized reference price, then per person", () => {
    renderWithIntl(
      <ActivityCard activity={{ ...activity, referencePrice: 32.5, referenceCurrency: "USD" }} />,
    );

    const priceGroup = screen.getByText("₩35,000").parentElement;
    expect(priceGroup).toHaveClass("flex-wrap", "items-baseline");
    expect(priceGroup).toHaveTextContent(/^₩35,000\s*\(≈ \$32\.50\)\s*per person$/);
  });

  it("keeps a compact 16:9 photo at every width", () => {
    const { container } = renderWithIntl(<ActivityCard activity={activity} />);

    const frame = container.querySelector("img")?.parentElement;
    expect(frame).toHaveClass("aspect-[16/9]");
    expect(frame).not.toHaveClass("aspect-[3/2]");
  });

  it("describes the photo with the activity title so image search can read it", () => {
    renderWithIntl(<ActivityCard activity={activity} />);

    expect(screen.getByRole("img", { name: "Market walk" })).toBeInTheDocument();
  });

  it("puts the meeting place first and the duration after it on one line", () => {
    const { container } = renderWithIntl(
      <ActivityCard activity={{ ...activity, durationMinutes: 90 }} />,
    );

    const location = container.querySelector('[data-slot="activity-card-location"]');
    const duration = screen.getByText("1 hour 30min").parentElement;
    expect(location?.nextElementSibling).toBe(duration);
    expect(location?.parentElement).not.toHaveClass("flex-col", "flex-wrap");
    // 자리가 모자라면 장소만 줄어들고 소요시간은 끝까지 보인다
    expect(location).toHaveClass("min-w-0");
    expect(duration).toHaveClass("shrink-0", "whitespace-nowrap");
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

  it("keeps KRW as the main price and shows the locale currency as a reference", () => {
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

    const krwPrice = screen.getByText("₩35,000");
    const referencePrice = screen.getByText("(≈ $32.50)");
    expect(krwPrice).toHaveClass("text-ink");
    expect(referencePrice).toHaveClass("text-muted");
    expect(
      krwPrice.compareDocumentPosition(referencePrice) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("per person")).toBeInTheDocument();
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
    [0, "0min"],
    [5, "5min"],
    [29, "29min"],
    [30, "30min"],
    [31, "31min"],
    [60, "1 hour"],
    [80, "1 hour 20min"],
    [90, "1 hour 30min"],
    [150, "2 hours 30min"],
  ])("formats a %i minute duration as %s", (durationMinutes, expected) => {
    renderWithIntl(<ActivityCard activity={{ ...activity, durationMinutes }} />);

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("localizes the duration and per-person label in Korean", () => {
    renderWithIntl(<ActivityCard activity={{ ...activity, durationMinutes: 90 }} />, {
      locale: "ko",
    });

    expect(screen.getByText("1시간 30분")).toBeInTheDocument();
    expect(screen.getByText("1인당")).toBeInTheDocument();
  });

  it("shows the average rating with the review count as a chip on the photo", () => {
    const { container } = renderWithIntl(
      <ActivityCard activity={{ ...activity, rating: 4.8, reviewCount: 12 }} />,
    );

    const rating = screen.getByLabelText("Rated 4.8 out of 5 from 12 reviews");
    expect(screen.getByText("4.8")).toBeInTheDocument();
    expect(screen.getByText("(12)")).toBeInTheDocument();
    expect(rating.parentElement).toBe(container.querySelector("img")?.parentElement);
    expect(rating).toHaveClass("absolute", "bottom-3", "left-3", "rounded-full");
  });

  it("leaves the full title width to the title", () => {
    renderWithIntl(<ActivityCard activity={{ ...activity, rating: 4.8, reviewCount: 12 }} />);

    const heading = screen.getByRole("heading", { name: "Market walk" });
    expect(heading.parentElement?.querySelector('[role="img"]')).toBeNull();
  });

  it("keeps the price row free of the rating", () => {
    renderWithIntl(<ActivityCard activity={{ ...activity, rating: 4.8, reviewCount: 12 }} />);

    const priceRow = screen.getByText("₩35,000").parentElement?.parentElement;
    expect(priceRow?.querySelector('[role="img"]')).toBeNull();
  });

  it("names the rating for assistive technology as an image", () => {
    renderWithIntl(<ActivityCard activity={{ ...activity, rating: 4.8, reviewCount: 12 }} />);

    expect(
      screen.getByRole("img", { name: "Rated 4.8 out of 5 from 12 reviews" }),
    ).toBeInTheDocument();
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
