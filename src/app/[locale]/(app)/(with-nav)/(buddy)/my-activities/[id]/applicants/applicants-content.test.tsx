import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getBuddyActivityApplications, getMyActivity } from "@/lib/api/buddy";
import { ApiClientError } from "@/lib/api/errors";
import { buddyKeys } from "@/lib/query/buddy";
import { createQueryClient } from "@/lib/query/client";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { ApplicantsContent } from "./applicants-content";

const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/buddy", () => ({
  getBuddyActivityApplications: vi.fn(),
  getMyActivity: vi.fn(),
}));

const mockedGetBuddyActivityApplications = vi.mocked(getBuddyActivityApplications);
const mockedGetMyActivity = vi.mocked(getMyActivity);

describe("ApplicantsContent", () => {
  it("renders applicants loaded from the API for the selected schedule", async () => {
    mockedGetBuddyActivityApplications.mockResolvedValue({
      status: "success",
      applications: {
        activityId: 42,
        activityScheduleId: 99,
        activityTitle: "Traditional Tea Tasting",
        startAt: "2026-07-18T16:30:00Z",
        applicantCount: 1,
        statusCounts: { CONFIRMED: 1 },
        applicants: [
          {
            applicationId: 11,
            applicantUserId: 3,
            applicantName: "Sophie Martin",
            applicantProfileImageUrl: null,
            applicantNationalityCode: "FR",
            guestCount: 1,
            applicantContactMethod: "WHATSAPP",
            applicantContactCountryCode: "+33",
            applicantContactIdentifier: "612345678",
            status: "CONFIRMED",
            specialRequest: "No pork",
            appliedAt: "2026-07-18T16:30:00Z",
          },
        ],
      },
    });

    renderWithQueryClient(<ApplicantsContent activityId="42" initialScheduleId="99" />);

    expect(await screen.findByText("Traditional Tea Tasting")).toBeInTheDocument();
    expect(screen.getByText("Jul 19, 2026, 1:30 AM")).toBeInTheDocument();
    // 확정 인원·결제 대기 수는 제목 줄에서 뺐다 — 영역 제목이 대신한다
    expect(screen.queryByText(/confirmed$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/pending payment/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Confirmed bookings" })).toBeInTheDocument();
    expect(screen.getByText("Sophie Martin")).toBeInTheDocument();
    expect(screen.getByText("France")).toBeInTheDocument();
    // 연락처는 목록에서 빠지고 프로필 팝업에서만 보여준다
    expect(screen.queryByText(/WhatsApp/)).not.toBeInTheDocument();
    expect(screen.getByText("1 guest")).toBeInTheDocument();
    expect(screen.getByText("Applied on Jul 19, 2026, 1:30 AM")).toBeInTheDocument();
    expect(screen.getByText("No pork")).toBeInTheDocument();

    // 이름을 누르면 프로필 팝업에 연락 수단·값이 뜬다
    fireEvent.click(screen.getByRole("button", { name: /^Sophie Martin/ }));
    const profile = await screen.findByRole("dialog", { name: "Sophie Martin" });
    expect(within(profile).getByText("WhatsApp")).toBeInTheDocument();
    expect(within(profile).getByText("+33 612345678")).toBeInTheDocument();
    // 대화 걸기 진입점도 함께 있다
    expect(
      within(profile).getByRole("button", { name: "Message Sophie Martin" }),
    ).toBeInTheDocument();
    expect(mockedGetBuddyActivityApplications).toHaveBeenCalledWith("99");
    // 달력에 이 활동의 회차 날짜를 찍기 위해 상세도 함께 불러온다
    expect(mockedGetMyActivity).toHaveBeenCalled();
  });

  it("labels a superseded application as cancelled instead of rendering an empty status", async () => {
    mockedGetBuddyActivityApplications.mockResolvedValue({
      status: "success",
      applications: {
        activityId: 42,
        activityScheduleId: 99,
        activityTitle: "Traditional Tea Tasting",
        startAt: "2026-07-18T16:30:00Z",
        applicantCount: 1,
        statusCounts: { SUPERSEDED: 1 },
        applicants: [
          {
            applicationId: 12,
            applicantUserId: 4,
            applicantName: "Liam Brown",
            applicantProfileImageUrl: null,
            applicantNationalityCode: "GB",
            guestCount: 2,
            applicantContactMethod: "LINE",
            applicantContactCountryCode: null,
            applicantContactIdentifier: "liam.line",
            status: "SUPERSEDED",
            specialRequest: null,
            appliedAt: "2026-07-18T16:30:00Z",
          },
        ],
      },
    });

    renderWithQueryClient(<ApplicantsContent activityId="42" initialScheduleId="99" />);

    expect(await screen.findByText("Liam Brown")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cancelled bookings" })).toBeInTheDocument();
  });

  it("splits applicants into status sections and shows cancellation reasons", async () => {
    const base = {
      applicantProfileImageUrl: null,
      applicantNationalityCode: "FR",
      guestCount: 1,
      applicantContactMethod: "WHATSAPP" as const,
      applicantContactCountryCode: "+33",
      applicantContactIdentifier: "612345678",
      specialRequest: null,
      appliedAt: "2026-07-18T16:30:00Z",
    };
    mockedGetBuddyActivityApplications.mockResolvedValue({
      status: "success",
      applications: {
        activityId: 42,
        activityScheduleId: 99,
        activityTitle: "Traditional Tea Tasting",
        startAt: "2026-07-18T16:30:00Z",
        applicantCount: 4,
        statusCounts: { COMPLETED: 1, CONFIRMED: 1, CANCELLED: 1, PENDING_PAYMENT: 1 },
        applicants: [
          {
            ...base,
            applicationId: 1,
            applicantUserId: 1,
            applicantName: "Done Kim",
            status: "COMPLETED" as const,
          },
          {
            ...base,
            applicationId: 2,
            applicantUserId: 2,
            applicantName: "Sure Lee",
            status: "CONFIRMED" as const,
          },
          {
            ...base,
            applicationId: 3,
            applicantUserId: 3,
            applicantName: "Gone Park",
            status: "CANCELLED" as const,
            cancellationReason: "OTHER" as const,
            cancellationDetail: "My flight was cancelled.",
          },
          {
            ...base,
            applicationId: 4,
            applicantUserId: 4,
            applicantName: "Wait Choi",
            status: "PENDING_PAYMENT" as const,
          },
        ],
      },
    });

    renderWithQueryClient(<ApplicantsContent activityId="42" initialScheduleId="99" />);

    // 진행 완료 → 예약 완료 → 예약 취소 순서
    expect(await screen.findByRole("heading", { name: "Completed bookings" })).toBeInTheDocument();
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(["Completed bookings", "Confirmed bookings", "Cancelled bookings"]);
    // 결제 대기 신청자는 어디에도 없다
    expect(screen.queryByText("Wait Choi")).not.toBeInTheDocument();
    // 취소 사유와 OTHER 상세가 함께 보인다
    expect(screen.getByText(/Cancellation reason: Other reason/)).toBeInTheDocument();
    expect(screen.getByText("My flight was cancelled.")).toBeInTheDocument();
  });

  it("falls back to the first activity schedule when no schedule query is provided", async () => {
    mockedGetMyActivity.mockResolvedValue({
      status: "success",
      activity: {
        activityId: 42,
        title: "Traditional Tea Tasting",
        description: "Learn Korean tea etiquette.",
        thumbnailImageUrl: null,
        status: "ACTIVE",
        hostIntroduction: "A tea sommelier hosting hanok tea ceremonies in Seoul.",
        includedItems: [],
        restrictionNotes: [],
        maxCapacity: 4,
        price: 50000,
        currency: "KRW",
        discountPercent: null,
        discountEndDate: null,
        discountedPrice: null,
        meetingPointName: "Anguk Station",
        meetingPlaceId: "place-1",
        images: [],
        schedules: [
          {
            scheduleId: 99,
            startAt: "2026-07-20T10:00:00+09:00",
            bookedCount: 0,
            status: "OPEN",
          },
        ],
        itineraries: [],
      },
    });
    mockedGetBuddyActivityApplications.mockResolvedValue({
      status: "success",
      applications: {
        activityId: 42,
        activityScheduleId: 99,
        activityTitle: "Traditional Tea Tasting",
        startAt: "2026-07-20T10:00:00+09:00",
        applicantCount: 0,
        statusCounts: {},
        applicants: [],
      },
    });

    renderWithQueryClient(<ApplicantsContent activityId="42" />);

    expect(await screen.findByText("No applicants for this schedule yet.")).toBeInTheDocument();
    expect(mockedGetMyActivity).toHaveBeenCalledWith(42);
    expect(mockedGetBuddyActivityApplications).toHaveBeenCalledWith(99);
  });

  it("ignores a cached activity error when a schedule is provided", async () => {
    const queryClient = createQueryClient();
    await queryClient.prefetchQuery({
      queryKey: buddyKeys.activityDetail(42),
      queryFn: async () => {
        throw new Error("이전 활동 조회 오류");
      },
    });
    mockedGetBuddyActivityApplications.mockResolvedValue({
      status: "success",
      applications: {
        activityId: 42,
        activityScheduleId: 99,
        activityTitle: "Traditional Tea Tasting",
        startAt: "2026-07-20T10:00:00+09:00",
        applicantCount: 0,
        statusCounts: {},
        applicants: [],
      },
    });

    renderWithQueryClient(<ApplicantsContent activityId="42" initialScheduleId="99" />, {
      queryClient,
    });

    expect(await screen.findByText("No applicants for this schedule yet.")).toBeInTheDocument();
    expect(screen.queryByText("이전 활동 조회 오류")).not.toBeInTheDocument();
  });

  it("localizes schedule counts, applicant status, and applied date in Korean", async () => {
    mockedGetBuddyActivityApplications.mockResolvedValue({
      status: "success",
      applications: {
        activityId: 42,
        activityScheduleId: 99,
        activityTitle: "Traditional Tea Tasting",
        startAt: "2026-07-18T16:30:00Z",
        applicantCount: 1,
        statusCounts: { CONFIRMED: 1, PENDING_PAYMENT: 1 },
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
            status: "CANCELLED",
            specialRequest: "No pork",
            appliedAt: "2026-07-18T16:30:00Z",
            cancellationReason: "SCHEDULE_CONFLICT",
          },
        ],
      },
    });

    renderWithQueryClient(<ApplicantsContent activityId="42" initialScheduleId="99" />, {
      locale: "ko",
    });

    expect(await screen.findByText("Traditional Tea Tasting")).toBeInTheDocument();
    expect(screen.getByText("2026. 7. 19. 오전 1:30")).toBeInTheDocument();
    expect(screen.queryByText("확정 1명")).not.toBeInTheDocument();
    expect(screen.getByText("2026. 7. 19. 오전 1:30에 신청")).toBeInTheDocument();
    expect(screen.getAllByText("1명").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "예약 취소" })).toBeInTheDocument();
    expect(screen.getByText("취소 사유: 일정 충돌")).toBeInTheDocument();
    expect(screen.getByText("Sophie Martin")).toBeInTheDocument();
    expect(screen.getByText("프랑스")).toBeInTheDocument();
    // 연락처는 목록에 없고 프로필 팝업에서 수단·값으로 나뉘어 보인다
    fireEvent.click(screen.getByRole("button", { name: /Sophie Martin.*프랑스/ }));
    const profile = await screen.findByRole("dialog", { name: "Sophie Martin" });
    expect(within(profile).getByText("전화")).toBeInTheDocument();
    expect(within(profile).getByText("+33 612345678")).toBeInTheDocument();
    expect(screen.getAllByText("No pork").length).toBeGreaterThan(0);
  });

  it("localizes applicant loading and maps the activity-owner error in Korean", async () => {
    mockedGetBuddyActivityApplications.mockReturnValueOnce(new Promise(() => {}));
    const firstRender = renderWithQueryClient(
      <ApplicantsContent activityId="42" initialScheduleId="99" />,
      { locale: "ko" },
    );

    expect(screen.getByText("신청자를 불러오는 중...")).toBeInTheDocument();

    firstRender.unmount();
    mockedGetBuddyActivityApplications.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "ACTIVITY403_OWNER",
        status: 403,
        details: null,
        backendMessage: "raw applicant service failure",
      }),
    });
    renderWithQueryClient(<ApplicantsContent activityId="42" initialScheduleId="99" />, {
      locale: "ko",
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "본인이 등록한 액티비티만 이용할 수 있습니다.",
    );
    expect(screen.queryByText("raw applicant service failure")).not.toBeInTheDocument();
  });
});
