import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminAuditLogs, getAdminUser, getAdminUserHistory } from "@/lib/api/admin";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { AdminUserDetail } from "@/types/admin";
import { AdminUserDetailView } from "./user-detail-view";

vi.mock("@/lib/api/admin", () => ({
  getAdminAuditLogs: vi.fn(),
  getAdminUser: vi.fn(),
  getAdminUserHistory: vi.fn(),
  reactivateAdminUser: vi.fn(),
  suspendAdminUser: vi.fn(),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace: vi.fn() }),
}));

const mockedGetAdminUser = vi.mocked(getAdminUser);
const mockedGetAdminUserHistory = vi.mocked(getAdminUserHistory);
const mockedGetAdminAuditLogs = vi.mocked(getAdminAuditLogs);

const PAGE = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  page: 0,
  size: 20,
  hasNext: false,
};

function user(userType: AdminUserDetail["userType"]): AdminUserDetail {
  return {
    userId: 11,
    email: "member@gmail.com",
    name: "Google Name",
    displayName: "한버디",
    userType,
    accountStatus: "ACTIVE",
    nationalityCode: "KR",
    birthDate: "1998-04-12",
    contactMethod: "PHONE",
    contactCountryCode: null,
    contactIdentifier: "member@gmail.com",
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    suspensionReason: null,
    suspendedAt: null,
    suspendedBy: null,
    activityCount: userType === "BUDDY" ? 2 : 0,
    applicationCount: userType === "TOURIST" ? 1 : 0,
    paymentCount: userType === "TOURIST" ? 1 : 0,
    reviewCount: 0,
    agreementCount: 1,
    createdAt: "2026-08-01T10:00:00+09:00",
    updatedAt: "2026-08-02T10:00:00+09:00",
  };
}

describe("AdminUserDetailView", () => {
  beforeEach(() => {
    mockedGetAdminUser.mockReset();
    mockedGetAdminUserHistory.mockReset();
    mockedGetAdminAuditLogs.mockReset();
    mockedGetAdminUserHistory.mockResolvedValue({ status: "success", history: PAGE });
    mockedGetAdminAuditLogs.mockResolvedValue({
      status: "success",
      auditLogs: { ...PAGE, logs: [] },
    });
  });

  it("shows and immediately loads tourist histories", async () => {
    mockedGetAdminUser.mockResolvedValue({ status: "success", user: user("TOURIST") });

    renderWithQueryClient(<AdminUserDetailView userId="11" />);

    expect(await screen.findByRole("button", { name: "신청" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "결제" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "등록 활동" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "연락" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "상태" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "연락 및 상태" })).not.toBeInTheDocument();
    expect(screen.getByText("대한민국")).toBeInTheDocument();
    expect(screen.getByText("1998. 4. 12.")).toBeInTheDocument();
    expect(screen.getByText("상태 변경일")).toBeInTheDocument();
    expect(mockedGetAdminUserHistory).toHaveBeenCalledWith("11", "applications", 0);
  });

  it("does not display the previous tab data as generic history while switching tabs", async () => {
    mockedGetAdminUser.mockResolvedValue({ status: "success", user: user("TOURIST") });
    mockedGetAdminUserHistory.mockImplementation((_userId, type) => {
      if (type === "applications") {
        return Promise.resolve({
          status: "success",
          history: {
            ...PAGE,
            content: [
              {
                applicationId: 31,
                activityId: 2,
                activityTitle: "한강 투어",
                scheduleId: 8,
                scheduleStartAt: "2026-09-08T17:30:00+09:00",
                guestCount: 1,
                status: "PENDING_PAYMENT",
                cancellationReason: null,
                cancellationDetail: null,
                createdAt: "2026-09-04T13:30:00+09:00",
              },
            ],
            totalElements: 1,
          },
        });
      }
      return new Promise(() => undefined);
    });

    renderWithQueryClient(<AdminUserDetailView userId="11" />);

    expect(await screen.findByText("한강 투어")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "결제" }));

    expect(screen.queryByText("이력")).not.toBeInTheDocument();
    expect(screen.getByLabelText("불러오는 중")).toBeInTheDocument();
  });

  it("shows and immediately loads buddy histories", async () => {
    mockedGetAdminUser.mockResolvedValue({ status: "success", user: user("BUDDY") });

    renderWithQueryClient(<AdminUserDetailView userId="11" />);

    expect(await screen.findByRole("button", { name: "등록 활동" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.queryByRole("button", { name: "신청" })).not.toBeInTheDocument();
    expect(mockedGetAdminUserHistory).toHaveBeenCalledWith("11", "activities", 0);
  });
});
