import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Activity } from "@/types/activity";
import { renderWithIntl } from "@/test/render-with-intl";
import { ActivityCard } from "./ActivityCard";
import en from "@/messages/en.json";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import zhHans from "@/messages/zh-Hans.json";
import zhHant from "@/messages/zh-Hant.json";

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

const VARIANTS = ["tile", "row"] as const;

describe.each(VARIANTS)("ActivityCard (%s)", (variant) => {
  it("places the muted location directly below the title and before the duration", () => {
    renderWithIntl(
      <ActivityCard activity={{ ...activity, durationMinutes: 90 }} variant={variant} />,
    );
    const title = screen.getByRole("heading", { name: activity.title });
    const location = screen.getByText("Gwangjang Market");
    expect(title.nextElementSibling).toBe(location);
    expect(location).toHaveClass("text-sm", "text-muted");
    expect(location).not.toHaveClass("uppercase", "tracking-wide");
    expect(
      location.compareDocumentPosition(screen.getByText("1 hour 30min")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders the title, meeting place and per-person price without the buddy name", () => {
    renderWithIntl(<ActivityCard activity={activity} variant={variant} />);

    expect(screen.getByRole("heading", { name: "Market walk" })).toHaveClass("text-ink");
    expect(screen.getByText("₩35,000")).toHaveClass("text-ink");
    expect(screen.getByText("per person")).toBeInTheDocument();
    expect(screen.queryByText("Min Buddy")).not.toBeInTheDocument();
    expect(screen.getByText("Gwangjang Market")).toHaveClass("truncate");
    expect(screen.queryByText("Seoul")).not.toBeInTheDocument();
    expect(screen.queryByText("Sold out")).not.toBeInTheDocument();
  });

  it("keeps language metadata out of discovery cards", () => {
    renderWithIntl(
      <ActivityCard
        activity={{ ...activity, availableLanguages: ["KO", "EN"] }}
        variant={variant}
      />,
    );
    expect(screen.queryByText(/Korean|English|Activity languages/)).not.toBeInTheDocument();
  });

  it("omits the meeting place when the API does not provide one", () => {
    const { container } = renderWithIntl(
      <ActivityCard
        activity={{ ...activity, meetingPoint: { name: "", area: "" } }}
        variant={variant}
      />,
    );

    expect(container.querySelector('[data-slot="activity-card-location"]')).toBeNull();
  });

  it("uses a square photo described by the activity title", () => {
    const { container } = renderWithIntl(<ActivityCard activity={activity} variant={variant} />);

    expect(screen.getByRole("img", { name: "Market walk" })).toBeInTheDocument();
    expect(container.querySelector("img")?.parentElement).toHaveClass("aspect-square");
  });

  it("orders the price group as KRW price, parenthesized reference price, then per person", () => {
    renderWithIntl(
      <ActivityCard
        activity={{ ...activity, referencePrice: 32.5, referenceCurrency: "USD" }}
        variant={variant}
      />,
    );

    const priceGroup = screen.getByText("₩35,000").parentElement;
    expect(priceGroup).toHaveClass("flex-wrap", "items-baseline");
    expect(priceGroup).toHaveTextContent(/^₩35,000\s*\(≈ \$32\.50\)\s*per person$/);
    expect(screen.getByText("(≈ $32.50)")).toHaveClass("text-muted");
  });

  it("shows the discount percent chip and the signature-colored discounted price", () => {
    renderWithIntl(
      <ActivityCard
        activity={{ ...activity, price: 31500, originalPrice: 35000, discountPercent: 10 }}
        variant={variant}
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
        variant={variant}
      />,
    );

    expect(screen.getByText("Sold out")).toBeInTheDocument();
    expect(screen.queryByText("10% off")).not.toBeInTheDocument();
  });

  it("shows the rating with the review count in the text area, not on the photo", () => {
    const { container } = renderWithIntl(
      <ActivityCard activity={{ ...activity, rating: 4.8, reviewCount: 12 }} variant={variant} />,
    );

    const rating = screen.getByRole("img", { name: "Rated 4.8 out of 5 from 12 reviews" });
    expect(screen.getByText("(12)")).toBeInTheDocument();
    expect(container.querySelector("img")?.parentElement?.contains(rating)).toBe(false);
  });

  it("hides the rating entirely when the activity has no reviews yet", () => {
    renderWithIntl(
      <ActivityCard
        activity={{ ...activity, rating: undefined, reviewCount: 0 }}
        variant={variant}
      />,
    );

    expect(screen.queryByLabelText(/Rated/)).not.toBeInTheDocument();
  });

  it("omits the duration when the API does not provide one", () => {
    renderWithIntl(<ActivityCard activity={activity} variant={variant} />);

    expect(screen.queryByText(/hour|min/)).not.toBeInTheDocument();
  });

  it("localizes the duration and per-person label in Korean", () => {
    renderWithIntl(
      <ActivityCard activity={{ ...activity, durationMinutes: 90 }} variant={variant} />,
      { locale: "ko" },
    );

    expect(screen.getByText("1시간 30분")).toBeInTheDocument();
    expect(screen.getByText("1인당")).toBeInTheDocument();
  });

  it("keeps the referral starting price, reference price and per-person label", () => {
    renderWithIntl(
      <ActivityCard
        activity={{
          ...activity,
          activityType: "REFERRAL",
          price: 5000,
          referencePrice: 3.5,
          referenceCurrency: "USD",
        }}
        variant={variant}
      />,
    );

    expect(screen.getByText("₩5,000~")).toHaveClass("font-display", "font-bold", "text-ink");
    expect(screen.getByText("(≈ $3.50~)")).toBeInTheDocument();
    expect(screen.queryByText("No payment when applying")).not.toBeInTheDocument();
    expect(screen.getByText("per person")).toHaveClass("text-xs", "text-muted");
  });

  it.each([
    ["ko", "무료", ko],
    ["en", "Free", en],
    ["ja", "無料", ja],
    ["zh-Hans", "免费", zhHans],
    ["zh-Hant", "免費", zhHant],
  ] as const)(
    "shows only the free price for a zero-priced referral in %s",
    (locale, label, messages) => {
      renderWithIntl(
        <ActivityCard
          activity={{
            ...activity,
            activityType: "REFERRAL",
            price: 0,
            referencePrice: 0,
            referenceCurrency: "USD",
          }}
          variant={variant}
        />,
        { locale, messages },
      );
      expect(screen.getByText(label)).toHaveClass("font-display", "font-bold", "text-ink");
      expect(screen.queryByText(/₩|\$|≈/)).not.toBeInTheDocument();
      expect(screen.queryByText(messages.Explore.perPersonLabel)).not.toBeInTheDocument();
    },
  );

  it("loads the card image eagerly when requested", () => {
    renderWithIntl(<ActivityCard activity={activity} variant={variant} eagerImage />);

    expect(screen.getByRole("img", { name: "Market walk" })).toHaveAttribute("loading", "eager");
  });
});

describe("ActivityCard tile (Airbnb-style)", () => {
  it("stacks a borderless rounded photo above the text", () => {
    const { container } = renderWithIntl(<ActivityCard activity={activity} variant="tile" />);

    const card = container.querySelector("article");
    expect(card).toHaveClass("flex-col");
    expect(card).not.toHaveClass("border");
    expect(container.querySelector("img")?.parentElement).toHaveClass("rounded-2xl");
  });

  it("gives the meeting place its own line, then the duration with the rating", () => {
    const { container } = renderWithIntl(
      <ActivityCard
        activity={{ ...activity, durationMinutes: 90, rating: 4.8, reviewCount: 12 }}
        variant="tile"
      />,
    );

    const location = container.querySelector('[data-slot="activity-card-location"]')!;
    const duration = screen.getByText("1 hour 30min");
    const rating = screen.getByRole("img", { name: "Rated 4.8 out of 5 from 12 reviews" });
    // 좁은 타일에서도 장소가 잘리지 않도록 한 줄을 통째로 쓴다
    expect(location).toHaveClass("truncate");
    expect(location.contains(duration)).toBe(false);
    expect(duration.parentElement).toBe(rating.parentElement);
    expect(duration).toHaveClass("shrink-0", "whitespace-nowrap");
    expect(
      location.compareDocumentPosition(duration) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("uses a compact price so the per-person line fits a narrow tile", () => {
    renderWithIntl(<ActivityCard activity={activity} variant="tile" />);

    expect(screen.getByText("₩35,000")).toHaveClass("text-base");
  });

  it("does not show the description", () => {
    renderWithIntl(<ActivityCard activity={activity} variant="tile" />);

    expect(screen.queryByText(activity.description)).not.toBeInTheDocument();
  });
});

describe("ActivityCard row (GetYourGuide-style)", () => {
  it("places the thumbnail beside the text", () => {
    const { container } = renderWithIntl(<ActivityCard activity={activity} variant="row" />);

    const card = container.querySelector("article");
    expect(card).not.toHaveClass("flex-col");
    expect(container.querySelector("img")?.parentElement).toHaveClass("shrink-0");
  });

  it("orders the title, meeting place and duration from top to bottom", () => {
    const { container } = renderWithIntl(
      <ActivityCard activity={{ ...activity, durationMinutes: 90 }} variant="row" />,
    );

    const location = container.querySelector('[data-slot="activity-card-location"]')!;
    const title = screen.getByRole("heading", { name: "Market walk" });
    const duration = screen.getByText("1 hour 30min");
    expect(location).toHaveClass("text-sm", "text-muted");
    expect(title.compareDocumentPosition(location) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      location.compareDocumentPosition(duration) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("puts the rating at the bottom left and the price at the bottom right", () => {
    renderWithIntl(
      <ActivityCard activity={{ ...activity, rating: 4.8, reviewCount: 12 }} variant="row" />,
    );

    const rating = screen.getByRole("img", { name: "Rated 4.8 out of 5 from 12 reviews" });
    const priceGroup = screen.getByText("₩35,000").parentElement!;
    expect(rating.parentElement).toBe(priceGroup.parentElement);
    expect(rating.parentElement).toHaveClass("justify-between");
    expect(priceGroup).toHaveClass("ml-auto", "justify-end");
  });

  it("keeps the price on the right even without reviews", () => {
    renderWithIntl(<ActivityCard activity={{ ...activity, rating: undefined }} variant="row" />);

    expect(screen.getByText("₩35,000").parentElement).toHaveClass("ml-auto");
  });

  it("shows a two-line description only from the tablet width up", () => {
    renderWithIntl(<ActivityCard activity={activity} variant="row" />);

    expect(screen.getByText(activity.description)).toHaveClass("hidden", "md:line-clamp-2");
  });

  it("uses the regular price size", () => {
    renderWithIntl(<ActivityCard activity={activity} variant="row" />);

    expect(screen.getByText("₩35,000")).toHaveClass("text-lg");
  });
});

describe("ActivityCard duration formatting", () => {
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
    renderWithIntl(<ActivityCard activity={{ ...activity, durationMinutes }} variant="tile" />);

    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
