import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBuddyApplications, getBuddyScheduleDates } from "@/lib/api/buddy";
import { buddyKeys } from "@/lib/query/buddy";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { DashboardContent } from "./dashboard-content";

const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
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
      dates: [
        { dateStartAt: "2026-07-19T00:00:00+09:00", hasActivity: false },
        { dateStartAt: "2026-07-20T00:00:00+09:00", hasActivity: true },
      ],
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
    expect(screen.getByText("19").closest("button")).not.toHaveAccessibleName(/has activity/i);
    expect(screen.getByText("20").closest("button")).toHaveAccessibleName(/has activity/i);
    expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-20");
  });

  it("keeps boundary instants on the Seoul date and localizes the weekday", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      dates: [{ dateStartAt: "2026-07-18T16:30:00Z", hasActivity: true }],
    });
    mockedGetBuddyApplications.mockResolvedValue({
      status: "success",
      activities: [
        {
          activityId: 42,
          activityTitle: "Midnight Seoul Walk",
          thumbnailImageUrl: null,
          totalApplicantCount: 0,
          schedules: [
            {
              activityScheduleId: 99,
              startAt: "2026-07-18T16:30:00Z",
              applicantCount: 0,
              applicants: [],
            },
          ],
        },
      ],
    });

    renderWithQueryClient(<DashboardContent />, { locale: "en" });

    expect(await screen.findByRole("button", { name: "Sun 19, has activity" })).toBeInTheDocument();
    expect(await screen.findByText("01:30")).toBeInTheDocument();
    expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-19");
  });

  it("shows the localized date-time fallback when every schedule date is invalid", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      dates: [{ dateStartAt: "2026-07-19T01:30", hasActivity: true }],
    });

    renderWithQueryClient(<DashboardContent />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Time unavailable.");
    expect(screen.getByRole("button", { name: "Time unavailable., has activity" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.queryByText("Loading applicants...")).not.toBeInTheDocument();
    expect(mockedGetBuddyApplications).not.toHaveBeenCalled();
  });

  it("chooses a valid default when invalid and valid schedule dates are mixed", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      dates: [
        { dateStartAt: "2026-07-19T01:30", hasActivity: true },
        { dateStartAt: "2026-07-18T16:30:00Z", hasActivity: true },
      ],
    });
    mockedGetBuddyApplications.mockResolvedValue({ status: "success", activities: [] });

    renderWithQueryClient(<DashboardContent />);

    expect(await screen.findByRole("button", { name: "Sun 19, has activity" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Time unavailable., has activity" })).toBeDisabled();
    await waitFor(() => expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-19"));
    expect(screen.getByText("No applicants for this date yet.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("paginates schedule dates in groups of five", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      dates: Array.from({ length: 11 }, (_, index) => ({
        dateStartAt: `2026-07-${String(index + 20).padStart(2, "0")}T00:00:00+09:00`,
        hasActivity: index === 0,
      })),
    });
    mockedGetBuddyApplications.mockResolvedValue({ status: "success", activities: [] });

    renderWithQueryClient(<DashboardContent />);

    const dateGroup = await screen.findByRole("group", { name: "Schedule dates" });
    expect(within(dateGroup).getAllByRole("button")).toHaveLength(5);
    expect(within(dateGroup).getByText("20")).toBeInTheDocument();
    expect(within(dateGroup).getByText("24")).toBeInTheDocument();
    expect(within(dateGroup).queryByText("25")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous 5 dates" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next 5 dates" }));

    expect(within(dateGroup).getAllByRole("button")).toHaveLength(5);
    expect(within(dateGroup).getByText("25")).toBeInTheDocument();
    expect(within(dateGroup).getByText("29")).toBeInTheDocument();
    expect(within(dateGroup).queryByText("24")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next 5 dates" }));

    expect(within(dateGroup).getAllByRole("button")).toHaveLength(1);
    expect(within(dateGroup).getByText("30")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next 5 dates" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Previous 5 dates" }));
    expect(within(dateGroup).getByText("25")).toBeInTheDocument();
  });

  it("keeps date selection available when applicant loading fails", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      dates: [{ dateStartAt: "2026-07-20T00:00:00+09:00", hasActivity: true }],
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
      dates: [
        { dateStartAt: "2026-07-20T00:00:00+09:00", hasActivity: true },
        { dateStartAt: "2026-07-21T00:00:00+09:00", hasActivity: true },
      ],
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
      dates: [
        { dateStartAt: "2026-07-20T00:00:00+09:00", hasActivity: true },
        { dateStartAt: "2026-07-21T00:00:00+09:00", hasActivity: true },
      ],
    });
    mockedGetBuddyApplications.mockResolvedValue({ status: "success", activities: [] });

    const { queryClient } = renderWithQueryClient(<DashboardContent />);

    await waitFor(() => expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-20"));
    fireEvent.click(screen.getByText("21").closest("button")!);
    await waitFor(() => expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-21"));

    act(() => {
      queryClient.setQueryData(buddyKeys.scheduleDates(), [
        { dateStartAt: "2026-07-22T00:00:00+09:00", hasActivity: true },
      ]);
    });

    await waitFor(() =>
      expect(screen.getByText("22").closest("button")).toHaveAttribute("aria-pressed", "true"),
    );
    await waitFor(() => expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-22"));
  });
});
