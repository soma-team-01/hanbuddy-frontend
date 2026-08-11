import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBuddyApplications, getBuddyScheduleDates } from "@/lib/api/buddy";
import { ApiClientError } from "@/lib/api/errors";
import { buddyKeys } from "@/lib/query/buddy";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { DashboardContent } from "./dashboard-content";

const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/chat", () => ({
  getMyChatRooms: vi.fn(async () => ({ status: "success", rooms: [] })),
  createDirectChatRoom: vi.fn(),
  createGroupChatRoom: vi.fn(),
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
    expect(screen.getByRole("img", { name: "Traditional Tea Tasting" })).toHaveAttribute(
      "loading",
      "eager",
    );
    expect(screen.getAllByText("1 Applicant").length).toBeGreaterThan(0);
    expect(screen.getByText("10:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Sophie Martin")).toBeInTheDocument();
    expect(screen.getByText("France")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp +33 612345678")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Schedule dates" }).tagName).toBe("FIELDSET");
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
    expect(await screen.findByText("1:30 AM")).toBeInTheDocument();
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
      error: new ApiClientError({
        code: null,
        status: null,
        details: null,
        backendMessage: null,
        fallbackMessage: "신청자 목록을 불러오지 못했습니다.",
      }),
    });

    renderWithQueryClient(<DashboardContent />);

    expect(await screen.findByText("Could not load applicants.")).toBeInTheDocument();
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

  it("localizes upcoming schedule controls and applicant counts in Korean", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      dates: [
        { dateStartAt: "2026-07-20T00:00:00+09:00", hasActivity: true },
        { dateStartAt: "2026-07-21T00:00:00+09:00", hasActivity: false },
      ],
    });
    mockedGetBuddyApplications.mockResolvedValue({
      status: "success",
      activities: [
        {
          activityId: 42,
          activityTitle: "Traditional Tea Tasting",
          thumbnailImageUrl: null,
          totalApplicantCount: 2,
          schedules: [
            {
              activityScheduleId: 99,
              startAt: "2026-07-20T10:00:00+09:00",
              applicantCount: 2,
              applicants: [
                {
                  applicationId: 11,
                  applicantUserId: 3,
                  applicantName: "Sophie Martin",
                  applicantProfileImageUrl: null,
                  applicantNationalityCode: "FR",
                  guestCount: 1,
                  applicantContactMethod: "PHONE",
                  applicantContactCountryCode: "+33",
                  applicantContactIdentifier: "612345678",
                },
              ],
            },
          ],
        },
      ],
    });

    renderWithQueryClient(<DashboardContent />, { locale: "ko" });

    expect(await screen.findByRole("heading", { name: "예정 일정" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "일정 날짜" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이전 날짜 5개" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음 날짜 5개" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /월 20, 액티비티 있음/ })).toBeInTheDocument();
    expect((await screen.findAllByText("신청자 2명")).length).toBeGreaterThan(0);
    expect(screen.getByText("오전 10:00")).toBeInTheDocument();
    expect(screen.getByText("프랑스")).toBeInTheDocument();
    expect(screen.getByText("전화 +33 612345678")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Traditional Tea Tasting/ })).toHaveAttribute(
      "href",
      "/ko/my-activities/42/applicants?scheduleId=99",
    );
  });

  it("localizes the schedule loading state in Korean", () => {
    mockedGetBuddyScheduleDates.mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<DashboardContent />, { locale: "ko" });

    expect(screen.getByText("일정을 불러오는 중...")).toBeInTheDocument();
  });

  it("localizes the empty schedule state in Korean", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({ status: "success", dates: [] });

    renderWithQueryClient(<DashboardContent />, { locale: "ko" });

    expect(await screen.findByText("예정된 일정이 없습니다.")).toBeInTheDocument();
  });

  it("maps the buddy-role schedule error in Korean", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "USER403_BUDDY",
        status: 403,
        details: null,
        backendMessage: "raw schedule service failure",
      }),
    });

    renderWithQueryClient(<DashboardContent />, { locale: "ko" });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "버디 사용자만 이용할 수 있는 기능입니다.",
    );
    expect(screen.queryByText("raw schedule service failure")).not.toBeInTheDocument();
  });

  it("explains that the group chat keeps absorbing later bookings", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      dates: [{ dateStartAt: "2026-07-20T00:00:00+09:00", hasActivity: true }],
    });
    mockedGetBuddyApplications.mockResolvedValue({
      status: "success",
      activities: [
        {
          activityId: 42,
          activityTitle: "Traditional Tea Tasting",
          thumbnailImageUrl: null,
          totalApplicantCount: 1,
          schedules: [
            {
              activityScheduleId: 99,
              startAt: "2026-07-20T10:00:00+09:00",
              applicantCount: 1,
              applicants: [],
            },
          ],
        },
      ],
    });

    renderWithQueryClient(<DashboardContent />);

    const button = await screen.findByRole("button", { name: /group chat/i });
    // 누르기 전에, 한 번만 만들면 된다는 걸 알려 준다
    expect(button.parentElement).toHaveTextContent(
      "every guest who completes payment joins automatically",
    );
  });
});
