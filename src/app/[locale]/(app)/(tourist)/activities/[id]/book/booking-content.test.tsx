import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { createTestAnalytics } from "@/test/analytics";
import { getMyProfile } from "@/lib/api/users";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTouristActivity } from "@/lib/api/activities";
import { ApiClientError } from "@/lib/api/errors";
import { activityKeys } from "@/lib/query/activities";
import { createQueryClient } from "@/lib/query/client";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { TouristActivityDetail } from "@/types/activity";
import { BookingContent } from "./booking-content";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/en/activities/42/book",
}));

vi.mock("@/lib/api/activities", () => ({
  getTouristActivity: vi.fn(),
}));

vi.mock("@/lib/api/applications", () => ({
  createApplication: vi.fn(),
}));

vi.mock("@/lib/api/users", () => ({ getMyProfile: vi.fn() }));

const mockedGetTouristActivity = vi.mocked(getTouristActivity);

const activityDetail: TouristActivityDetail = {
  activityId: 42,
  title: "Bukchon Hidden Gems",
  description: "Walk through quiet alleys with a local buddy.",
  totalDurationMinutes: 60,
  thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
  buddyId: 7,
  buddyName: "Jihoon Kim",
  buddyProfileImageUrl: null,
  includedItems: [],
  restrictionNotes: [],
  price: 45000,
  currency: "KRW",
  displayPrice: {
    price: 32.5,
    discountedPrice: null,
    currency: "USD",
    exchangeRateDate: "2026-08-31",
    estimated: true,
  },
  meetingPointName: "Anguk Station Exit 2",
  meetingPlaceId: "ChIJ-bukchon",
  images: [],
  schedules: [
    {
      activityScheduleId: 101,
      startAt: "2026-07-20T10:00:00+09:00",
      remainingCapacity: 4,
      status: "OPEN",
    },
  ],
};

const cnyActivityDetail: TouristActivityDetail = {
  ...activityDetail,
  displayPrice: {
    price: 240,
    discountedPrice: null,
    currency: "CNY",
    exchangeRateDate: "2026-08-31",
    estimated: true,
  },
};

describe("BookingContent", () => {
  beforeEach(() => {
    mockedGetTouristActivity.mockReset();
  });

  it("renders booking form with activity detail loaded from the API", async () => {
    mockedGetTouristActivity.mockResolvedValue({
      status: "success",
      activity: activityDetail,
    });

    renderWithQueryClient(<BookingContent activityId="42" />);

    expect(await screen.findByRole("heading", { name: "Bukchon Hidden Gems" })).toBeInTheDocument();
    expect(screen.getByTestId("date-select-box")).toHaveTextContent("10:00 AM");
    expect(screen.getByText("All times are in Korea Standard Time (KST).")).toBeInTheDocument();
    expect(mockedGetTouristActivity).toHaveBeenCalledWith("42", "EN", "USD");
  });

  it("reuses activity detail already cached by the detail screen", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(activityKeys.detail("42", "EN", "USD"), activityDetail);

    renderWithQueryClient(<BookingContent activityId="42" />, { queryClient });

    expect(await screen.findByRole("heading", { name: "Bukchon Hidden Gems" })).toBeInTheDocument();
    expect(mockedGetTouristActivity).not.toHaveBeenCalled();
  });

  it("uses the locale currency for the summary and USD only for the PayPal action", async () => {
    mockedGetTouristActivity.mockImplementation(async (_activityId, _language, currency) => ({
      status: "success",
      activity: currency === "CNY" ? cnyActivityDetail : activityDetail,
    }));

    renderWithQueryClient(<BookingContent activityId="42" />, { locale: "zh-Hans" });

    expect(await screen.findByText("≈ ¥240.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay US$32.50 with PayPal" })).toBeInTheDocument();
    expect(mockedGetTouristActivity).toHaveBeenCalledWith("42", "ZH_HANS", "CNY");
    expect(mockedGetTouristActivity).toHaveBeenCalledWith("42", "ZH_HANS", "USD");
  });

  it("keeps PayPal disabled until the USD estimate is ready", async () => {
    let resolveUsdEstimate!: (result: {
      status: "success";
      activity: TouristActivityDetail;
    }) => void;
    mockedGetTouristActivity.mockImplementation(async (_activityId, _language, currency) => {
      if (currency === "CNY") {
        return { status: "success", activity: cnyActivityDetail };
      }
      return new Promise((resolve) => {
        resolveUsdEstimate = resolve;
      });
    });

    renderWithQueryClient(<BookingContent activityId="42" />, { locale: "zh-Hans" });

    expect(await screen.findByText("≈ ¥240.00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: "Loading PayPal amount..." })).toBeDisabled();

    await act(async () => {
      resolveUsdEstimate({ status: "success", activity: activityDetail });
    });

    expect(await screen.findByRole("button", { name: "Pay US$32.50 with PayPal" })).toBeEnabled();
  });

  it("blocks PayPal and shows an error when the USD estimate fails", async () => {
    mockedGetTouristActivity.mockImplementation(async (_activityId, _language, currency) => {
      if (currency === "CNY") {
        return { status: "success", activity: cnyActivityDetail };
      }
      throw new Error("USD estimate failed");
    });

    renderWithQueryClient(<BookingContent activityId="42" />, { locale: "zh-Hans" });

    expect(await screen.findByText("≈ ¥240.00")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load the PayPal USD amount. Please try again.",
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: "Pay with PayPal" })).toBeDisabled();
  });

  it("shows the Korean Seoul time-zone notice", async () => {
    mockedGetTouristActivity.mockResolvedValue({
      status: "success",
      activity: activityDetail,
    });

    renderWithQueryClient(<BookingContent activityId="42" />, { locale: "ko" });

    expect(await screen.findByText("모든 시간은 한국 표준시(KST) 기준입니다.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bukchon Hidden Gems" })).toBeInTheDocument();
    expect(screen.getByTestId("date-select-box")).toHaveTextContent("오전 10:00");
  });

  it("localizes Korean booking loading and maps the activity-not-found code", async () => {
    let rejectActivity!: (error: Error) => void;
    mockedGetTouristActivity.mockReturnValue(
      new Promise((_, reject) => {
        rejectActivity = reject;
      }),
    );

    renderWithQueryClient(<BookingContent activityId="42" />, { locale: "ko" });

    expect(screen.getByText("예약 정보를 불러오는 중...")).toBeInTheDocument();

    await act(async () => {
      rejectActivity(
        new ApiClientError({
          code: "ACTIVITY404",
          status: 404,
          details: null,
          backendMessage: "raw server detail",
        }),
      );
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("액티비티를 찾을 수 없습니다.");
    expect(screen.queryByText("raw server detail")).not.toBeInTheDocument();
  });
});

it.each(["TOURIST", "BUDDY", "unauthenticated"])(
  "begins checkout only after authenticated usable form: %s",
  async (role) => {
    const { controller, browser } = createTestAnalytics();
    controller.visit("/en/activities/42/book");
    await controller.accept();
    let resolveProfile!: (value: Awaited<ReturnType<typeof getMyProfile>>) => void;
    vi.mocked(getMyProfile).mockReturnValue(
      new Promise((resolve) => {
        resolveProfile = resolve;
      }),
    );
    mockedGetTouristActivity.mockResolvedValue({ status: "success", activity: activityDetail });
    renderWithQueryClient(
      <AnalyticsProvider policy={null} controller={controller}>
        <BookingContent activityId="42" />
      </AnalyticsProvider>,
    );
    await screen.findByRole("heading", { name: activityDetail.title });
    expect(browser.send.mock.calls.filter((c) => c[0] === "begin_checkout")).toHaveLength(0);
    await act(async () =>
      resolveProfile(
        role === "unauthenticated"
          ? { status: "unauthenticated" }
          : {
              status: "success",
              profile: {
                userId: 1,
                email: "synthetic@example.test",
                name: "Test",
                displayName: "Test",
                userType: role as "TOURIST" | "BUDDY",
                profileImageKey: null,
                profileImageUrl: null,
                nationalityCode: "KR",
                birthDate: "2000-01-01",
                contactMethod: "LINE",
                contactCountryCode: null,
                contactIdentifier: "synthetic@example.test",
              },
            },
      ),
    );
    await waitFor(() => expect(vi.mocked(getMyProfile)).toHaveBeenCalled());
    if (role === "TOURIST")
      await waitFor(() =>
        expect(browser.send.mock.calls.filter((c) => c[0] === "begin_checkout")).toHaveLength(1),
      );
    else expect(browser.send.mock.calls.filter((c) => c[0] === "begin_checkout")).toHaveLength(0);
    expect(browser.send.mock.calls.filter((c) => c[0] === "booking_cta_click")).toHaveLength(0);
  },
);

it.each(["loading", "error", "empty", "full"])(
  "does not begin checkout for %s booking data",
  async (kind) => {
    const { controller, browser } = createTestAnalytics();
    controller.visit("/en/activities/42/book");
    await controller.accept();
    vi.mocked(getMyProfile).mockResolvedValue({
      status: "success",
      profile: {
        userId: 1,
        email: "synthetic@example.test",
        name: "Test",
        displayName: "Test",
        userType: "TOURIST",
        profileImageKey: null,
        profileImageUrl: null,
        nationalityCode: "KR",
        birthDate: "2000-01-01",
        contactMethod: "LINE",
        contactCountryCode: null,
        contactIdentifier: "synthetic@example.test",
      },
    });
    if (kind === "loading") mockedGetTouristActivity.mockReturnValue(new Promise(() => {}));
    else if (kind === "error")
      mockedGetTouristActivity.mockRejectedValue(new Error("synthetic error"));
    else
      mockedGetTouristActivity.mockResolvedValue({
        status: "success",
        activity: {
          ...activityDetail,
          schedules:
            kind === "empty"
              ? []
              : activityDetail.schedules.map((s) => ({ ...s, remainingCapacity: 0 })),
        },
      });
    renderWithQueryClient(
      <AnalyticsProvider policy={null} controller={controller}>
        <BookingContent activityId="42" />
      </AnalyticsProvider>,
    );
    if (kind === "error") await screen.findByRole("alert");
    else if (kind !== "loading") await screen.findByRole("heading", { name: activityDetail.title });
    await act(async () => {
      await Promise.resolve();
    });
    expect(browser.send.mock.calls.filter((c) => c[0] === "begin_checkout")).toHaveLength(0);
  },
);
