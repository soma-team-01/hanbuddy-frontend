import { screen } from "@testing-library/react";
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
    birthYear: 1998,
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
    expect(mockedGetAdminUserHistory).toHaveBeenCalledWith("11", "applications", 0);
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
