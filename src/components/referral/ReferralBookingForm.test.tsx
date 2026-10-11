import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { ReferralBookingForm } from "./ReferralBookingForm";
import { getReferralNotice, submitReferralApplication } from "@/lib/api/referral";
import { createApiClientError } from "@/lib/api/errors";
import { getMyApplications } from "@/lib/api/applications";
import type { Activity } from "@/types/activity";
import type { ApplicationResponse } from "@/types/application";
vi.mock("@/lib/api/referral", () => ({
  getReferralNotice: vi.fn(),
  submitReferralApplication: vi.fn(),
}));
vi.mock("@/lib/api/applications", () => ({ getMyApplications: vi.fn() }));
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
      dateKey: "2099-10-10",
      dateLabel: "October 10",
      timeLabel: "2 PM",
      spotsLeft: 3,
    },
  ],
};
beforeEach(() => {
  vi.mocked(getMyApplications)
    .mockReset()
    .mockResolvedValue({ status: "success", applications: [] });
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
  await waitFor(() =>
    expect(screen.getByRole("checkbox", { name: /share personal data/i })).toBeEnabled(),
  );
}
function acknowledgeApproval() {
  const checkbox = screen.getByRole("checkbox", { name: /Buddy approval is required/i });
  if (!(checkbox as HTMLInputElement).checked) fireEvent.click(checkbox);
}

describe("referral application form", () => {
  it("translates the server's versioned Korean notice and explains approval before submission", async () => {
    vi.mocked(getReferralNotice).mockResolvedValue({
      status: "success",
      data: {
        ...notice,
        consentVersion: "referral-v1",
        serviceNotice: "실제 서비스 요금과 예약은 업체 상담 후 별도로 확정됩니다.",
        purpose: "업체의 상담 연락 및 신청 확인",
      },
    });
    renderWithQueryClient(<ReferralBookingForm activity={activity} initialSessionId="12" />);
    expect(
      await screen.findByText("Provider contact for consultation and application confirmation"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Service fees and the final booking will be confirmed separately with the provider.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("업체의 상담 연락 및 신청 확인")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "I understand that submitting a request does not confirm my booking. Buddy approval is required.",
      ),
    ).toBeInTheDocument();
    expect(submitReferralApplication).not.toHaveBeenCalled();
  });
  const cancelled = (id: number, overrides: Partial<ApplicationResponse> = {}) =>
    ({
      applicationId: id,
      activityId: 3,
      activityScheduleId: 12,
      activityType: "REFERRAL",
      status: "CANCELLED",
      ...overrides,
    }) as ApplicationResponse;

  it("requires approval acknowledgment as well as provider sharing consent", async () => {
    await ready();
    fireEvent.click(screen.getByRole("checkbox", { name: /share personal data/i }));
    const submit = screen.getByRole("button", { name: "Apply" });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(submitReferralApplication).not.toHaveBeenCalled();
    acknowledgeApproval();
    expect(submit).toBeEnabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /Buddy approval is required/i }));
    expect(submit).toBeDisabled();
  });

  it.each(["CANCELLED", "REJECTED", "EXPIRED"] as const)(
    "explicitly reapplies using the highest %s ID for this activity and session",
    async (status) => {
      vi.mocked(getMyApplications).mockResolvedValue({
        status: "success",
        applications: [
          cancelled(7, { status }),
          cancelled(99, { activityScheduleId: 13 }),
          cancelled(5),
          cancelled(100, { activityId: 4 }),
        ],
      });
      await ready();
      const button = await screen.findByRole("button", { name: "Reapply" });
      expect(button).toBeDisabled();
      expect(screen.getByRole("checkbox", { name: /share personal data/i })).not.toBeChecked();
      expect(submitReferralApplication).not.toHaveBeenCalled();
      acknowledgeApproval();
      fireEvent.click(screen.getByRole("checkbox", { name: /share personal data/i }));
      fireEvent.click(button);
      await waitFor(() =>
        expect(submitReferralApplication).toHaveBeenCalledExactlyOnceWith("3", {
          activityScheduleId: 12,
          guestCount: 1,
          partnerSharingAgreed: true,
          consentVersion: "live-v3",
          reapplyFromApplicationId: 7,
        }),
      );
    },
  );

  it.each([
    { status: "PENDING_APPROVAL" as const },
    { status: "CONFIRMED" as const },
    { scheduleCancelled: true },
    { cancellationReason: "BUDDY_CANCELLATION" as const },
  ])(
    "blocks reapplication for an active application or a cancelled session: %j",
    async (overrides) => {
      vi.mocked(getMyApplications).mockResolvedValue({
        status: "success",
        applications: [cancelled(7, overrides)],
      });
      await ready();
      acknowledgeApproval();
      fireEvent.click(screen.getByRole("checkbox", { name: /share personal data/i }));
      expect(screen.getByRole("button", { name: /^(Apply|Reapply)$/ })).toBeDisabled();
      expect(screen.getByRole("link", { name: "View my applications" })).toBeInTheDocument();
      expect(submitReferralApplication).not.toHaveBeenCalled();
    },
  );

  it("refreshes a stale reapplication ID but never retries without renewed consent and a click", async () => {
    vi.mocked(getMyApplications).mockResolvedValue({
      status: "success",
      applications: [cancelled(7)],
    });
    vi.mocked(submitReferralApplication).mockResolvedValueOnce({
      status: "error",
      error: createApiClientError(409, {
        isSuccess: false,
        code: "APPLICATION409_REFERRAL_REAPPLICATION",
        message: "stale",
      }),
    });
    await ready();
    acknowledgeApproval();
    fireEvent.click(screen.getByRole("checkbox", { name: /share personal data/i }));
    vi.mocked(getMyApplications).mockResolvedValue({
      status: "success",
      applications: [cancelled(9)],
    });
    fireEvent.click(screen.getByRole("button", { name: "Reapply" }));
    await screen.findByRole("alert");
    await waitFor(() => expect(getMyApplications).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("checkbox", { name: /share personal data/i })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Reapply" })).toBeDisabled();
    expect(submitReferralApplication).toHaveBeenCalledTimes(1);
    acknowledgeApproval();
    fireEvent.click(screen.getByRole("checkbox", { name: /share personal data/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Reapply" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Reapply" }));
    await waitFor(() =>
      expect(submitReferralApplication).toHaveBeenLastCalledWith(
        "3",
        expect.objectContaining({ reapplyFromApplicationId: 9 }),
      ),
    );
  });

  it("fails closed when application history cannot be checked", async () => {
    vi.mocked(getMyApplications).mockResolvedValue({
      status: "error",
      error: createApiClientError(503, { isSuccess: false, code: "COMMON503", message: "offline" }),
    });
    await ready();
    await screen.findByRole("alert");
    acknowledgeApproval();
    fireEvent.click(screen.getByRole("checkbox", { name: /share personal data/i }));
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
  it.each([0, 5000])(
    "shows the shared confirmation with service price %s, not payment totals",
    async (price) => {
      vi.mocked(submitReferralApplication).mockResolvedValue({
        status: "success",
        data: {
          applicationId: 1,
          status: "PENDING_APPROVAL",
          activityTitle: "Saved studio visit",
          buddyName: "Saved buddy",
          thumbnailImageUrl: null,
          startAt: "2099-10-10T14:00:00+09:00",
          guestCount: 2,
          specialRequest: "Please call on arrival.",
          price: 0,
          totalPrice: 0,
          currency: "KRW",
        } as ApplicationResponse,
      });
      renderWithQueryClient(
        <ReferralBookingForm activity={{ ...activity, price }} initialSessionId="12" />,
      );
      await screen.findByText("Contact for consultation");
      acknowledgeApproval();
      fireEvent.click(screen.getByRole("checkbox", { name: /share personal data/i }));
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));
      const result = await screen.findByTestId("referral-result");
      expect(result).toHaveClass("max-w-2xl", "rounded-3xl");
      expect(within(result).getByText("Saved studio visit")).toBeInTheDocument();
      expect(within(result).getByText("Please call on arrival.")).toBeInTheDocument();
      expect(within(result).getByText(price === 0 ? "Free" : "₩5,000~")).toBeInTheDocument();
      expect(
        within(result).queryByText(/Paid amount|Payment complete|₩0|₩10,000/),
      ).not.toBeInTheDocument();
      expect(within(result).getByRole("link", { name: "View My Applications" })).toHaveAttribute(
        "href",
        "/en/applications",
      );
      expect(within(result).getByRole("link", { name: "Explore More Activities" })).toHaveAttribute(
        "href",
        "/en/explore",
      );
    },
  );
  it("keeps the provider notice in a compact bordered table without changing consent", async () => {
    await ready();
    const noticePanel = screen.getByRole("region", {
      name: "Information shared with the provider",
    });
    expect(noticePanel).toHaveClass("rounded-xl", "border", "border-line-soft");
    expect(within(noticePanel).getByRole("heading")).toHaveClass("text-sm");
    expect(noticePanel.querySelector("dl")).toHaveClass("divide-y", "border", "rounded-md");
    expect(noticePanel.querySelectorAll("dl > div")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });
  it("keeps approval beside the action and uses a neutral numeric participant control", async () => {
    await ready();
    const bar = screen.getByTestId("bottom-action-bar");
    expect(
      within(bar)
        .getByRole("checkbox", { name: /Buddy approval is required/i })
        .closest("label"),
    ).toHaveClass("text-ink");
    expect(
      screen.getAllByText(
        "I understand that submitting a request does not confirm my booking. Buddy approval is required.",
      ),
    ).toHaveLength(1);
    expect(
      within(bar).getByRole("checkbox", { name: /share personal data/i }),
    ).toHaveAccessibleName("I agree to share personal data with the provider.");
    expect(screen.getByRole("button", { name: "Date and time" }).querySelector("span")).toHaveClass(
      "text-ink",
    );
    expect(screen.getByRole("status", { name: "1 participant" })).toHaveTextContent(/^1$/);
    expect(screen.getByRole("status", { name: "1 participant" })).toHaveClass("text-xl");
    for (const count of screen.getAllByText("1 participant")) {
      expect(count).toHaveClass("text-ink", "whitespace-nowrap");
    }
  });
  it("updates the summary and clamps participants when switching to a smaller session", async () => {
    vi.mocked(getMyApplications).mockResolvedValue({
      status: "success",
      applications: [cancelled(7)],
    });
    renderWithQueryClient(
      <ReferralBookingForm
        activity={{
          ...activity,
          sessions: [
            ...activity.sessions,
            {
              ...activity.sessions[0],
              id: "13",
              startAt: "2099-10-10T15:00:00+09:00",
              timeLabel: "3 PM",
              spotsLeft: 1,
            },
          ],
        }}
        initialSessionId="12"
      />,
    );
    await screen.findByText("Contact for consultation");
    await screen.findByRole("button", { name: "Reapply" });
    acknowledgeApproval();
    fireEvent.click(screen.getByRole("checkbox", { name: /share personal data/i }));
    fireEvent.click(screen.getByRole("button", { name: "Increase participants" }));
    fireEvent.click(screen.getByRole("button", { name: "Date and time" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /3 PM/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /share personal data/i })).not.toBeChecked();
    expect(within(screen.getByTestId("booking-panel")).getByText("3 PM")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Increase participants" })).toBeDisabled();
    acknowledgeApproval();
    fireEvent.click(screen.getByRole("checkbox", { name: /share personal data/i }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() =>
      expect(submitReferralApplication).toHaveBeenCalledWith("3", {
        activityScheduleId: 13,
        guestCount: 1,
        partnerSharingAgreed: true,
        consentVersion: "live-v3",
      }),
    );
  });

  it("keeps unavailable sessions and missing selections from being submitted", async () => {
    renderWithQueryClient(
      <ReferralBookingForm activity={{ ...activity, sessions: [] }} initialSessionId="12" />,
    );
    await screen.findByText("Contact for consultation");
    expect(screen.getByText("No sessions are available.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Date and time" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase participants" })).toBeDisabled();
    acknowledgeApproval();
    fireEvent.click(screen.getByRole("checkbox", { name: /share personal data/i }));
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });

  it("renders readable consent field labels while preserving unknown backend fields", async () => {
    vi.mocked(getReferralNotice).mockResolvedValue({
      status: "success",
      data: {
        ...notice,
        sharedFields: [
          "name",
          "contactMethod",
          "contactCountryCode",
          "contactIdentifier",
          "Other field",
        ],
      },
    });
    await ready();
    expect(
      screen.getByText("Name, Contact method, Country calling code, Contact details, Other field"),
    ).toBeInTheDocument();
    expect(screen.getAllByText(notice.serviceNotice)).toHaveLength(1);
  });

  it("uses the shared booking layout and calendar without payment or unsupported request fields", async () => {
    await ready();
    expect(screen.getByTestId("booking-layout")).toHaveClass(
      "lg:grid-cols-[minmax(0,36rem)_360px]",
    );
    const panel = within(screen.getByTestId("booking-panel"));
    expect(panel.getByText(activity.title)).toBeInTheDocument();
    expect(panel.getByText("Application details")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Special Requests" })).toHaveAttribute(
      "maxLength",
      "1000",
    );
    expect(screen.queryByText(/Refund policy|Total \(KRW\)|Pay now/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Date and time" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows Free rather than a starting price for zero, regardless of guest count", async () => {
    await ready();
    fireEvent.click(screen.getByRole("button", { name: "Increase participants" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase participants" }));
    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.queryByText(/From ₩|₩0|≈/)).not.toBeInTheDocument();
  });
  it("shows the optional message in the summary and submits it to the provider", async () => {
    await ready();
    fireEvent.change(
      screen.getByPlaceholderText("Leave a message for your buddy, if you have one."),
      { target: { value: "  Please meet us outside.  " } },
    );
    expect(
      within(screen.getByTestId("booking-panel")).getByText("Please meet us outside."),
    ).toBeInTheDocument();
    acknowledgeApproval();
    fireEvent.click(screen.getByRole("checkbox", { name: /share personal data/i }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() =>
      expect(submitReferralApplication).toHaveBeenCalledWith("3", {
        activityScheduleId: 12,
        guestCount: 1,
        partnerSharingAgreed: true,
        consentVersion: "live-v3",
        specialRequest: "Please meet us outside.",
      }),
    );
  });

  it("does not multiply the service starting price by the selected guest count", async () => {
    renderWithQueryClient(
      <ReferralBookingForm activity={{ ...activity, price: 5000 }} initialSessionId="12" />,
    );
    await screen.findByText("Contact for consultation");
    fireEvent.click(screen.getByRole("button", { name: "Increase participants" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase participants" }));
    expect(screen.getByText("From ₩5,000")).toBeInTheDocument();
    expect(screen.queryByText("No payment when applying")).not.toBeInTheDocument();
    expect(screen.queryByText(/₩15,000/)).not.toBeInTheDocument();
  });
  it("requires explicit agreement and uses the current backend version without any payment UI", async () => {
    await ready();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(screen.queryByText(/PayPal|Toss|Refund policy/)).not.toBeInTheDocument();
    acknowledgeApproval();
    fireEvent.click(screen.getByRole("checkbox", { name: /share personal data/i }));
    fireEvent.click(screen.getByRole("button", { name: "Increase participants" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await screen.findByText("Your application has been received.");
    expect(submitReferralApplication).toHaveBeenCalledExactlyOnceWith("3", {
      activityScheduleId: 12,
      guestCount: 2,
      partnerSharingAgreed: true,
      consentVersion: "live-v3",
    });
  });
  it.each(["CANCELLED", "COMPLETED", "REJECTED", "EXPIRED"] as const)(
    "does not show confirmation for returned %s applications",
    async (status) => {
      vi.mocked(submitReferralApplication).mockResolvedValue({
        status: "success",
        data: { status } as ApplicationResponse,
      });
      await ready();
      acknowledgeApproval();
      fireEvent.click(screen.getByRole("checkbox", { name: /share personal data/i }));
      fireEvent.click(screen.getByRole("button", { name: "Apply" }));
      await screen.findByRole("link", { name: "View my applications" });
      expect(screen.queryByText("Your application has been received.")).not.toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveTextContent(
        status === "CANCELLED"
          ? "was cancelled"
          : status === "COMPLETED"
            ? "already ended"
            : "Declined",
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
    acknowledgeApproval();
    fireEvent.click(screen.getByRole("checkbox", { name: /share personal data/i }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await screen.findByText(
      "The notice has changed. Review the latest information and agree again.",
    );
    expect(screen.getByRole("checkbox", { name: /share personal data/i })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    acknowledgeApproval();
    fireEvent.click(screen.getByRole("checkbox", { name: /share personal data/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled());
  });
  it("refreshes duplicate applications instead of retrying the POST", async () => {
    await ready();
    vi.mocked(submitReferralApplication).mockResolvedValueOnce({
      status: "error",
      error: createApiClientError(409, {
        isSuccess: false,
        code: "APPLICATION409_REFERRAL_EXISTS",
        message: "exists",
      }),
    });
    vi.mocked(getMyApplications).mockResolvedValue({
      status: "success",
      applications: [cancelled(9, { status: "CONFIRMED" })],
    });
    acknowledgeApproval();
    fireEvent.click(screen.getByRole("checkbox", { name: /share personal data/i }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await screen.findByText("You already have an active application. Check My Applications.");
    await screen.findByRole("link", { name: "View my applications" });
    expect(screen.getByRole("checkbox", { name: /share personal data/i })).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(submitReferralApplication).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      "APPLICATION400_BOOKING_CLOSED",
      "Bookings and payment requests close 24 hours before the activity starts. Please choose another session.",
    ],
    ["APPLICATION400_CAPACITY_EXCEEDED", "Not enough spots are available."],
    ["APPLICATION409_TIME_CONFLICT", "This schedule overlaps with another booking."],
    ["APPLICATION400_ACTIVITY_NOT_APPLICABLE", "This activity is not accepting applications."],
  ])("does not confirm or retry rejected reapplications: %s", async (code, message) => {
    vi.mocked(getMyApplications).mockResolvedValue({
      status: "success",
      applications: [cancelled(7)],
    });
    vi.mocked(submitReferralApplication).mockResolvedValue({
      status: "error",
      error: createApiClientError(code.includes("409") ? 409 : 400, {
        isSuccess: false,
        code,
        message: "Backend-only text",
      }),
    });
    await ready();
    acknowledgeApproval();
    fireEvent.click(screen.getByRole("checkbox", { name: /share personal data/i }));
    fireEvent.click(screen.getByRole("button", { name: "Reapply" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(message);
    expect(alert).not.toHaveTextContent("Backend-only text");
    expect(screen.queryByTestId("referral-result")).not.toBeInTheDocument();
    expect(submitReferralApplication).toHaveBeenCalledTimes(1);
  });
  it("blocks excess participants and repeated submits while the request is in flight", async () => {
    await ready();
    acknowledgeApproval();
    fireEvent.click(screen.getByRole("checkbox", { name: /share personal data/i }));
    expect(screen.getByRole("button", { name: "Decrease participants" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Increase participants" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase participants" }));
    expect(screen.getByRole("button", { name: "Increase participants" })).toBeDisabled();
    vi.mocked(submitReferralApplication).mockImplementation(() => new Promise(() => {}));
    const form = screen.getByRole("button", { name: "Apply" }).closest("form")!;
    await act(async () => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(submitReferralApplication).toHaveBeenCalledTimes(1);
  });
});
