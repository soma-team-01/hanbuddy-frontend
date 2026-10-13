import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBuddyActivityApplications } from "@/lib/api/buddy";
import { getScheduleCancellation } from "@/lib/api/schedule-cancellation";
import { buddyKeys } from "@/lib/query/buddy";
import { scheduleCancellationKeys } from "@/lib/query/schedule-cancellation";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type {
  BuddyActivityApplicationsResponse,
  BuddyDateActivityApplicationsResponse,
} from "@/types/buddy";
import { DashboardApplicationsList } from "./DashboardActivityCard";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/api/buddy", () => ({ getBuddyActivityApplications: vi.fn() }));
vi.mock("@/lib/api/schedule-cancellation", () => ({ getScheduleCancellation: vi.fn() }));
vi.mock("./ApplicationApprovalActions", () => ({
  ApplicationApprovalActions: ({ applicationId }: { applicationId: number }) => (
    <div data-testid="approval-actions">{applicationId}</div>
  ),
}));
vi.mock("./ScheduleActions", () => ({
  ScheduleActions: ({
    scheduleId,
    applicantCount,
  }: {
    scheduleId: number;
    applicantCount: number;
  }) => (
    <div data-testid="schedule-actions">
      {scheduleId}:{applicantCount}
    </div>
  ),
}));
vi.mock("@/components/chat/StartChatButton", () => ({ StartChatButton: () => null }));
vi.mock("@/components/activity/CancellationReasonText", () => ({
  CancellationReasonText: ({ originalText }: { originalText: string }) => (
    <span>{originalText}</span>
  ),
}));
const guest = {
  applicationId: 1,
  applicantUserId: 7,
  applicantName: "Active Guest",
  applicantProfileImageUrl: null,
  applicantNationalityCode: "FR",
  guestCount: 3,
  applicantContactMethod: "WHATSAPP" as const,
  applicantContactCountryCode: "+33",
  applicantContactIdentifier: "123456789",
  status: "CONFIRMED" as const,
  appliedAt: "2099-07-01T00:00:00+09:00",
  specialRequest: "No peanuts",
};
const cancelled = {
  ...guest,
  applicationId: 2,
  applicantName: "Cancelled Guest",
  guestCount: 2,
  status: "CANCELLED" as const,
  cancellationReason: "OTHER" as const,
  cancellationDetail: "Changed travel plans",
};
const activity: BuddyDateActivityApplicationsResponse = {
  activityId: 42,
  activityTitle: "Tea tasting",
  thumbnailImageUrl: null,
  totalApplicantCount: 3,
  schedules: Array.from({ length: 16 }, (_, index) => ({
    activityScheduleId: index + 1,
    startAt:
      "2099-07-20T" +
      String(8 + Math.floor(index / 2)).padStart(2, "0") +
      ":" +
      (index % 2 ? "30" : "00") +
      ":00+09:00",
    applicantCount: index === 2 ? 3 : 0,
    applicants: index === 2 ? [guest] : [],
  })),
};
function detail(
  id: number,
  applicants: BuddyActivityApplicationsResponse["applicants"],
): BuddyActivityApplicationsResponse {
  return {
    activityId: 42,
    activityScheduleId: id,
    activityTitle: activity.activityTitle,
    startAt: activity.schedules[id - 1].startAt,
    applicantCount: 99,
    statusCounts: {},
    applicants,
  };
}
const renderList = (locale: "en" | "ko" = "en", onOpenProfile = vi.fn()) =>
  renderWithQueryClient(
    <DashboardApplicationsList
      activities={[activity]}
      rooms={[]}
      myActivities={[]}
      onOpenProfile={onOpenProfile}
    />,
    { locale },
  );

describe("DashboardApplicationsList", () => {
  it.each([
    ["CANCELLED", "취소 1건", "취소 시각"],
    ["REJECTED", "거절 1건", "거절 시각"],
    ["EXPIRED", "거절 1건", "자동 만료 시각"],
  ] as const)(
    "keeps %s times out of the list and passes them to the profile dialog",
    async (status, tab, label) => {
      vi.mocked(getBuddyActivityApplications).mockImplementation(async (id) => ({
        status: "success",
        applications: detail(
          Number(id),
          Number(id) === 3
            ? [{ ...cancelled, status, cancelledAt: "2099-07-02T12:30:00+09:00" }]
            : [],
        ),
      }));
      const onOpenProfile = vi.fn();
      renderList("ko", onOpenProfile);
      fireEvent.click(await screen.findByRole("button", { name: /오전 9:00/ }));
      fireEvent.click(screen.getByRole("button", { name: tab }));
      expect(screen.queryByText(`${label}: 2099. 7. 2. 오후 12:30`)).not.toBeInTheDocument();
      expect(screen.queryByText("2099. 7. 1. 오전 12:00에 신청")).not.toBeInTheDocument();
      expect(screen.queryByText("Changed travel plans")).not.toBeInTheDocument();
      expect(screen.queryByText("WhatsApp")).not.toBeInTheDocument();
      expect(screen.queryByText("+33 123456789")).not.toBeInTheDocument();
      expect(
        screen.queryByText(status === "CANCELLED" ? "취소됨" : "거절", { selector: "li span" }),
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /^Cancelled Guest/ }));
      expect(onOpenProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          status,
          appliedAt: guest.appliedAt,
          cancelledAt: "2099-07-02T12:30:00+09:00",
          cancellationDetail: "Changed travel plans",
        }),
      );
    },
  );
  it.each([null, undefined, "invalid"])(
    "does not invent a cancellation time when the API value is %s",
    async (cancelledAt) => {
      vi.mocked(getBuddyActivityApplications).mockImplementation(async (id) => ({
        status: "success",
        applications: detail(Number(id), Number(id) === 3 ? [{ ...cancelled, cancelledAt }] : []),
      }));
      renderList("ko");
      fireEvent.click(await screen.findByRole("button", { name: /오전 9:00/ }));
      fireEvent.click(screen.getByRole("button", { name: "취소 1건" }));
      expect(screen.queryByText(/취소 시각:/)).not.toBeInTheDocument();
    },
  );
  beforeEach(() => {
    vi.mocked(getScheduleCancellation)
      .mockReset()
      .mockImplementation(async (id) => ({
        status: "success",
        cancellation: {
          activityScheduleId: Number(id),
          status: "OPEN",
          cancelledAt: null,
          reason: null,
          applicants: [],
        },
      }));
    vi.mocked(getBuddyActivityApplications)
      .mockReset()
      .mockImplementation(async (id) => ({
        status: "success",
        applications: detail(
          Number(id),
          Number(id) === 3 ? [guest, cancelled] : Number(id) === 5 ? [cancelled] : [],
        ),
      }));
  });
  it("keeps status summaries in the title column on mobile and desktop", async () => {
    vi.mocked(getBuddyActivityApplications).mockImplementation(async (id) => ({
      status: "success",
      applications: detail(
        Number(id),
        Number(id) === 3
          ? [
              guest,
              cancelled,
              { ...guest, applicationId: 3, status: "PENDING_APPROVAL" },
              { ...guest, applicationId: 4, status: "REJECTED" },
            ]
          : [],
      ),
    }));
    renderList("ko");
    const row = await screen.findByRole("button", {
      name: /오전 9:00.*참여자 3명.*확정 대기 1건.*취소 1건.*거절 1건/,
    });
    const summary = within(row).getByText("참여자 3명").parentElement!;
    expect(summary.parentElement).toBe(row);
    expect(summary).toHaveClass("col-start-2", "col-span-2", "flex-nowrap", "whitespace-nowrap");
    expect(summary).toHaveClass("sm:col-span-1", "sm:col-start-2");
    expect(within(row).getByText(activity.activityTitle)).toHaveClass("col-start-2");
    fireEvent.click(row);
    expect(screen.getByRole("button", { name: "거절 1건" })).toBeVisible();
    expect(screen.queryByText(/거절됨/)).not.toBeInTheDocument();
  });
  it("shows only session rows initially without automatically selecting or mounting details", async () => {
    renderList();
    expect(
      await screen.findByRole("button", {
        name: /9:00 AM.*Tea tasting.*Participants.*3 guests.*1 cancellation/,
      }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      await screen.findByRole("button", {
        name: /10:00 AM.*Participants.*0 guests.*1 cancellation/,
      }),
    ).toBeVisible();
    await waitFor(() => expect(getBuddyActivityApplications).toHaveBeenCalledTimes(16));
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByText("8:00 AM")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Session details" })).not.toBeInTheDocument();
    expect(screen.queryByText("Active Guest")).not.toBeInTheDocument();
    expect(getScheduleCancellation).not.toHaveBeenCalled();
    expect(screen.queryByText("Cancelled Guest")).not.toBeInTheDocument();
    expect(screen.getByText("Participants 3 guests")).toHaveClass("text-primary", "font-semibold");
    expect(screen.getAllByText("1 cancellation")[0]).not.toHaveClass("text-primary");
  });
  it("opens one session at a time and separates participants from cancellation history", async () => {
    renderList();
    const first = await screen.findByRole("button", { name: /9:00 AM.*3 guests/ });
    fireEvent.click(first);
    const heading = screen.getByRole("heading", { name: activity.activityTitle });
    expect(heading.parentElement?.parentElement).toHaveClass("max-md:basis-full", "pr-12");
    expect(screen.getByTestId("schedule-actions").parentElement).toHaveClass("relative");
    expect(screen.getByText("Active Guest")).toBeVisible();
    expect(screen.getByText("WhatsApp")).toBeVisible();
    expect(screen.getByText("+33 123456789")).toBeVisible();
    expect(screen.queryByText("Cancelled Guest")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancellations 1 booking" }));
    expect(await screen.findByText("Cancelled Guest")).toBeVisible();
    expect(screen.queryByText("Active Guest")).not.toBeInTheDocument();
    expect(screen.queryByText("Changed travel plans")).not.toBeInTheDocument();
    expect(screen.getByTestId("schedule-actions")).toHaveTextContent("3:3");
    expect(screen.queryByRole("region", { name: "Sessions" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to sessions" }));
    expect(screen.queryByRole("region", { name: "Session details" })).not.toBeInTheDocument();
    const second = await screen.findByRole("button", { name: /10:00 AM.*0 guests/ });
    fireEvent.click(second);
    expect(first).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Active Guest")).not.toBeInTheDocument();
    expect(second).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("No confirmed participants for this session.")).toBeVisible();
    expect(screen.queryByText("Cancelled Guest")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Session details" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to sessions" }));
    await waitFor(() => expect(second).toHaveFocus());
  });
  it("keeps payment holds out of the participant calendar", async () => {
    vi.mocked(getBuddyActivityApplications).mockImplementation(async (id) => ({
      status: "success",
      applications: detail(Number(id), [{ ...guest, status: "PENDING_PAYMENT" }]),
    }));
    renderList();
    expect(await screen.findByText("No booking records on this date.")).toBeVisible();
    expect(screen.queryByRole("heading", { name: activity.activityTitle })).not.toBeInTheDocument();
  });
  it("includes pending-only sessions and counts bookings separately from participant seats", async () => {
    vi.mocked(getBuddyActivityApplications).mockImplementation(async (id) => ({
      status: "success",
      applications: detail(
        Number(id),
        Number(id) === 3
          ? [
              { ...guest, status: "PENDING_APPROVAL" },
              { ...guest, applicationId: 3, status: "PENDING_APPROVAL", guestCount: 2 },
              { ...guest, applicationId: 4, status: "PENDING_PAYMENT" },
            ]
          : [],
      ),
    }));
    renderList();
    const row = await screen.findByRole("button", {
      name: /9:00 AM.*Participants 0 guests.*Awaiting approval 2 bookings/,
    });
    fireEvent.click(row);
    fireEvent.click(screen.getByRole("button", { name: "Awaiting approval 2 bookings" }));
    expect(screen.getAllByText("Active Guest")).toHaveLength(2);
  });
  it("embeds application dates, notes, approval actions and declined records without leaving the dashboard", async () => {
    vi.mocked(getBuddyActivityApplications).mockImplementation(async (id) => ({
      status: "success",
      applications: detail(
        Number(id),
        Number(id) === 3
          ? [
              guest,
              {
                ...guest,
                applicationId: 3,
                applicantName: "Awaiting Guest",
                status: "PENDING_APPROVAL",
                approvalExpiresAt: "2099-07-20T00:00:00+09:00",
              },
              {
                ...cancelled,
                applicationId: 4,
                applicantName: "Declined Guest",
                status: "REJECTED",
                cancellationReason: "BUDDY_OTHER",
                cancellationDetail: "Unavailable that day",
              },
              {
                ...cancelled,
                applicationId: 5,
                applicantName: "Expired Guest",
                status: "EXPIRED",
                cancellationReason: null,
              },
            ]
          : [],
      ),
    }));
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: /9:00 AM.*3 guests/ }));
    await screen.findByText("Active Guest");
    expect(screen.queryByText(/Applied on|Applied at/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Awaiting approval/ }));
    expect(screen.queryByTestId("approval-actions")).not.toBeInTheDocument();
    expect(screen.getByText(/Approval deadline:/)).toBeVisible();
    const applicantTrigger = screen.getByRole("button", { name: /Awaiting Guest/ });
    applicantTrigger.focus();
    fireEvent.click(applicantTrigger);
    expect(screen.getByRole("dialog", { name: "Awaiting Guest" })).toBeVisible();
    expect(within(screen.getByRole("dialog")).getByText(/Applied at:/)).toBeVisible();
    expect(screen.getByTestId("approval-actions")).toHaveTextContent("3");
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(applicantTrigger).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Declined 2 bookings" }));
    expect(screen.getByText("Declined Guest")).toBeVisible();
    expect(screen.getByText("Expired Guest")).toBeVisible();
    expect(screen.queryByText("Unavailable that day")).not.toBeInTheDocument();
    expect(screen.queryByTestId("approval-actions")).not.toBeInTheDocument();
  });
  it("keeps status filters on one line with semantic badges and compact request metadata", async () => {
    vi.mocked(getBuddyActivityApplications).mockImplementation(async (id) => ({
      status: "success",
      applications: detail(Number(id), [
        guest,
        cancelled,
        {
          ...guest,
          applicationId: 3,
          applicantName: "Awaiting Guest",
          status: "PENDING_APPROVAL",
          approvalExpiresAt: "2099-07-20T00:00:00+09:00",
        },
        { ...cancelled, applicationId: 4, status: "REJECTED" },
      ]),
    }));
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: /9:00 AM.*3 guests/ }));
    const participantTab = screen.getByRole("button", { name: "Participants 3 guests" });
    expect(participantTab.parentElement).toHaveClass("flex-nowrap", "overflow-x-auto");
    expect(participantTab.parentElement).toHaveClass(
      "max-md:grid",
      "max-md:grid-flow-col",
      "max-md:auto-cols-[minmax(max-content,1fr)]",
      "max-md:gap-0",
    );
    for (const [name, tone] of [
      ["Participants 3 guests", "bg-success-soft"],
      ["Awaiting approval 1 booking", "bg-warning-soft"],
      ["Cancellations 1 booking", "bg-danger/10"],
      ["Declined 1 booking", "bg-panel"],
    ]) {
      const tab = screen.getByRole("button", { name });
      expect(tab).toHaveClass("shrink-0", "whitespace-nowrap");
      expect(tab).toHaveClass("max-md:justify-center");
      expect(tab.querySelector("span")).toHaveClass(tone);
    }
    expect(screen.queryByText("Confirmed")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Awaiting approval 1 booking" }));
    expect(screen.getByText("Awaiting approval", { selector: "li span" })).toHaveClass(
      "bg-warning-soft",
    );
    const request = screen.getByText("No peanuts").closest("details")!;
    expect(screen.queryByText(/Applied on|Applied at/)).not.toBeInTheDocument();
    const deadline = screen.getByText(/Approval deadline:/);
    expect(deadline).toHaveClass("text-danger");
    const trigger = deadline.closest("button")!;
    expect(
      request.compareDocumentPosition(trigger) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(trigger).not.toHaveClass("mt-0.5", "enabled:hover:underline");
    expect(trigger).not.toHaveClass("min-h-11");
    expect(trigger.querySelector("svg")).toBeNull();
    await waitFor(() => expect(trigger).toBeEnabled());
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Awaiting Guest" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancellations 1 booking" }));
    expect(screen.queryByText("Cancelled", { selector: "li span" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Declined 1 booking" }));
    expect(screen.queryByText("Declined", { selector: "li span" })).not.toBeInTheDocument();
  });
  it("shows schedule cancellation reasons and refund progress while suppressing stale approval actions", async () => {
    vi.mocked(getScheduleCancellation).mockImplementation(async (id) => ({
      status: "success",
      cancellation: {
        activityScheduleId: Number(id),
        status: "CANCELLED",
        cancelledAt: "2099-07-19T12:00:00+09:00",
        reason: "Severe weather",
        applicants: [
          {
            applicationId: guest.applicationId,
            refundStatus: "QUEUED",
            reviewReason: null,
            additionalRefundAmount: 50000,
            currency: "KRW",
          },
        ],
      },
    }));
    renderList();
    fireEvent.click(await screen.findByRole("button", { name: /9:00 AM.*3 guests/ }));
    expect(await screen.findByText("Severe weather")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: /Cancellations/ }));
    expect(await screen.findByText("Active Guest")).toBeVisible();
    expect(screen.getByText("Refund processing")).toBeVisible();
    expect(screen.queryByTestId("approval-actions")).not.toBeInTheDocument();
  });
  it.each(["CONFIRMED", "CANCELLED"] as const)(
    "closes the approval dialog when the application or session becomes %s",
    async (state) => {
      const pending = {
        ...guest,
        applicationId: 3,
        applicantName: "Awaiting Guest",
        status: "PENDING_APPROVAL" as const,
        approvalExpiresAt: "2099-07-20T00:00:00+09:00",
      };
      vi.mocked(getBuddyActivityApplications).mockImplementation(async (id) => ({
        status: "success",
        applications: detail(Number(id), [guest, pending]),
      }));
      const { queryClient } = renderList();
      fireEvent.click(await screen.findByRole("button", { name: /9:00 AM.*3 guests/ }));
      fireEvent.click(screen.getByRole("button", { name: /Awaiting approval/ }));
      const deadline = await screen.findByRole("button", { name: /Approval deadline:/ });
      await waitFor(() => expect(deadline).toBeEnabled());
      fireEvent.click(deadline);
      expect(screen.getByRole("dialog", { name: "Awaiting Guest" })).toBeVisible();
      if (state === "CONFIRMED") {
        vi.mocked(getBuddyActivityApplications).mockImplementation(async (id) => ({
          status: "success",
          applications: detail(Number(id), [guest, { ...pending, status: "CONFIRMED" }]),
        }));
        await queryClient.invalidateQueries({ queryKey: buddyKeys.applications() });
      } else {
        queryClient.setQueryData(scheduleCancellationKeys.buddy(3), {
          activityScheduleId: 3,
          status: "CANCELLED",
          applicants: [],
        });
      }
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      expect(screen.queryByTestId("approval-actions")).not.toBeInTheDocument();
    },
  );
  it("excludes pending and declined applicants from fallback counts while details load", () => {
    vi.mocked(getBuddyActivityApplications).mockReturnValue(new Promise(() => {}));
    renderWithQueryClient(
      <DashboardApplicationsList
        activities={[
          {
            ...activity,
            schedules: [
              {
                ...activity.schedules[2],
                applicants: [
                  guest,
                  { ...guest, status: "PENDING_APPROVAL" },
                  { ...guest, status: "REJECTED" },
                  { ...guest, status: "EXPIRED" },
                ],
              },
            ],
          },
        ]}
        rooms={[]}
        myActivities={[]}
        onOpenProfile={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /9:00 AM.*Participants.*3 guests/ }));
    expect(screen.getByTestId("schedule-actions")).toHaveTextContent("3:3");
  });
  it("keeps failed sessions visible as unknown rather than hiding potential cancellations", async () => {
    vi.mocked(getBuddyActivityApplications).mockRejectedValue(new Error("Offline"));
    renderList();
    expect(await screen.findByRole("button", { name: /8:00 AM.*Cancellations.*—/ })).toBeVisible();
    expect(screen.queryByText("No booking records on this date.")).not.toBeInTheDocument();
    vi.mocked(getBuddyActivityApplications).mockImplementation(async (id) => ({
      status: "success",
      applications: detail(Number(id), [cancelled]),
    }));
    fireEvent.click(screen.getByRole("button", { name: /8:00 AM.*Cancellations.*—/ }));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to sessions" }));
    expect(await screen.findByRole("button", { name: /8:00 AM.*1 cancellation/ })).toBeVisible();
  });
  it("does not claim zero cancellations while checking empty summaries", async () => {
    vi.mocked(getBuddyActivityApplications).mockReturnValue(new Promise(() => {}));
    renderList();
    expect(screen.getByRole("status")).toHaveTextContent("Checking session records");
    expect(screen.queryByText("No booking records on this date.")).not.toBeInTheDocument();
  });
  it("keeps an expanded session when its last participant cancels on refresh", async () => {
    const { queryClient } = renderList();
    fireEvent.click(await screen.findByRole("button", { name: /9:00 AM.*3 guests/ }));
    vi.mocked(getBuddyActivityApplications).mockImplementation(async (id) => ({
      status: "success",
      applications: detail(Number(id), [
        { ...guest, status: "CANCELLED", cancellationReason: "SCHEDULE_CONFLICT" },
        cancelled,
      ]),
    }));
    await queryClient.invalidateQueries({ queryKey: buddyKeys.applications() });
    expect(screen.getByRole("region", { name: "Session details" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Back to sessions" }));
    expect(
      await screen.findByRole("button", {
        name: /9:00 AM.*Participants.*0 guests.*2 cancellations/,
      }),
    ).toHaveAttribute("aria-pressed", "false");
  });
  it("sorts sessions across activities and notifies detail navigation at every viewport", async () => {
    vi.mocked(getBuddyActivityApplications).mockImplementation(async (id) => ({
      status: "success",
      applications: detail(Number(id), [guest]),
    }));
    const onDetailChange = vi.fn();
    renderWithQueryClient(
      <DashboardApplicationsList
        activities={[
          { ...activity, schedules: [activity.schedules[4], activity.schedules[0]] },
          {
            ...activity,
            activityId: 43,
            activityTitle: "Market tour",
            schedules: [activity.schedules[2]],
          },
        ]}
        rooms={[]}
        myActivities={[]}
        onOpenProfile={vi.fn()}
        onDetailChange={onDetailChange}
      />,
    );
    const list = await screen.findByRole("region", { name: "Sessions" });
    await waitFor(() => expect(within(list).getAllByRole("button")).toHaveLength(3));
    expect(
      within(list)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual([
      expect.stringMatching(/8:00 AM.*Tea tasting/),
      expect.stringMatching(/9:00 AM.*Market tour/),
      expect.stringMatching(/10:00 AM.*Tea tasting/),
    ]);
    fireEvent.click(within(list).getAllByRole("button")[1]);
    expect(onDetailChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("heading", { name: "Market tour" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Back to sessions" }));
    expect(onDetailChange).toHaveBeenLastCalledWith(false);
  });
});
