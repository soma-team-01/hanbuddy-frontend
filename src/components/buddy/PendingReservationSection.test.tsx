import { fireEvent, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { PendingReservationSection, type PendingReservation } from "./PendingReservationSection";

vi.mock("@/lib/query/use-auth-query-redirect", () => ({ useAuthQueryRedirect: vi.fn() }));
const request: PendingReservation = {
  activityId: 42,
  activityTitle: "Seoul walk",
  activityScheduleId: 9,
  startAt: "2099-10-20T10:00:00+09:00",
  applicant: {
    applicationId: 7,
    applicantName: "Sophie",
    applicantProfileImageUrl: null,
    guestCount: 2,
    status: "PENDING_APPROVAL",
    approvalExpiresAt: "2099-10-19T10:00:00+09:00",
    specialRequest: "Vegetarian, please.",
  },
};
it("keeps pending requests across different dates in a separate compact section", () => {
  renderWithQueryClient(
    <PendingReservationSection
      requests={[
        request,
        {
          ...request,
          startAt: "2099-11-22T15:00:00+09:00",
          applicant: { ...request.applicant, applicationId: 8, applicantName: "Alex" },
        },
      ]}
    />,
  );
  const section = screen.getByRole("region", { name: /New booking requests/ });
  expect(within(section).getByText("Sophie")).toBeInTheDocument();
  expect(within(section).getByText("Alex")).toBeInTheDocument();
  expect(within(section).queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  expect(within(section).queryByText("Vegetarian, please.")).not.toBeInTheDocument();
});
it("excludes confirmed applicants and expands the complete pending list", () => {
  const requests = Array.from({ length: 4 }, (_, index) => ({
    ...request,
    applicant: { ...request.applicant, applicationId: index, applicantName: `Guest ${index}` },
  }));
  renderWithQueryClient(
    <PendingReservationSection
      requests={[
        ...requests,
        { ...request, applicant: { ...request.applicant, status: "CONFIRMED" } },
      ]}
    />,
  );
  expect(screen.queryByText("Sophie")).not.toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(4);
  for (const item of screen.getAllByRole("listitem")) {
    expect(item).toHaveClass("w-52", "md:w-64");
    expect(item).not.toHaveClass("hidden");
  }
  expect(screen.getByRole("list")).toHaveClass("overflow-x-auto");
  expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute(
    "href",
    "/en/dashboard/requests",
  );
});
it("keeps full-size cards and every request in the complete list", () => {
  renderWithQueryClient(
    <PendingReservationSection
      view="list"
      requests={Array.from({ length: 6 }, (_, index) => ({
        ...request,
        applicant: { ...request.applicant, applicationId: index, applicantName: `Guest ${index}` },
      }))}
    />,
  );
  const items = screen.getAllByRole("listitem");
  expect(items).toHaveLength(6);
  for (const item of items) {
    expect(item).not.toHaveClass("hidden", "w-52");
    expect(within(item).getByRole("button")).toHaveClass("p-4", "flex-col");
  }
  expect(screen.getByRole("button", { name: /Guest 5/ })).toHaveTextContent("Seoul walk");
});
it("uses confirmation deadline wording and booking action labels in Korean", () => {
  renderWithQueryClient(<PendingReservationSection requests={[request]} />, { locale: "ko" });
  fireEvent.click(screen.getByRole("button", { name: /Sophie/ }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText(/확정 마감 기한:/)).toBeInTheDocument();
  expect(
    within(dialog).getByText("기한 내 예약을 확정하지 않으면 신청이 자동 취소돼요."),
  ).toBeInTheDocument();
  expect(within(dialog).getByRole("button", { name: "예약 거절" })).toBeEnabled();
  expect(within(dialog).getByRole("button", { name: "예약 승인" })).toBeEnabled();
});
it("opens details and approval actions only when a request is selected", () => {
  renderWithQueryClient(<PendingReservationSection requests={[request]} />);
  expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute(
    "href",
    "/en/dashboard/requests",
  );
  fireEvent.click(screen.getByRole("button", { name: /Sophie/ }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("Vegetarian, please.")).toBeInTheDocument();
  expect(within(dialog).getByRole("button", { name: "Approve" })).toBeEnabled();
  expect(within(dialog).queryByRole("link", { name: "View activity" })).not.toBeInTheDocument();
  expect(
    within(dialog).getByText("Requests not approved by the deadline are automatically cancelled."),
  ).toBeInTheDocument();
  const reject = within(dialog).getByRole("button", { name: "Decline" });
  const approve = within(dialog).getByRole("button", { name: "Approve" });
  expect(reject.compareDocumentPosition(approve) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(reject.parentElement).toHaveClass("grid", "grid-cols-2");
});
it("uses the server total and allows loading the remaining requests", () => {
  const more = vi.fn();
  renderWithQueryClient(
    <PendingReservationSection
      view="list"
      requests={[request]}
      totalCount={24}
      hasMore
      onLoadMore={more}
    />,
  );
  expect(screen.getByRole("heading", { name: /New booking requests/ })).toHaveTextContent("24");
  fireEvent.click(screen.getByRole("button", { name: "Load more" }));
  expect(more).toHaveBeenCalledOnce();
});
it("removes the selected dialog when the request disappears after a refresh", () => {
  const { rerender } = renderWithQueryClient(<PendingReservationSection requests={[request]} />);
  fireEvent.click(screen.getByRole("button", { name: /Sophie/ }));
  rerender(<PendingReservationSection requests={[]} />);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("No requests awaiting approval.")).toBeInTheDocument();
});
it("never labels a failed or loading list as zero requests", () => {
  const retry = vi.fn();
  const { rerender } = renderWithQueryClient(<PendingReservationSection requests={[]} loading />);
  expect(screen.queryByText("No requests awaiting approval.")).not.toBeInTheDocument();
  rerender(
    <PendingReservationSection requests={[]} error="Could not load requests" onRetry={retry} />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent("Could not load requests");
  expect(screen.queryByText("0")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Refresh status" }));
  expect(retry).toHaveBeenCalledOnce();
});
