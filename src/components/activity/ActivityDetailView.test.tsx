import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import type { Activity } from "@/types/activity";
import en from "@/messages/en.json";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import zhHans from "@/messages/zh-Hans.json";
import zhHant from "@/messages/zh-Hant.json";

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
  it.each([
    ["ko", "무료", ko],
    ["en", "Free", en],
    ["ja", "無料", ja],
    ["zh-Hans", "免费", zhHans],
    ["zh-Hant", "免費", zhHant],
  ] as const)(
    "shows only a free label for a zero-priced referral in %s",
    (locale, label, messages) => {
      renderWithIntl(
        <ActivityDetailView
          activity={{
            ...activity,
            activityType: "REFERRAL",
            price: 0,
            referencePrice: 0,
            referenceCurrency: "USD",
          }}
          preview
          bottomBar="inline"
        />,
        { locale, messages },
      );
      const actions = screen.getByTestId("booking-bar-actions");
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByText(label)).toHaveClass(
        "font-display",
        "text-xl",
        "font-bold",
        "text-primary",
      );
      expect(actions.querySelectorAll("p")).toHaveLength(1);
      expect(actions).not.toHaveTextContent("₩0");
      expect(actions).not.toHaveTextContent("≈");
      expect(screen.getByText(label).parentElement).toHaveClass("md:pb-4", "md:text-right");
      expect(screen.getByText(label).parentElement).not.toHaveClass("md:w-60", "md:w-36");
      expect(actions.querySelector("button")).not.toHaveClass("md:min-w-44");
    },
  );
  it.each([
    ["ko", "10분", ko],
    ["en", "10 min", en],
    ["ja", "10 分", ja],
    ["zh-Hans", "10 分钟", zhHans],
    ["zh-Hant", "10 分鐘", zhHant],
  ] as const)("labels referral items with duration only in %s", (locale, label, messages) => {
    renderWithIntl(
      <ActivityDetailView
        activity={{
          ...activity,
          activityType: "REFERRAL",
          itinerary: [
            {
              id: "1",
              title: "Pottery workshop",
              description: "Make a ceramic cup",
              durationMinutes: 10,
              imageUrl: activity.imageUrl,
            },
          ],
        }}
        preview
        unoptimizedImages
      />,
      { locale, messages },
    );
    const item = screen.getByRole("heading", { name: "Pottery workshop" }).parentElement;
    expect(item?.querySelector("p")?.textContent).toBe(label);
  });
  it("keeps the step label for a standard activity", () => {
    renderWithIntl(
      <ActivityDetailView
        activity={{
          ...activity,
          itinerary: [
            {
              id: "1",
              title: "Meet the host",
              description: "Meet at the studio",
              durationMinutes: 10,
              imageUrl: activity.imageUrl,
            },
          ],
        }}
        preview
        unoptimizedImages
      />,
      { locale: "ko" },
    );
    expect(screen.getByText("1단계 · 10분")).toBeInTheDocument();
  });
  it.each([
    ["ko", "₩50,000~", ko],
    ["en", "₩50,000~", en],
    ["ja", "₩50,000~", ja],
    ["zh-Hans", "₩50,000~", zhHans],
    ["zh-Hant", "₩50,000~", zhHant],
  ] as const)(
    "shows localized referral starting prices with a naturally flexible date field in %s",
    (locale, label, messages) => {
      renderWithIntl(
        <ActivityDetailView
          activity={{ ...activity, activityType: "REFERRAL" }}
          preview
          bottomBar="inline"
          unoptimizedImages
        />,
        { locale, messages },
      );
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByText(label)).toHaveClass(
        "font-display",
        "text-xl",
        "font-bold",
        "text-primary",
      );
      expect(screen.getByText(messages.Explore.perPersonLabel)).toHaveClass(
        "text-xs",
        "md:basis-full",
        "md:text-right",
      );
      expect(screen.getByTestId("booking-bar-actions").querySelectorAll("p")).toHaveLength(2);
      expect(screen.getByText(label)).not.toHaveClass("md:ml-auto", "md:text-2xl");
      expect(screen.getByTestId("date-select-box")).toHaveClass("md:flex-1");
      expect(screen.getByTestId("date-select-box")).toHaveClass("h-12");
      expect(screen.getByTestId("date-select-box")).not.toHaveClass("md:max-w-[480px]");
    },
  );
  it("preserves the full flexible date selector for standard activities", () => {
    renderWithIntl(<ActivityDetailView activity={activity} preview bottomBar="inline" />);
    expect(screen.getByTestId("date-select-box")).toHaveClass("md:flex-1");
    expect(screen.getByTestId("date-select-box")).not.toHaveClass("md:max-w-[480px]");
    expect(screen.getByTestId("booking-bar-price").parentElement).toHaveClass("md:w-36");
    expect(screen.getByTestId("booking-bar-actions").querySelector("button")).toHaveClass(
      "md:min-w-44",
    );
  });
  it.each([true, false, undefined])("marks only actual translated content: %s", (isTranslated) => {
    renderWithIntl(
      <ActivityDetailView
        activity={{ ...activity, isTranslated }}
        bottomBar="inline"
        preview
        unoptimizedImages
      />,
    );
    if (isTranslated) expect(screen.getByText("Auto-translated")).toBeInTheDocument();
    else expect(screen.queryByText("Auto-translated")).not.toBeInTheDocument();
  });
  it.each([
    ["en", "Auto-translated", en],
    ["ko", "자동 번역됨", ko],
    ["ja", "自動翻訳済み", ja],
    ["zh-Hans", "已自动翻译", zhHans],
    ["zh-Hant", "已自動翻譯", zhHant],
  ] as const)(
    "places the translation notice before the location and title in %s",
    (locale, label, messages) => {
      renderWithIntl(
        <ActivityDetailView
          activity={{ ...activity, isTranslated: true }}
          preview
          bottomBar="inline"
          unoptimizedImages
        />,
        { locale, messages },
      );
      const notice = screen.getByText(label);
      const location = screen.getByText(activity.district, { exact: true });
      expect(
        notice.compareDocumentPosition(location) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        notice.compareDocumentPosition(screen.getByRole("heading", { level: 1 })) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(notice.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
      expect(notice.querySelector("svg rect")).not.toBeNull();
    },
  );
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
