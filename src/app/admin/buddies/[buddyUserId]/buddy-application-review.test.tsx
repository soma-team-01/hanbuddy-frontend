import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  approveBuddyApplication,
  getBuddyApplicationForAdmin,
  rejectBuddyApplication,
} from "@/lib/api/admin";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { BuddyApplicationReview } from "./buddy-application-review";

const routerMock = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/admin", () => ({
  approveBuddyApplication: vi.fn(),
  getBuddyApplicationForAdmin: vi.fn(),
  rejectBuddyApplication: vi.fn(),
}));

const mockedApprove = vi.mocked(approveBuddyApplication);
const mockedGetApplication = vi.mocked(getBuddyApplicationForAdmin);
const mockedReject = vi.mocked(rejectBuddyApplication);

describe("BuddyApplicationReview", () => {
  beforeEach(() => {
    routerMock.push.mockReset();
    routerMock.replace.mockReset();
    mockedApprove.mockReset();
    mockedGetApplication.mockReset();
    mockedReject.mockReset();
    mockedGetApplication.mockResolvedValue({
      status: "success",
      application: {
        userId: 42,
        email: "buddy@example.com",
        name: "김버디",
        profileImageUrl: null,
        nationalityCode: "KR",
        birthDate: "1995-01-02",
        contactMethod: "WHATSAPP",
        contactCountryCode: "+82",
        contactIdentifier: "buddy-id",
        accountStatus: "PENDING_APPROVAL",
        appliedAt: "2026-08-05T15:30:00Z",
        reviewedAt: null,
        reviewedByUserId: null,
        reviewedByName: null,
        rejectionReason: null,
      },
    });
  });

  it("guides an expired admin session back to login", async () => {
    mockedGetApplication.mockResolvedValue({ status: "unauthenticated" });

    renderWithQueryClient(<BuddyApplicationReview userId="42" />);

    fireEvent.click(await screen.findByRole("button", { name: "다시 로그인" }));
    expect(routerMock.replace).toHaveBeenCalledWith("/admin/login");
    expect(screen.queryByRole("link", { name: "목록으로 돌아가기" })).not.toBeInTheDocument();
  });

  it("renders the applicant profile and approval actions", async () => {
    renderWithQueryClient(<BuddyApplicationReview userId="42" />);

    expect(await screen.findByRole("heading", { name: "김버디" })).toBeInTheDocument();
    expect(screen.getByText("buddy@example.com")).toBeInTheDocument();
    expect(screen.getByText(/^2026년 8월 6일 .*12:30$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "버디 승인" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "거절" })).toBeInTheDocument();
  });

  it("requires a reason before rejecting and returns to the list after success", async () => {
    mockedReject.mockResolvedValue({ status: "success", message: "거절되었습니다." });
    renderWithQueryClient(<BuddyApplicationReview userId="42" />);

    fireEvent.click(await screen.findByRole("button", { name: "거절" }));
    const submit = screen.getByRole("button", { name: "거절하기" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("거절 사유"), {
      target: { value: "프로필 확인이 필요합니다." },
    });
    fireEvent.click(submit);

    await waitFor(() =>
      expect(mockedReject).toHaveBeenCalledWith("42", {
        reason: "프로필 확인이 필요합니다.",
      }),
    );
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/admin/buddies"));
  });
});
