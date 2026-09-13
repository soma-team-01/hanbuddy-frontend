import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import type { Activity } from "@/types/activity";

vi.mock("@/components/activity/HostProfileDialog", () => ({
  HostProfileDialog: ({
    host,
    showHostedActivities,
    canContact,
  }: {
    host: { id?: number; name: string };
    showHostedActivities?: boolean;
    canContact?: boolean;
  }) => (
    <div
      data-testid="host-profile-dialog"
      data-host-id={host.id}
      data-show-hosted-activities={String(showHostedActivities)}
      data-can-contact={String(canContact)}
    >
      {host.name}
    </div>
  ),
}));

vi.mock("@/lib/google/places", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/google/places")>()),
  getGoogleMapsApiKey: () => "",
}));

import { ActivityDetailView } from "./ActivityDetailView";

const activity: Activity = {
  id: "preview",
  title: "Seoul market walk",
  description: "Explore a traditional market with a local buddy.",
  location: "Gwangjang Market",
  district: "Jongno-gu",
  imageUrl: "/images/activities/hanok-hero.jpg",
  heroImageUrl: "/images/activities/hanok-hero.jpg",
  price: 50000,
  host: {
    id: 17,
    name: "Seoul Buddy",
    bio: "Local HanBuddy host",
    avatarUrl: null,
  },
  included: [],
  restrictions: [],
  sessions: [],
  itinerary: [],
  meetingPoint: {
    name: "Gwangjang Market Gate 2",
    area: "Jongno-gu, Seoul",
  },
};

describe("ActivityDetailView", () => {
  it("keeps the guest host profile content visible while preview actions stay disabled", () => {
    renderWithIntl(
      <ActivityDetailView activity={activity} preview bottomBar="inline" unoptimizedImages />,
      { locale: "en" },
    );

    expect(screen.getByRole("button", { name: "Book now" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "View Seoul Buddy's profile" }));

    const hostProfile = screen.getByTestId("host-profile-dialog");
    expect(hostProfile).toHaveAttribute("data-host-id", "17");
    expect(hostProfile).toHaveAttribute("data-show-hosted-activities", "true");
    expect(hostProfile).toHaveAttribute("data-can-contact", "false");
  });

  it("stacks the fixed booking bar into two rows on mobile and keeps one row from sm up", () => {
    renderWithIntl(<ActivityDetailView activity={activity} unoptimizedImages />, { locale: "en" });

    const bar = screen.getByTestId("booking-bottom-bar");
    expect(bar).toHaveClass("fixed");
    const row = bar.firstElementChild as HTMLElement;
    expect(row).toHaveClass("flex-col", "md:flex-row");
    expect(screen.getByTestId("date-select-box")).toHaveClass("w-full", "md:flex-1");
    expect(screen.getByTestId("date-select-box")).not.toHaveClass("flex-1");
    // 가격과 버튼은 모바일에서 한 줄로 묶이고 md 이상에서는 래퍼가 사라져 기존 1행이 된다
    expect(screen.getByText("₩50,000").closest("[data-testid=booking-bar-actions]")).toHaveClass(
      "md:contents",
    );
    // 1인당 문구는 모바일에서 가격과 한 줄에 놓이고 길면 줄바꿈되며, 잘리지 않는다
    const priceRow = screen.getByTestId("booking-bar-price");
    expect(priceRow).toHaveClass("flex-wrap", "items-baseline");
    expect(priceRow).not.toHaveClass("whitespace-nowrap");
    expect(screen.getByText("per person").parentElement).toBe(priceRow);
  });

  it("marks the body and exposes the bar height while the fixed bar is mounted", () => {
    // jsdom은 스타일시트를 적용하지 않아 position이 static으로 계산되므로 브라우저 값을 흉내 낸다
    const computedStyle = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((element, pseudo) => {
      const style = computedStyle(element, pseudo);
      if ((element as HTMLElement).dataset?.testid === "booking-bottom-bar") {
        Object.defineProperty(style, "position", { value: "fixed", configurable: true });
      }
      return style;
    });
    const { unmount } = renderWithIntl(
      <ActivityDetailView activity={activity} unoptimizedImages />,
      { locale: "en" },
    );

    expect(document.body.dataset.fixedBar).toBe("true");
    unmount();
    expect(document.body.dataset.fixedBar).toBeUndefined();
    vi.restoreAllMocks();
  });

  it("does not mark the body for the inline preview bar", () => {
    renderWithIntl(
      <ActivityDetailView activity={activity} preview bottomBar="inline" unoptimizedImages />,
      { locale: "en" },
    );

    expect(screen.getByTestId("booking-bottom-bar")).not.toHaveClass("fixed");
    expect(document.body.dataset.fixedBar).toBeUndefined();
  });

  it("removes every booking control and fixed-bar side effect in read-only mode", () => {
    renderWithIntl(
      <ActivityDetailView activity={activity} showBookingBar={false} unoptimizedImages />,
      { locale: "en" },
    );

    expect(screen.queryByTestId("booking-bottom-bar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("date-select-box")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Book now" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Book now" })).not.toBeInTheDocument();
    expect(document.body.dataset.fixedBar).toBeUndefined();
  });

  it("fills the hero column on mobile and shows the photo count badge for extra photos", () => {
    renderWithIntl(
      <ActivityDetailView
        activity={{ ...activity, images: ["/a.jpg", "/b.jpg", "/c.jpg", "/d.jpg"] }}
        unoptimizedImages
      />,
      { locale: "en" },
    );

    const hero = screen.getByRole("button", { name: "View photo 1" });
    expect(hero).toHaveClass("md:row-span-2");
    expect(hero).not.toHaveClass("row-span-2");
    expect(hero.parentElement).toHaveClass("grid-cols-1", "md:grid-cols-[1.4fr_0.6fr]");
    expect(hero.parentElement).not.toHaveClass("grid-cols-2");
    expect(screen.getByTestId("mobile-photo-count")).toHaveTextContent("+3");
    expect(screen.getByTestId("mobile-photo-count")).toHaveClass("md:hidden");
  });

  it("hides the mobile photo count badge for a single photo", () => {
    renderWithIntl(<ActivityDetailView activity={activity} unoptimizedImages />, { locale: "en" });

    expect(screen.queryByTestId("mobile-photo-count")).not.toBeInTheDocument();
  });
});
