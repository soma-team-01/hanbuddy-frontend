import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAdminAuditLogs,
  getAdminBuddy,
  reactivateAdminUser,
  suspendAdminUser,
  updateAdminBuddyCommission,
} from "@/lib/api/admin";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { AdminBuddyDetailView } from "./buddy-detail-view";

vi.mock("@/lib/api/admin", () => ({
  getAdminAuditLogs: vi.fn(),
  getAdminBuddy: vi.fn(),
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
}

describe("AdminBuddyDetailView", () => {
  beforeEach(() => {
    mockedGetBuddy.mockReset();
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
    expect(screen.getByRole("button", { name: "계정 정지" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "회원 정보 보기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "운영 성과" })).not.toBeInTheDocument();
    expect(mockedGetAuditLogs).toHaveBeenCalledWith(27, 0);
  });

  it("감사 로그 목록을 표시한다", async () => {
    mockBuddyRequests({
      status: "success",
      auditLogs: {
        logs: [
          {
            auditLogId: 104,
            adminId: 1,
            action: "BUDDY_COMMISSION_CHANGED",
            targetType: "USER",
            targetId: 27,
            reason: "운영 정책 변경",
            createdAt: "2026-09-01T15:00:00+09:00",
          },
        ],
        totalElements: 1,
        totalPages: 1,
        page: 0,
        size: 20,
        hasNext: false,
      },
    });

    renderWithQueryClient(<AdminBuddyDetailView buddyId="9" />);

    expect(await screen.findByText("수수료 정책 변경")).toBeInTheDocument();
    expect(screen.getByText("운영 정책 변경")).toBeInTheDocument();
  });
});
