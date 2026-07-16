import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTouristActivity } from "@/lib/api/activities";
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
    expect(screen.getByRole("option", { name: "2026-07-20 10:00" })).toBeInTheDocument();
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
  });
});
