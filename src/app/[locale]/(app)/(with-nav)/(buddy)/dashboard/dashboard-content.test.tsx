import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getBuddyApplications,
  getBuddyActivityApplications,
  getBuddyPendingApprovals,
  getBuddyScheduleDates,
  getMyActivities,
} from "@/lib/api/buddy";
import { ApiClientError } from "@/lib/api/errors";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { DashboardContent } from "./dashboard-content";

const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("@/lib/api/schedule-cancellation", () => ({
  getScheduleCancellation: vi.fn(async () => ({
    status: "success",
    cancellation: {
      activityScheduleId: 99,
      status: "OPEN",
      cancelledAt: null,
      reason: null,
      applicants: [],
    },
  })),
  cancelSchedule: vi.fn(),
}));

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
  getBuddyPendingApprovals: vi.fn(),
  getBuddyApplications: vi.fn(),
  getBuddyActivityApplications: vi.fn(),
  getBuddyScheduleDates: vi.fn(),
  getMyActivities: vi.fn(),
}));

// 주간 스트립은 오늘 날짜를 기준으로 그려지므로 시각을 고정한다 (2026-07-15은 수요일)
vi.mock("@/lib/datetime", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/datetime")>()),
  getSeoulNowParts: () => ({ date: "2026-07-15", time: "12:00" }),
}));

const mockedGetBuddyApplications = vi.mocked(getBuddyApplications);
const mockedGetBuddyScheduleDates = vi.mocked(getBuddyScheduleDates);
const mockedGetMyActivities = vi.mocked(getMyActivities);

const teaTastingActivities = [
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
            applicantContactMethod: "WHATSAPP" as const,
            applicantContactCountryCode: "+33",
            applicantContactIdentifier: "612345678",
          },
        ],
      },
    ],
  },
];

describe("DashboardContent", () => {
  it("restores the application detail date and session after returning from the activity page", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({ status: "success", dates: [] });
    mockedGetBuddyApplications.mockResolvedValue({
      status: "success",
      activities: teaTastingActivities,
    });
    renderWithQueryClient(
      <DashboardContent initialSession={{ date: "2026-07-20", activityId: 42, scheduleId: 99 }} />,
    );
    expect(await screen.findByText("Sophie Martin")).toBeVisible();
    expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-20", "EN");
    expect(screen.getByRole("link", { name: "Traditional Tea Tasting" })).toHaveAttribute(
      "href",
      "/en/my-activities/42?from=applications&date=2026-07-20&scheduleId=99",
    );
    expect(screen.getByRole("group", { name: /Schedule dates/ }).parentElement).toHaveClass(
      "hidden",
    );
    fireEvent.click(screen.getByRole("button", { name: /Back to sessions/ }));
    expect(screen.getByRole("button", { name: /10:00 AM.*Traditional Tea Tasting/ })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Tue 21" }));
    fireEvent.click(await screen.findByRole("button", { name: "Mon 20" }));
    expect(
      await screen.findByRole("button", { name: /10:00 AM.*Traditional Tea Tasting/ }),
    ).toBeVisible();
    expect(screen.queryByRole("link", { name: "Traditional Tea Tasting" })).not.toBeInTheDocument();
  });
  beforeEach(() => {
    vi.mocked(getBuddyActivityApplications)
      .mockReset()
      .mockImplementation(async (id) => {
        const summary: Awaited<ReturnType<typeof getBuddyApplications>> | undefined =
          await mockedGetBuddyApplications.mock.results.at(-1)?.value;
        const schedule =
          summary?.status === "success"
            ? summary.activities
                .flatMap((activity) => activity.schedules)
                .find((item) => item.activityScheduleId === Number(id))
            : undefined;
        return {
          status: "success",
          applications: {
            activityId: 42,
            activityTitle: "Traditional Tea Tasting",
            activityScheduleId: Number(id),
            startAt: schedule?.startAt ?? "2099-07-20T10:00:00+09:00",
            applicantCount: schedule?.applicantCount ?? 0,
            statusCounts: {},
            applicants: (schedule?.applicants ?? []).map((item) => ({
              ...item,
              status: item.status ?? "CONFIRMED",
              specialRequest: item.specialRequest ?? null,
              appliedAt: "2026-07-01T10:00:00+09:00",
            })),
          },
        };
      });
    vi.mocked(getBuddyPendingApprovals)
      .mockReset()
      .mockResolvedValue({
        status: "success",
        page: { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20, hasNext: false },
      });
    mockedGetBuddyApplications.mockReset();
    mockedGetBuddyScheduleDates.mockReset();
    mockedGetMyActivities.mockReset();
    mockedGetMyActivities.mockResolvedValue({ status: "success", activities: [] });
  });

  it("keeps the inbox independent of the selected date and removes pending-only calendar rows", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({ status: "success", dates: [] });
    mockedGetBuddyApplications.mockResolvedValue({
      status: "success",
      activities: [
        {
          ...teaTastingActivities[0],
          schedules: [
            {
              ...teaTastingActivities[0].schedules[0],
              applicants: [
                {
                  ...teaTastingActivities[0].schedules[0].applicants[0],
                  status: "PENDING_APPROVAL",
                },
              ],
            },
          ],
        },
      ],
    });
    vi.mocked(getBuddyPendingApprovals).mockResolvedValue({
      status: "success",
      page: {
        content: [
          {
            applicationId: 11,
            activityId: 42,
            activityType: "STANDARD",
            activityTitle: "Traditional Tea Tasting",
            thumbnailImageUrl: null,
            activityScheduleId: 99,
            startAt: "2099-07-20T10:00:00+09:00",
            applicantUserId: 3,
            applicantName: "Pending Sophie",
            guestCount: 2,
            specialRequest: null,
            status: "PENDING_APPROVAL",
            appliedAt: "2099-07-19T10:00:00+09:00",
            approvalExpiresAt: "2099-07-19T22:00:00+09:00",
          },
        ],
        totalElements: 1,
        totalPages: 1,
        page: 0,
        size: 20,
        hasNext: false,
      },
    });
    renderWithQueryClient(<DashboardContent />);
    const inbox = await screen.findByRole("region", { name: /New booking requests/ });
    await within(inbox).findByText("Pending Sophie");
    expect(screen.queryByText("Sophie Martin")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Thu 16" }));
    await waitFor(() =>
      expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-16", "EN"),
    );
    expect(within(inbox).getByText("Pending Sophie")).toBeInTheDocument();
    expect(getBuddyPendingApprovals).toHaveBeenCalledTimes(1);
    expect(getBuddyPendingApprovals).toHaveBeenCalledWith(0);
  });

  it("keeps session management inside the selected session detail", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({ status: "success", dates: [] });
    mockedGetBuddyApplications.mockResolvedValue({
      status: "success",
      activities: [
        {
          ...teaTastingActivities[0],
          schedules: [
            { ...teaTastingActivities[0].schedules[0], startAt: "2099-07-20T10:00:00+09:00" },
          ],
        },
      ],
    });
    renderWithQueryClient(<DashboardContent />);
    const list = await screen.findByRole("region", { name: "Sessions" });
    expect(screen.queryByRole("region", { name: "Session details" })).not.toBeInTheDocument();
    expect(
      within(list).queryByRole("button", { name: "Schedule options" }),
    ).not.toBeInTheDocument();
    fireEvent.click(await within(list).findByRole("button", { name: /10:00 AM.*Participants/ }));
    const card = screen.getByRole("region", { name: "Session details" });
    const menu = within(card).getByRole("button", { name: "Schedule options" });
    expect(menu.parentElement).toHaveClass("absolute", "top-0", "right-0");
    const chat = await within(card).findByRole("button", { name: "Create group chat" });
    expect(card).toContainElement(chat);
    expect(menu.parentElement).not.toContainElement(chat);
    const participants = within(card).getByRole("button", { name: /Participants/ });
    expect(
      participants.compareDocumentPosition(chat) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    fireEvent.click(within(card).getByRole("button", { name: /Cancellations/ }));
    expect(
      within(card).queryByRole("button", { name: "Create group chat" }),
    ).not.toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Schedule options" })).toBeInTheDocument();
    fireEvent.click(participants);
    expect(within(card).getByRole("button", { name: "Create group chat" })).toBeInTheDocument();
  });

  it("shows the week of the first activity date and its applicants", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      dates: [
        { dateStartAt: "2026-07-19T00:00:00+09:00", hasActivity: false },
        { dateStartAt: "2026-07-20T00:00:00+09:00", hasActivity: true },
      ],
    });
    mockedGetBuddyApplications.mockResolvedValue({
      status: "success",
      activities: teaTastingActivities,
    });

    renderWithQueryClient(<DashboardContent />);

    expect(
      await screen.findByRole("button", { name: /10:00 AM.*Traditional Tea Tasting/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Traditional Tea Tasting" })).not.toBeInTheDocument();
    fireEvent.click(
      await screen.findByRole("button", { name: /10:00 AM.*Participants.*2 guests/ }),
    );
    expect(screen.getByText("10:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Sophie Martin")).toBeInTheDocument();
    expect(screen.getByText(/France · 2 guests/)).toBeInTheDocument();
    // 연락처는 프로필을 열지 않아도 회차 상세에서 바로 확인한다.
    expect(screen.getByText("WhatsApp")).toBeVisible();
    expect(screen.getAllByText(/2 guests/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: "Back to sessions" }));
    // 선택된 날짜(7/20 월)가 속한 주: 일 19 ~ 토 25
    const dateGroup = screen.getByRole("group", { name: "Schedule dates" });
    expect(dateGroup.tagName).toBe("FIELDSET");
    expect(within(dateGroup).getAllByRole("button")).toHaveLength(7);
    expect(within(dateGroup).getByRole("button", { name: "Sun 19" })).toBeInTheDocument();
    expect(within(dateGroup).getByRole("button", { name: "Mon 20, has activity" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(dateGroup).getByText("25")).toBeInTheDocument();
    await waitFor(() =>
      expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-20", "EN"),
    );
  });

  it("keeps boundary instants on the Seoul date", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      // UTC 16:30 = 서울 다음날 새벽 1:30
      dates: [{ dateStartAt: "2026-07-18T16:30:00Z", hasActivity: true }],
    });
    mockedGetBuddyApplications.mockResolvedValue({ status: "success", activities: [] });

    renderWithQueryClient(<DashboardContent />, { locale: "en" });

    expect(await screen.findByRole("button", { name: "Sun 19, has activity" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await waitFor(() =>
      expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-19", "EN"),
    );
  });

  it("moves week by week without touching the selected date", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      dates: [{ dateStartAt: "2026-07-20T00:00:00+09:00", hasActivity: true }],
    });
    mockedGetBuddyApplications.mockResolvedValue({ status: "success", activities: [] });

    renderWithQueryClient(<DashboardContent />);

    // 일정이 로드되면 활동이 있는 7/20 주(일 19~)로 자리 잡는다
    await screen.findByRole("button", { name: "Mon 20, has activity" });
    const dateGroup = screen.getByRole("group", { name: "Schedule dates" });
    expect(within(dateGroup).getByText("19")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next week" }));
    // 다음 주: 일 26 ~ 토 8/1 — 그 주의 점을 새로 조회한다
    expect(within(dateGroup).getByText("26")).toBeInTheDocument();
    expect(within(dateGroup).queryByText("19")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(mockedGetBuddyScheduleDates).toHaveBeenCalledWith({
        from: "2026-07-26",
        to: "2026-08-01",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));
    // 오늘(7/15)이 속한 주 — 오늘 칸은 요일 대신 Today를 단다
    expect(within(dateGroup).getByRole("button", { name: "Wed 15" })).toHaveTextContent("Today");

    // 주만 옮겼으므로 신청자 조회는 처음 선택(7/20) 한 번뿐이다
    expect(mockedGetBuddyApplications).toHaveBeenCalledTimes(1);
    expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-20", "EN");
  });

  it("jumps to the week of a date picked in the month calendar", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      dates: [{ dateStartAt: "2026-07-20T00:00:00+09:00", hasActivity: true }],
    });
    mockedGetBuddyApplications.mockResolvedValue({ status: "success", activities: [] });

    renderWithQueryClient(<DashboardContent />);

    await screen.findByRole("group", { name: "Schedule dates" });
    fireEvent.click(screen.getByRole("button", { name: "Open calendar" }));

    const calendar = await screen.findByRole("dialog", { name: "Open calendar" });
    expect(within(calendar).getByText("July 2026")).toBeInTheDocument();

    fireEvent.click(within(calendar).getByRole("button", { name: /July 31/ }));

    // 팝오버가 닫히고, 선택과 주간 스트립이 함께 7/31 주로 넘어간다
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const dateGroup = screen.getByRole("group", { name: "Schedule dates" });
    expect(within(dateGroup).getByRole("button", { name: "Fri 31" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await waitFor(() =>
      expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-31", "EN"),
    );
  });

  it("pages the month calendar across months", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({ status: "success", dates: [] });
    mockedGetBuddyApplications.mockResolvedValue({ status: "success", activities: [] });

    renderWithQueryClient(<DashboardContent />);

    fireEvent.click(await screen.findByRole("button", { name: "Open calendar" }));
    const calendar = await screen.findByRole("dialog", { name: "Open calendar" });

    fireEvent.click(within(calendar).getByRole("button", { name: "Next month" }));
    expect(within(calendar).getByText("August 2026")).toBeInTheDocument();
    // 넘겨 본 달의 점도 그 달 범위로 조회한다
    await waitFor(() =>
      expect(mockedGetBuddyScheduleDates).toHaveBeenCalledWith({
        from: "2026-08-01",
        to: "2026-08-31",
      }),
    );

    fireEvent.click(within(calendar).getByRole("button", { name: "Previous month" }));
    fireEvent.click(within(calendar).getByRole("button", { name: "Previous month" }));
    expect(within(calendar).getByText("June 2026")).toBeInTheDocument();
  });

  it("shows a special request inline only for applicants who left one", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      dates: [{ dateStartAt: "2026-07-20T00:00:00+09:00", hasActivity: true }],
    });
    mockedGetBuddyApplications.mockResolvedValue({
      status: "success",
      activities: [
        {
          ...teaTastingActivities[0],
          schedules: [
            {
              ...teaTastingActivities[0].schedules[0],
              applicantCount: 2,
              applicants: [
                {
                  ...teaTastingActivities[0].schedules[0].applicants[0],
                  specialRequest: "Vegan meal, please. No peanuts.",
                },
                {
                  ...teaTastingActivities[0].schedules[0].applicants[0],
                  applicationId: 12,
                  applicantUserId: 4,
                  applicantName: "Liam Park",
                  specialRequest: null,
                },
              ],
            },
          ],
        },
      ],
    });

    renderWithQueryClient(<DashboardContent />);

    fireEvent.click(await screen.findByRole("button", { name: /10:00 AM.*Participants/ }));
    await screen.findByText("Sophie Martin");
    // 상세 정보는 요청사항을 남긴 사람에게만 펼쳐볼 수 있다.
    fireEvent.click(screen.getByText("Special request"));
    expect(screen.getByText("Vegan meal, please. No peanuts.")).toBeInTheDocument();
    expect(screen.getByText("Special request")).toBeInTheDocument();
    const liamRow = screen.getByText("Liam Park").closest("li")!;
    expect(within(liamRow).queryByText("Special request")).not.toBeInTheDocument();
  });

  it("opens the applicant profile with contact, guests, and a chat entry", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      dates: [{ dateStartAt: "2026-07-20T00:00:00+09:00", hasActivity: true }],
    });
    mockedGetBuddyApplications.mockResolvedValue({
      status: "success",
      activities: teaTastingActivities,
    });

    renderWithQueryClient(<DashboardContent />);

    fireEvent.click(await screen.findByRole("button", { name: /10:00 AM.*Participants/ }));
    // 채팅 버튼(Message Sophie Martin)과 겹치지 않게 이름으로 시작하는 버튼을 고른다
    fireEvent.click(await screen.findByRole("button", { name: /^Sophie Martin/ }));

    const profile = await screen.findByRole("dialog", { name: "Sophie Martin" });
    expect(within(profile).getByText("France")).toBeInTheDocument();
    // 연락 수단은 칩으로, 값은 본문으로 분리된다
    expect(within(profile).getByText("WhatsApp")).toBeInTheDocument();
    expect(within(profile).getByText("+33 612345678")).toBeInTheDocument();
    expect(within(profile).getByText("2 guests")).toBeInTheDocument();
    expect(within(profile).getByText("Applied at: Jul 1, 2026, 10:00 AM")).toBeInTheDocument();
    expect(
      within(profile).getByRole("button", { name: "Message Sophie Martin" }),
    ).toBeInTheDocument();
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

    await waitFor(() =>
      expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-20", "EN"),
    );
    await screen.findByRole("button", { name: "Tue 21, has activity" });
    fireEvent.click(screen.getByRole("button", { name: "Tue 21, has activity" }));
    await waitFor(() =>
      expect(mockedGetBuddyApplications).toHaveBeenCalledWith("2026-07-21", "EN"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Mon 20, has activity" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Mon 20, has activity" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
    expect(mockedGetBuddyApplications).toHaveBeenCalledTimes(2);
  });

  it("keeps activity management out of the home and orders applicants before requests", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({ status: "success", dates: [] });
    mockedGetBuddyApplications.mockResolvedValue({
      status: "success",
      activities: teaTastingActivities,
    });
    renderWithQueryClient(<DashboardContent />);
    await screen.findByRole("button", { name: /10:00 AM.*Traditional Tea Tasting/ });
    expect(screen.queryByRole("heading", { name: "My Activities" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Create Activity/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    const applicants = screen.getByRole("heading", { name: "Applicants" });
    const requests = screen.getByRole("heading", { name: /New booking requests/ });
    expect(
      applicants.compareDocumentPosition(requests) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("localizes the dashboard in Korean", async () => {
    mockedGetBuddyScheduleDates.mockResolvedValue({
      status: "success",
      dates: [{ dateStartAt: "2026-07-20T00:00:00+09:00", hasActivity: true }],
    });
    mockedGetBuddyApplications.mockResolvedValue({
      status: "success",
      activities: teaTastingActivities,
    });

    renderWithQueryClient(<DashboardContent />, { locale: "ko" });

    expect(
      await screen.findByRole("button", { name: /오전 10:00.*Traditional Tea Tasting/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "일정 날짜" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이전 주" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음 주" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "달력 열기" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "신청자" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "내 활동" })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: /오전 10:00.*참여자.*2명/ }));
    // 몇 명이 오는지 신청자 줄에서 바로 보인다
    expect(screen.getByText("2명")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "단체 채팅방 만들기" })).toBeInTheDocument();
  });
});
