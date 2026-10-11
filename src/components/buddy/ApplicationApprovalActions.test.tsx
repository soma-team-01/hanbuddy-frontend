import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { ApplicationApprovalActions } from "./ApplicationApprovalActions";
import { approveApplication, rejectApplication } from "@/lib/api/application-approval";
import { createApiClientError } from "@/lib/api/errors";
vi.mock("@/lib/api/application-approval", () => ({
  approveApplication: vi.fn(),
  rejectApplication: vi.fn(),
}));
vi.mock("@/lib/query/use-auth-query-redirect", () => ({ useAuthQueryRedirect: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
it("hides approval actions after ownership is denied", async () => {
  vi.mocked(approveApplication).mockRejectedValue(
    createApiClientError(403, {
      isSuccess: false,
      code: "ACTIVITY403_OWNER",
      message: "forbidden",
    }),
  );
  renderWithQueryClient(<ApplicationApprovalActions applicationId={7} name="Sophie" />);
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  await screen.findByRole("alert");
  expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Decline" })).not.toBeInTheDocument();
});
it("approves once, locks both actions and refreshes related queries", async () => {
  let finish!: () => void;
  vi.mocked(approveApplication).mockReturnValue(
    new Promise<void>((resolve) => {
      finish = resolve;
    }),
  );
  const { queryClient } = renderWithQueryClient(
    <ApplicationApprovalActions
      applicationId={7}
      name="Sophie"
      expiresAt="2099-10-12T09:00:00+09:00"
    />,
  );
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const approve = screen.getByRole("button", { name: "Approve" });
  fireEvent.click(approve);
  fireEvent.click(approve);
  await waitFor(() => expect(approveApplication).toHaveBeenCalledExactlyOnceWith(7));
  expect(screen.getByRole("button", { name: "Decline" })).toBeDisabled();
  finish();
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["buddy"] }));
});
it("requires a reason and custom text, then sends the application ID", async () => {
  vi.mocked(rejectApplication).mockResolvedValue(undefined);
  renderWithQueryClient(<ApplicationApprovalActions applicationId={7} name="Sophie" />);
  fireEvent.click(screen.getByRole("button", { name: "Decline" }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByRole("button", { name: "Decline" })).toBeDisabled();
  fireEvent.click(within(dialog).getByRole("radio", { name: "Other reason" }));
  fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "Venue closed" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Decline" }));
  await waitFor(() =>
    expect(rejectApplication).toHaveBeenCalledWith(7, {
      reason: "BUDDY_OTHER",
      detail: "Venue closed",
    }),
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
it("locks expired actions without claiming cancellation or a completed refund", () => {
  renderWithQueryClient(
    <ApplicationApprovalActions
      applicationId={7}
      name="Sophie"
      expiresAt="2000-01-01T00:00:00+09:00"
    />,
  );
  expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
  expect(screen.getByText(/Checking status/)).toBeInTheDocument();
  expect(approveApplication).not.toHaveBeenCalled();
});
it("locks after server expiry and refreshes without optimistic approval", async () => {
  vi.mocked(approveApplication).mockRejectedValue(
    createApiClientError(409, {
      isSuccess: false,
      code: "APPLICATION409_APPROVAL_EXPIRED",
      message: "expired",
    }),
  );
  const { queryClient } = renderWithQueryClient(
    <ApplicationApprovalActions applicationId={7} name="Sophie" />,
  );
  const refresh = vi.spyOn(queryClient, "invalidateQueries");
  fireEvent.click(screen.getByRole("button", { name: "Approve" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("button", { name: "Approve" })).toBeDisabled();
  expect(refresh).toHaveBeenCalledWith({ queryKey: ["applications"] });
});
