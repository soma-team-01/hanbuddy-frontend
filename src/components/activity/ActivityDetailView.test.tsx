import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithQueryClient as renderWithIntl } from "@/test/render-with-query-client";
import type { Activity } from "@/types/activity";
import en from "@/messages/en.json";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import zhHans from "@/messages/zh-Hans.json";
import zhHant from "@/messages/zh-Hant.json";
import { getIntlLocale } from "@/i18n/routing";

vi.mock("@/lib/api/activities", async (original) => ({
  ...(await original<typeof import("@/lib/api/activities")>()),
  getActivityPriceQuote: vi.fn(() => new Promise(() => {})),
}));

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
    ["zh-Hans", zhHans],
    ["zh-Hant", zhHant],
  ] as const)(
    "uses the mapped Intl locale for the compact mobile date in %s",
    (locale, messages) => {
      const start = new Date("2099-10-15T08:30:00+09:00");
      const formatter = new Intl.DateTimeFormat(getIntlLocale(locale), {
        timeZone: "Asia/Seoul",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      const expected = formatter.formatRange(start, new Date(start.getTime() + 5 * 60_000));
      const OriginalDateTimeFormat = Intl.DateTimeFormat;
      const spy = vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function (locales, options) {
        return new OriginalDateTimeFormat(locales, options);
      });
      try {
        renderWithIntl(
          <ActivityDetailView
            activity={{
              ...activity,
              durationMinutes: 5,
              sessions: [
                {
                  id: "future",
                  startAt: start.toISOString(),
                  dateKey: "2099-10-15",
                  dateLabel: "10/15",
                  timeLabel: "8:30",
                  spotsLeft: 3,
                },
              ],
            }}
            preview
          />,
          { locale, messages },
        );
        fireEvent.click(screen.getByTestId("date-select-box"));
        fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /8:30/ }));
        expect(
          within(screen.getByTestId("date-select-box")).getByText(expected, { exact: true }),
        ).toHaveClass("md:hidden");
        const compactCalls = spy.mock.calls.filter(
          ([, options]) => options?.month === "numeric" && options?.minute === "2-digit",
        );
        expect(compactCalls.length).toBeGreaterThan(0);
        expect(compactCalls.every(([value]) => value === getIntlLocale(locale))).toBe(true);
      } finally {
        spy.mockRestore();
      }
    },
  );
  it.each([
    ["en", en],
    ["ko", ko],
  ] as const)(
    "keeps the title and host summary free of redundant labels in %s",
    (locale, messages) => {
      renderWithIntl(<ActivityDetailView activity={activity} preview />, { locale, messages });
      const titleSection = screen.getByRole("heading", { level: 1 }).closest("section")!;
      expect(within(titleSection).queryByText(activity.district)).not.toBeInTheDocument();
      const infoSection = screen
        .getByRole("heading", { level: 3, name: activity.meetingPoint.name })
        .closest("section")!;
      const hostCard = within(infoSection).getByRole("button", { name: activity.host.name });
      expect(
        within(hostCard).getByRole("heading", { level: 3, name: activity.host.name }),
      ).toBeInTheDocument();
      expect(hostCard).toHaveTextContent(activity.host.name);
      expect(within(hostCard).queryByText(activity.host.bio)).not.toBeInTheDocument();
      expect(
        screen.getByRole("heading", { level: 3, name: activity.meetingPoint.name }),
      ).toBeInTheDocument();
    },
  );
  it.each([
    ["en", en],
    ["ko", ko],
  ] as const)(
    "shows pricing as an expanded body section in %s, independent of the booking bar",
    (locale, messages) => {
      renderWithIntl(
        <ActivityDetailView
          activity={{
            ...activity,
            price: 36000,
            originalPrice: 40000,
            discountPercent: 10,
            priceTiers: [
              { minGuests: 6, maxGuests: null, unitPrice: 28000 },
              { minGuests: 2, maxGuests: 3, unitPrice: 35000 },
            ],
          }}
          preview
          showBookingBar={false}
        />,
        { locale, messages },
      );
      const section = screen.getByRole("region", { name: messages.QuantityPricing.pricingTitle });
      expect(section.closest("article")).not.toBeNull();
      expect(section.querySelector("details")).toBeNull();
      const rows = within(section).getAllByRole("row");
      expect(rows).toHaveLength(4);
      expect(rows[1]).toHaveTextContent("40,000");
      expect(rows[2]).toHaveTextContent("35,000");
      expect(rows[3]).toHaveTextContent("28,000");
      expect(within(rows[1]).getByText("₩36,000")).toHaveClass("text-primary");
      expect(screen.getByRole("heading", { level: 1 }).closest("section")).not.toContainElement(
        section,
      );
    },
  );

  it.each([
    activity,
    { ...activity, priceTiers: [] },
    { ...activity, price: 40000, originalPrice: 50000, discountPercent: 20 },
    {
      ...activity,
      activityType: "REFERRAL" as const,
      priceTiers: [{ minGuests: 2, maxGuests: null, unitPrice: 30000 }],
    },
  ])("omits the pricing section without tiers or for referrals", (example) => {
    renderWithIntl(<ActivityDetailView activity={example} preview />);
    expect(
      screen.queryByRole("region", { name: en.QuantityPricing.pricingTitle }),
    ).not.toBeInTheDocument();
  });
  it("uses compact borderless information rows only on mobile", () => {
    renderWithIntl(
      <ActivityDetailView
        activity={{ ...activity, availableLanguages: ["EN"], durationMinutes: 60 }}
        preview
      />,
    );
    const heading = screen.getByRole("heading", { name: "Hosted in" });
    const section = heading.closest("section");
    expect(section?.children).toHaveLength(4);
    for (const row of Array.from(section?.children ?? [])) {
      expect(row).toHaveClass(
        "max-md:border-0",
        "max-md:rounded-none",
        "max-md:px-0",
        "max-md:py-1.5",
      );
      expect(row).toHaveClass("rounded-2xl", "border", "p-5");
      expect(row.querySelector("h3")).toHaveClass("max-md:text-[13px]");
    }
  });
  it.each([
    ["en", "Hosted in", "Korean · English", en],
    ["ko", "제공 언어", "한국어 · 영어", ko],
  ] as const)(
    "shows languages in the detail information cards in %s",
    (locale, title, labels, messages) => {
      renderWithIntl(
        <ActivityDetailView activity={{ ...activity, availableLanguages: ["KO", "EN"] }} preview />,
        { locale, messages },
      );
      const heading = screen.getByRole("heading", { name: title });
      const card = heading.closest("[data-slot='activity-languages']");
      expect(card).toHaveTextContent(labels);
      expect(card?.querySelector("svg")).toBeInTheDocument();
      expect(card?.parentElement).toContainElement(
        screen.getByRole("button", { name: /Gwangjang Market Gate 2/ }),
      );
      expect(screen.getAllByText(labels)).toHaveLength(1);
      expect(screen.getByRole("heading", { level: 1 }).closest("section")).not.toHaveTextContent(
        labels,
      );
    },
  );
  it("does not add an empty language card for legacy activities", () => {
    renderWithIntl(<ActivityDetailView activity={activity} preview />);
    expect(screen.queryByRole("heading", { name: "Hosted in" })).not.toBeInTheDocument();
  });
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
      expect(screen.getByTestId("date-select-box")).toHaveClass("min-h-11", "md:min-h-12");
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
  ] as const)("places the translation notice before the title in %s", (locale, label, messages) => {
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
    expect(
      notice.compareDocumentPosition(screen.getByRole("heading", { level: 1 })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(notice.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(notice.querySelector("svg rect")).not.toBeNull();
  });
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

  it("keeps mobile date, weather, price and booking in a single row without truncating dates", () => {
    renderWithIntl(<ActivityDetailView activity={activity} unoptimizedImages />, { locale: "en" });

    const bar = screen.getByTestId("booking-bottom-bar");
    expect(bar).toHaveClass("fixed");
    const row = bar.firstElementChild as HTMLElement;
    expect(row).toHaveClass("grid", "grid-cols-[minmax(0,1fr)_auto_auto]");
    expect(screen.getByTestId("date-select-box")).toHaveClass("w-full", "md:flex-1");
    expect(screen.getByTestId("date-select-box")).not.toHaveClass("flex-1");
    expect(screen.queryByRole("group", { name: "Guests" })).not.toBeInTheDocument();
    expect(within(bar).getByText("per person")).toBeInTheDocument();
    expect(screen.getByTestId("booking-bar-actions")).toHaveClass("contents");
    expect(screen.getByTestId("date-select-box").querySelector(".truncate")).toBeNull();
    expect(screen.getByRole("button", { name: "Book now" })).toBeDisabled();
  });

  it("uses a smaller host portrait and compact introduction without hiding its text", () => {
    renderWithIntl(
      <ActivityDetailView
        activity={{ ...activity, hostIntroduction: "A local guide who loves sharing Seoul." }}
        preview
      />,
    );
    const profile = screen.getByRole("button", { name: "View Seoul Buddy's profile" });
    expect(profile).toHaveClass("size-11");
    expect(screen.getByText("A local guide who loves sharing Seoul.")).toHaveClass("leading-6");
    expect(profile.parentElement).toHaveClass("gap-3", "p-4");
    fireEvent.click(profile);
    expect(screen.getByTestId("host-profile-dialog")).toBeInTheDocument();
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
