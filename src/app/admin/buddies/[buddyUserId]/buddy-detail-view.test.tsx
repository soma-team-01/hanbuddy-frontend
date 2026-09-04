import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAdminAuditLogs,
  getAdminBuddy,
  getAdminBuddyPerformance,
  getAdminUserHistory,
  reactivateAdminUser,
  suspendAdminUser,
  updateAdminBuddyCommission,
} from "@/lib/api/admin";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { AdminBuddyDetailView } from "./buddy-detail-view";

vi.mock("@/lib/api/admin", () => ({
  getAdminAuditLogs: vi.fn(),
  getAdminBuddy: vi.fn(),
  getAdminBuddyPerformance: vi.fn(),
  getAdminUserHistory: vi.fn(),
  reactivateAdminUser: vi.fn(),
  suspendAdminUser: vi.fn(),
  updateAdminBuddyCommission: vi.fn(),
}));

const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMock,
}));

const mockedGetBuddy = vi.mocked(getAdminBuddy);
const mockedGetBuddyPerformance = vi.mocked(getAdminBuddyPerformance);
const mockedGetUserHistory = vi.mocked(getAdminUserHistory);
const mockedGetAuditLogs = vi.mocked(getAdminAuditLogs);
const mockedUpdateCommission = vi.mocked(updateAdminBuddyCommission);
const mockedSuspendUser = vi.mocked(suspendAdminUser);
const mockedReactivateUser = vi.mocked(reactivateAdminUser);

function mockBuddyRequests(logs: Awaited<ReturnType<typeof getAdminAuditLogs>>) {
  mockedGetBuddy.mockResolvedValue({
    status: "success",
    buddy: {
      user: {
        userId: 27,
        email: "buddy@example.com",
        name: "김버디",
        displayName: "버디",
        userType: "BUDDY",
        accountStatus: "ACTIVE",
        nationalityCode: "KR",
        createdAt: "2026-08-01T10:00:00+09:00",
        birthDate: "1998-04-12",
        contactMethod: "WHATSAPP",
        contactCountryCode: "+82",
        contactIdentifier: "01012345678",
        reviewedAt: "2026-08-02T10:00:00+09:00",
        reviewedBy: 1,
        rejectionReason: null,
        suspensionReason: null,
        suspendedAt: null,
        suspendedBy: null,
        activityCount: 2,
        applicationCount: 3,
        paymentCount: 3,
        reviewCount: 1,
        agreementCount: 2,
        updatedAt: "2026-08-02T10:00:00+09:00",
      },
      commissionPolicy: "EARLY_10",
      commissionRate: 0.1,
      averageRating: 5,
      reviewCount: 1,
    },
  });
  mockedGetAuditLogs.mockResolvedValue(logs);
  mockedGetBuddyPerformance.mockResolvedValue({
    status: "success",
    performance: {
      buddyId: 9,
      totalActivityCount: 2,
      activeActivityCount: 1,
      applicationCounts: {
        PENDING_PAYMENT: 0,
        SUPERSEDED: 0,
        CONFIRMED: 2,
        CANCELLED: 1,
        COMPLETED: 0,
      },
      confirmedPaymentCount: 2,
      confirmedPaymentAmountKrw: 80000,
      guidePayoutAmountKrw: 72000,
      averageRating: 5,
      reviewCount: 1,
    },
  });
  mockedGetUserHistory.mockImplementation(async (_userId, type) => ({
    status: "success",
    history: {
      content:
        type === "activities"
          ? [
              {
                activityId: 41,
                title: "한강 야경 투어",
                status: "ACTIVE" as const,
                price: 40000,
                currency: "KRW",
                createdAt: "2026-08-03T10:00:00+09:00",
              },
            ]
          : [
              {
                userAgreementId: 52,
                type: "TERMS_OF_SERVICE",
                version: "v1.0",
                required: true,
                agreed: true,
                decidedAt: "2026-08-01T10:00:00+09:00",
                withdrawnAt: null,
              },
            ],
      totalElements: 1,
      totalPages: 1,
      page: 0,
      size: 20,
      hasNext: false,
    },
  }));
}

describe("AdminBuddyDetailView", () => {
  beforeEach(() => {
    mockedGetBuddy.mockReset();
    mockedGetBuddyPerformance.mockReset();
    mockedGetUserHistory.mockReset();
    mockedGetAuditLogs.mockReset();
    mockedUpdateCommission.mockReset();
    mockedSuspendUser.mockReset();
    mockedReactivateUser.mockReset();
    routerMock.replace.mockReset();
  });

  it("logs 필드를 사용하는 빈 감사 로그 응답을 안전하게 표시한다", async () => {
    mockBuddyRequests({
      status: "success",
      auditLogs: {
        logs: [],
        totalElements: 0,
        totalPages: 0,
        page: 0,
        size: 20,
        hasNext: false,
      },
    });

    renderWithQueryClient(<AdminBuddyDetailView buddyId="9" />);

    expect(await screen.findByText("기록된 관리자 작업이 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("대한민국")).toBeInTheDocument();
    expect(screen.getByText("1998. 4. 12.")).toBeInTheDocument();
    expect(screen.getByText("+82")).toBeInTheDocument();
    expect(screen.getByText("01012345678")).toBeInTheDocument();
    expect(screen.getByText("초기 버디 10%")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "계정 정지" })).toHaveLength(2);
    expect(screen.queryByRole("link", { name: "회원 정보 보기" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "운영 정보" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "등록 활동 이력 2건" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "약관 이력 2건" })).toBeInTheDocument();
    expect(screen.getByText("한강 야경 투어")).toBeInTheDocument();
    expect(mockedGetAuditLogs).toHaveBeenCalledWith(27, 0);
  });

  it("수수료 정책을 10%와 20% 중 직접 선택하게 한다", async () => {
    mockBuddyRequests({
      status: "success",
      auditLogs: {
        logs: [],
        totalElements: 0,
        totalPages: 0,
        page: 0,
        size: 20,
        hasNext: false,
      },
    });

    renderWithQueryClient(<AdminBuddyDetailView buddyId="9" />);

    fireEvent.click(await screen.findByRole("button", { name: "변경" }));

    expect(screen.getByRole("heading", { name: "수수료 정책 변경" })).toBeInTheDocument();
    expect(
      screen.queryByText(
        "변경 이후 새로 생성되는 결제부터 적용되며 기존 결제와 정산 금액은 바뀌지 않습니다.",
      ),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "초기 버디 10%" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("button", { name: "수수료 정책 변경" })).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: "일반 20%" }));
    fireEvent.change(screen.getByRole("textbox", { name: "변경 사유" }), {
      target: { value: "초기 운영 정책 종료" },
    });

    expect(screen.getByRole("radio", { name: "일반 20%" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "수수료 정책 변경" })).toBeEnabled();
  });

  it("감사 로그 목록을 표시한다", async () => {
    mockBuddyRequests({
      status: "success",
      auditLogs: {
        logs: [
          {
            auditLogId: 104,
            adminId: 1,
            adminName: "김관리",
            adminEmail: "admin@hanbuddy.kr",
            action: "BUDDY_COMMISSION_CHANGED",
            targetType: "USER",
            targetId: 27,
            reason: "운영 정책 변경",
            createdAt: "2026-09-01T15:00:00+09:00",
          },
          {
            auditLogId: 105,
            adminId: 1,
            adminName: "김관리",
            adminEmail: "admin@hanbuddy.kr",
            action: "BUDDY_APPLICATION_APPROVED",
            targetType: "USER",
            targetId: 27,
            reason: null,
            createdAt: "2026-09-01T14:00:00+09:00",
          },
        ],
        totalElements: 2,
        totalPages: 1,
        page: 0,
        size: 20,
        hasNext: false,
      },
    });

    renderWithQueryClient(<AdminBuddyDetailView buddyId="9" />);

    expect(await screen.findByText("수수료 정책 변경")).toBeInTheDocument();
    expect(screen.getByText("버디 가입 승인")).toBeInTheDocument();
    expect(screen.getAllByText("사유:")).toHaveLength(2);
    expect(screen.getByText("운영 정책 변경")).toBeInTheDocument();
    expect(screen.getAllByText("작업자:")).toHaveLength(2);
    expect(screen.getAllByText("김관리(admin@hanbuddy.kr)")).toHaveLength(2);
  });
});
