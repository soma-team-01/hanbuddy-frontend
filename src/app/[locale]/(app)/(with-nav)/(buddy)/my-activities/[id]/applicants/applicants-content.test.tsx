import { screen } from "@testing-library/react";
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
    expect(screen.getByTestId("applicant-records")).toHaveClass("md:divide-y");
    expect(screen.getByText("Jul 19, 2026, 1:30 AM")).toBeInTheDocument();
    expect(screen.getByText("1 confirmed")).toBeInTheDocument();
    expect(screen.getByText("0 pending payment")).toBeInTheDocument();
    expect(screen.getByText("Sophie Martin")).toBeInTheDocument();
    expect(screen.getByText("France")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp +33 612345678")).toBeInTheDocument();
    expect(screen.getByText("• 1 guest")).toBeInTheDocument();
    expect(screen.getByText("Applied on Jul 19, 2026, 1:30 AM")).toBeInTheDocument();
    expect(screen.queryByText("• 1 guests")).not.toBeInTheDocument();
    expect(screen.getByText("No pork")).toBeInTheDocument();
    expect(mockedGetBuddyActivityApplications).toHaveBeenCalledWith("99");
    expect(mockedGetMyActivity).not.toHaveBeenCalled();
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
        includedItems: [],
        restrictionNotes: [],
        maxCapacity: 4,
        price: 50000,
        currency: "KRW",
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
            status: "PENDING_PAYMENT",
            specialRequest: "No pork",
            appliedAt: "2026-07-18T16:30:00Z",
          },
        ],
      },
    });

    renderWithQueryClient(<ApplicantsContent activityId="42" initialScheduleId="99" />, {
      locale: "ko",
    });

    expect(await screen.findByText("Traditional Tea Tasting")).toBeInTheDocument();
    expect(screen.getByText("2026. 7. 19. 오전 1:30")).toBeInTheDocument();
    expect(screen.getByText("확정 1명")).toBeInTheDocument();
    expect(screen.getByText("결제 대기 1명")).toBeInTheDocument();
    expect(screen.getByText("2026. 7. 19. 오전 1:30에 신청")).toBeInTheDocument();
    expect(screen.getByText("• 1명")).toBeInTheDocument();
    expect(screen.getByText("• 결제 대기")).toBeInTheDocument();
    expect(screen.getByText("Sophie Martin")).toBeInTheDocument();
    expect(screen.getByText("프랑스")).toBeInTheDocument();
    expect(screen.getByText("전화 +33 612345678")).toBeInTheDocument();
    expect(screen.getByText("No pork")).toBeInTheDocument();
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
