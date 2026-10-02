import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { ReferralBookingForm } from "./ReferralBookingForm";
import { getReferralNotice, submitReferralApplication } from "@/lib/api/referral";
import { createApiClientError } from "@/lib/api/errors";
import type { Activity } from "@/types/activity";
import type { ApplicationResponse } from "@/types/application";
vi.mock("@/lib/api/referral", () => ({
  getReferralNotice: vi.fn(),
  submitReferralApplication: vi.fn(),
}));
vi.mock("next/navigation", async (original) => ({
  ...(await original<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/en/activities/3/book",
}));
const notice = {
  activityId: 3,
  partnerUserId: 7,
  partnerName: "Seoul studio",
  serviceNotice: "Service fees are confirmed separately.",
  consentVersion: "live-v3",
  sharedFields: ["Name", "Contact"],
  purpose: "Contact for consultation",
};
const activity: Activity = {
  id: "3",
  activityType: "REFERRAL",
  title: "Seoul studio visit",
  description: "Visit a studio",
  imageUrl: "",
  heroImageUrl: "",
  location: "Seoul",
  district: "Seoul",
  price: 0,
  host: { name: "Seoul studio", bio: "", avatarUrl: null },
  included: [],
  restrictions: [],
  meetingPoint: { name: "Studio", area: "Seoul" },
  sessions: [
    {
      id: "12",
      startAt: "2099-10-10T14:00:00+09:00",
      dateLabel: "October 10",
      timeLabel: "2 PM",
      spotsLeft: 3,
    },
  ],
};
beforeEach(() => {
  vi.mocked(getReferralNotice).mockReset().mockResolvedValue({ status: "success", data: notice });
  vi.mocked(submitReferralApplication)
    .mockReset()
    .mockResolvedValue({
      status: "success",
      data: { applicationId: 1, status: "CONFIRMED" } as ApplicationResponse,
    });
});
async function ready() {
  renderWithQueryClient(<ReferralBookingForm activity={activity} initialSessionId="12" />);
  await screen.findByText("Contact for consultation");
  await waitFor(() => expect(screen.getByRole("checkbox")).toBeEnabled());
}
describe("referral application form", () => {
  it("requires explicit agreement and uses the current backend version without any payment UI", async () => {
    await ready();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(screen.queryByText(/PayPal|Toss|Refund policy/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await screen.findByText("Your application has been received.");
    expect(submitReferralApplication).toHaveBeenCalledExactlyOnceWith("3", {
      activityScheduleId: 12,
      guestCount: 2,
      partnerSharingAgreed: true,
      consentVersion: "live-v3",
    });
  });
  it.each(["CANCELLED", "COMPLETED"] as const)(
    "does not show confirmation for returned %s applications",
    async (status) => {
      vi.mocked(submitReferralApplication).mockResolvedValue({
        status: "success",
        data: { status } as ApplicationResponse,
      });
      await ready();
      fireEvent.click(screen.getByRole("checkbox"));
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));
      await screen.findByRole("link", { name: "View my applications" });
      expect(screen.queryByText("Your application has been received.")).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(
        status === "CANCELLED" ? "cannot reapply" : "already ended",
      );
    },
  );
  it("refreshes consent and requires a new checkbox action after a version error", async () => {
    vi.mocked(submitReferralApplication).mockResolvedValueOnce({
      status: "error",
      error: createApiClientError(400, {
        isSuccess: false,
        code: "APPLICATION400_REFERRAL_CONSENT",
        message: "outdated",
      }),
    });
    await ready();
    vi.mocked(getReferralNotice).mockResolvedValue({
      status: "success",
      data: { ...notice, consentVersion: "live-v4" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await screen.findByText(
      "The notice has changed. Review the latest information and agree again.",
    );
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    await waitFor(() => expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled());
  });
  it("blocks excess participants and repeated submits while the request is in flight", async () => {
    await ready();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "4" } });
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "1" } });
    vi.mocked(submitReferralApplication).mockImplementation(() => new Promise(() => {}));
    const form = screen.getByRole("button", { name: "Apply" }).closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(submitReferralApplication).toHaveBeenCalledTimes(1);
  });
});
