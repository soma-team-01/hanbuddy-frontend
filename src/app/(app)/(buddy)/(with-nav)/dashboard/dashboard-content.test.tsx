import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBuddyApplications, getBuddyScheduleDates } from "@/lib/api/buddy";
import { buddyKeys } from "@/lib/query/buddy";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { DashboardContent } from "./dashboard-content";

const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/buddy", () => ({
  getBuddyApplications: vi.fn(),
  getBuddyScheduleDates: vi.fn(),
}));

const mockedGetBuddyApplications = vi.mocked(getBuddyApplications);
const mockedGetBuddyScheduleDates = vi.mocked(getBuddyScheduleDates);

describe("DashboardContent", () => {
  beforeEach(() => {
    mockedGetBuddyApplications.mockReset();
    mockedGetBuddyScheduleDates.mockReset();
  });

  it("renders upcoming activities and applicants loaded from the API", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      dates: [{ date: "2026-07-20" }],
    });
    mockedGetBuddyApplications.mockResolvedValue({
      status: "success",
      activities: [
        {
          activityId: 42,
          activityTitle: "Traditional Tea Tasting",
          thumbnailImageUrl:
            "https://hanbuddy-bucket-526958954481-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com/activities/tea.webp",
          totalApplicantCount: 1,
          schedules: [
            {
              activityScheduleId: 99,
              startAt: "2026-07-20T10:00:00+09:00",
              applicantCount: 1,
              applicants: [
                {
                  applicationId: 11,
                  applicantUserId: 3,
                  applicantName: "Sophie Martin",
                  applicantProfileImageUrl: null,
                  applicantNationalityCode: "FR",
                  guestCount: 2,
                  applicantContactMethod: "WHATSAPP",
                  applicantContactCountryCode: "+33",
                  applicantContactIdentifier: "612345678",
                },
              ],
            },
          ],
        },
      ],
    });

    renderWithQueryClient(<DashboardContent />);

    expect(await screen.findByText("Traditional Tea Tasting")).toBeInTheDocument();
    expect(screen.getAllByText("1 Applicant").length).toBeGreaterThan(0);
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(screen.getByText("Sophie Martin")).toBeInTheDocument();
    expect(screen.getByText("France")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp +33 612345678")).toBeInTheDocument();
    expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-20");
  });

  it("keeps date selection available when applicant loading fails", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      dates: [{ date: "2026-07-20" }],
    });
    mockedGetBuddyApplications.mockResolvedValue({
      status: "error",
      message: "신청자 목록을 불러오지 못했습니다.",
    });

    renderWithQueryClient(<DashboardContent />);

    expect(await screen.findByText("신청자 목록을 불러오지 못했습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { pressed: true })).toBeInTheDocument();
  });

  it("reuses cached applicants when returning to a previously selected date", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      dates: [{ date: "2026-07-20" }, { date: "2026-07-21" }],
    });
    mockedGetBuddyApplications.mockResolvedValue({ status: "success", activities: [] });

    renderWithQueryClient(<DashboardContent />);

    await waitFor(() => expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-20"));
    fireEvent.click(screen.getByText("21").closest("button")!);
    await waitFor(() => expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-21"));
    fireEvent.click(screen.getByText("20").closest("button")!);

    await waitFor(() =>
      expect(screen.getByText("20").closest("button")).toHaveAttribute("aria-pressed", "true"),
    );
    expect(mockedGetBuddyApplications).toHaveBeenCalledTimes(2);
  });

  it("falls back when the selected date disappears from refreshed schedules", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      dates: [{ date: "2026-07-20" }, { date: "2026-07-21" }],
    });
    mockedGetBuddyApplications.mockResolvedValue({ status: "success", activities: [] });

    const { queryClient } = renderWithQueryClient(<DashboardContent />);

    await waitFor(() => expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-20"));
    fireEvent.click(screen.getByText("21").closest("button")!);
    await waitFor(() => expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-21"));

    act(() => {
      queryClient.setQueryData(buddyKeys.scheduleDates(), [{ date: "2026-07-22" }]);
    });

    await waitFor(() =>
      expect(screen.getByText("22").closest("button")).toHaveAttribute("aria-pressed", "true"),
    );
    expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-22");
  });
});
