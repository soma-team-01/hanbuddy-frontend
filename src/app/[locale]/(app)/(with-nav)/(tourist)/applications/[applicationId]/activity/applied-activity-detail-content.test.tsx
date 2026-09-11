import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAppliedActivityDetail } from "@/lib/api/applications";
import { ApiClientError } from "@/lib/api/errors";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { AppliedActivityDetailContent } from "./applied-activity-detail-content";

const routerMock = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/applications", () => ({
  getAppliedActivityDetail: vi.fn(),
}));

vi.mock("@/components/activity/ActivityDetailView", () => ({
  ActivityDetailView: ({
    activity,
    showBookingBar,
  }: {
    activity: { title: string };
    showBookingBar?: boolean;
  }) => (
    <div data-testid="activity-detail-view" data-show-booking={String(showBookingBar)}>
      {activity.title}
    </div>
  ),
}));

const mockedGetAppliedActivityDetail = vi.mocked(getAppliedActivityDetail);

function buildResponse(status: "ACTIVE" | "INACTIVE" | "DELETED", canBook: boolean) {
  return {
    applicationId: 11,
    activityScheduleId: 101,
    startAt: "2026-09-30T17:30:00+09:00",
    endAt: "2026-09-30T21:30:00+09:00",
    activityStatus: status,
    canBook,
    activity: {
      activityId: 42,
      buddyId: 7,
      title: "Bukchon Hidden Gems",
      description: "A preserved application activity.",
      totalDurationMinutes: 0,
      thumbnailImageUrl: "/activity.jpg",
      buddyName: "Jihoon Kim",
      buddyProfileImageUrl: null,
      meetingPointName: "Anguk Station",
      meetingPlaceId: "place-1",
      price: 45000,
      currency: "KRW",
      includedItems: [],
      restrictionNotes: [],
      images: [],
      schedules: [],
    },
  };
}

describe("AppliedActivityDetailContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["INACTIVE", "DELETED"] as const)(
    "shows the preserved %s activity without booking controls",
    async (status) => {
      mockedGetAppliedActivityDetail.mockResolvedValue({
        status: "success",
        appliedActivity: buildResponse(status, false),
      });

      renderWithQueryClient(<AppliedActivityDetailContent applicationId="11" />);

      expect(await screen.findByText("Bukchon Hidden Gems")).toBeInTheDocument();
      expect(
        screen.getByText("This activity is not currently accepting bookings."),
      ).toBeInTheDocument();
      expect(screen.getByText(/Sep 30/)).toBeInTheDocument();
      expect(screen.getByTestId("activity-detail-view")).toHaveAttribute(
        "data-show-booking",
        "false",
      );
      expect(mockedGetAppliedActivityDetail).toHaveBeenCalledWith("11", "EN", "USD");
    },
  );

  it("keeps the existing booking controls for an active bookable activity", async () => {
    mockedGetAppliedActivityDetail.mockResolvedValue({
      status: "success",
      appliedActivity: buildResponse("ACTIVE", true),
    });

    renderWithQueryClient(<AppliedActivityDetailContent applicationId="11" />);

    expect(await screen.findByTestId("activity-detail-view")).toHaveAttribute(
      "data-show-booking",
      "true",
    );
    expect(
      screen.queryByText("This activity is not currently accepting bookings."),
    ).not.toBeInTheDocument();
  });

  it("distinguishes an active activity with no bookable schedules", async () => {
    mockedGetAppliedActivityDetail.mockResolvedValue({
      status: "success",
      appliedActivity: buildResponse("ACTIVE", false),
    });

    renderWithQueryClient(<AppliedActivityDetailContent applicationId="11" />);

    expect(
      await screen.findByText("This activity has no available schedules."),
    ).toBeInTheDocument();
    expect(screen.getByTestId("activity-detail-view")).toHaveAttribute(
      "data-show-booking",
      "false",
    );
  });

  it("shows access guidance and a link back to My Applications for a forbidden request", async () => {
    mockedGetAppliedActivityDetail.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "APPLICATION403_OWNER",
        status: 403,
        details: null,
        backendMessage: "raw forbidden message",
      }),
    });

    renderWithQueryClient(<AppliedActivityDetailContent applicationId="11" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You can only access your own applications.",
    );
    expect(screen.getByRole("link", { name: "Back to My Applications" })).toHaveAttribute(
      "href",
      "/en/applications",
    );
    expect(screen.queryByText("raw forbidden message")).not.toBeInTheDocument();
  });
});
