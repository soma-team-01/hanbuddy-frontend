import { act, screen } from "@testing-library/react";
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
}));

vi.mock("@/lib/api/activities", () => ({
  getTouristActivity: vi.fn(),
}));

vi.mock("@/lib/api/applications", () => ({
  createApplication: vi.fn(),
}));

const mockedGetTouristActivity = vi.mocked(getTouristActivity);

const activityDetail: TouristActivityDetail = {
  activityId: 42,
  title: "Bukchon Hidden Gems",
  description: "Walk through quiet alleys with a local buddy.",
  thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
  buddyId: 7,
  buddyName: "Jihoon Kim",
  buddyProfileImageUrl: null,
  includedItems: [],
  restrictionNotes: [],
  price: 45000,
  currency: "KRW",
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
    expect(screen.getByRole("option", { name: "Jul 20, 2026 10:00 AM" })).toBeInTheDocument();
    expect(screen.getByText("All times are in Korea Standard Time (KST).")).toBeInTheDocument();
  });

  it("reuses activity detail already cached by the detail screen", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(activityKeys.detail("42"), activityDetail);

    renderWithQueryClient(<BookingContent activityId="42" />, { queryClient });

    expect(await screen.findByRole("heading", { name: "Bukchon Hidden Gems" })).toBeInTheDocument();
    expect(mockedGetTouristActivity).not.toHaveBeenCalled();
  });

  it("shows the Korean Seoul time-zone notice", async () => {
    mockedGetTouristActivity.mockResolvedValue({
      status: "success",
      activity: activityDetail,
    });

    renderWithQueryClient(<BookingContent activityId="42" />, { locale: "ko" });

    expect(await screen.findByText("모든 시간은 한국 표준시(KST) 기준입니다.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bukchon Hidden Gems" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "2026. 7. 20. 오전 10:00" })).toBeInTheDocument();
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
