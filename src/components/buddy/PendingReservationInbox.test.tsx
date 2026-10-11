import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { getBuddyPendingApprovals } from "@/lib/api/buddy";
import { approveApplication } from "@/lib/api/application-approval";
import type { BuddyPendingApprovalResponse } from "@/types/buddy";
import { PendingReservationInbox } from "./PendingReservationInbox";

vi.mock("@/lib/api/buddy", () => ({ getBuddyPendingApprovals: vi.fn() }));
vi.mock("@/lib/api/application-approval", () => ({
  approveApplication: vi.fn(),
  rejectApplication: vi.fn(),
}));
vi.mock("@/lib/query/use-auth-query-redirect", () => ({ useAuthQueryRedirect: vi.fn() }));
const request: BuddyPendingApprovalResponse = {
  applicationId: 1,
  activityId: 42,
  activityType: "STANDARD",
  activityTitle: "Seoul walk",
  thumbnailImageUrl: null,
  activityScheduleId: 9,
  startAt: "2099-10-20T10:00:00+09:00",
  applicantUserId: 3,
  applicantName: "Sophie",
  guestCount: 2,
  specialRequest: null,
  status: "PENDING_APPROVAL",
  appliedAt: "2099-10-19T09:00:00+09:00",
  approvalExpiresAt: "2099-10-19T21:00:00+09:00",
};
const first = {
  content: [request],
  totalElements: 21,
  totalPages: 2,
  page: 0,
  size: 20,
  hasNext: true,
};
beforeEach(() => vi.resetAllMocks());
it("loads further pages for both activity types without changing the server total", async () => {
  vi.mocked(getBuddyPendingApprovals).mockImplementation(async (page) => ({
    status: "success",
    page: page
      ? {
          ...first,
          page: 1,
          hasNext: false,
          content: [
            request,
            { ...request, applicationId: 2, activityType: "REFERRAL", applicantName: "Alex" },
          ],
        }
      : first,
  }));
  renderWithQueryClient(<PendingReservationInbox view="list" />);
  await screen.findByText("Sophie");
  expect(screen.getByRole("heading")).toHaveTextContent("21");
  fireEvent.click(screen.getByRole("button", { name: "Load more" }));
  await screen.findByText("Alex");
  expect(screen.getAllByText("Sophie")).toHaveLength(1);
  expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  expect(getBuddyPendingApprovals).toHaveBeenCalledWith(1);
});
it("removes an approved request after refetch and invalidates the date calendar", async () => {
  vi.mocked(getBuddyPendingApprovals).mockResolvedValue({
    status: "success",
    page: { ...first, hasNext: false },
  });
  const { queryClient } = renderWithQueryClient(<PendingReservationInbox view="list" />);
  queryClient.setQueryData(["buddy", "applications", "date", "2099-10-20", "EN"], []);
  await screen.findByText("Sophie");
  fireEvent.click(screen.getByRole("button", { name: /Sophie/ }));
  vi.mocked(approveApplication).mockResolvedValue(undefined);
  vi.mocked(getBuddyPendingApprovals).mockResolvedValue({
    status: "success",
    page: { ...first, content: [], totalElements: 0, hasNext: false },
  });
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Approve" }));
  await screen.findByText("No requests awaiting approval.");
  expect(approveApplication).toHaveBeenCalledWith(1);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(
    queryClient.getQueryState(["buddy", "applications", "date", "2099-10-20", "EN"])?.isInvalidated,
  ).toBe(true);
});
it("keeps loaded requests when another page fails and offers a retry", async () => {
  vi.mocked(getBuddyPendingApprovals).mockImplementation(async (page) => {
    if (page) throw new Error("offline");
    return { status: "success", page: first };
  });
  const { queryClient } = renderWithQueryClient(<PendingReservationInbox view="list" />);
  queryClient.setDefaultOptions({ queries: { retry: false } });
  await screen.findByText("Sophie");
  fireEvent.click(screen.getByRole("button", { name: "Load more" }));
  await screen.findByRole("alert");
  expect(screen.getByText("Sophie")).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole("button", { name: "Refresh status" })).toBeEnabled());
});
