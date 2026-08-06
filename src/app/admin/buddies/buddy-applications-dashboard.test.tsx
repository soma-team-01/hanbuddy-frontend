import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBuddyApplicationsForAdmin } from "@/lib/api/admin";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { BuddyApplicationsDashboard } from "./buddy-applications-dashboard";

vi.mock("@/lib/api/admin", () => ({
  getBuddyApplicationsForAdmin: vi.fn(),
}));

const mockedGetApplications = vi.mocked(getBuddyApplicationsForAdmin);
const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMock,
}));

describe("BuddyApplicationsDashboard", () => {
  beforeEach(() => {
    mockedGetApplications.mockReset();
    routerMock.replace.mockReset();
  });

  it("guides an expired admin session back to login", async () => {
    mockedGetApplications.mockResolvedValue({ status: "unauthenticated" });

    renderWithQueryClient(<BuddyApplicationsDashboard />);

    fireEvent.click(await screen.findByRole("button", { name: "다시 로그인" }));
    expect(routerMock.replace).toHaveBeenCalledWith("/admin/login");
    expect(screen.queryByRole("button", { name: "다시 시도" })).not.toBeInTheDocument();
  });

  it("shows the empty state when there are no applications", async () => {
    mockedGetApplications.mockResolvedValue({ status: "success", applications: [] });

    renderWithQueryClient(<BuddyApplicationsDashboard />);

    expect(await screen.findByText("새로운 버디 신청이 없습니다.")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders pending applications and links to their review page", async () => {
    mockedGetApplications.mockResolvedValue({
      status: "success",
      applications: [
        {
          userId: 42,
          email: "buddy@example.com",
          name: "김버디",
          nationalityCode: "KR",
          accountStatus: "PENDING_APPROVAL",
          appliedAt: "2026-08-06T10:00:00+09:00",
        },
      ],
    });

    renderWithQueryClient(<BuddyApplicationsDashboard />);

    expect(await screen.findByText("김버디")).toBeInTheDocument();
    expect(screen.getByText("buddy@example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "프로필 보기" })).toHaveAttribute(
      "href",
      "/admin/buddies/42",
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
