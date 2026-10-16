import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StrictMode, useState } from "react";
import { buddyKeys } from "@/lib/query/buddy";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { createQueryClient } from "@/lib/query/client";
import type { ActivityScheduleResponse, BuddyActivityApplicationsResponse } from "@/types/buddy";
import type { BackendApplicationStatus } from "@/types/application";
import { BuddySessionCalendarDialog } from "./BuddySessionCalendarDialog";
import { getMyActivity, getBuddyActivityApplications } from "@/lib/api/buddy";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/api/buddy", () => ({
  getMyActivity: vi.fn(),
  getBuddyActivityApplications: vi.fn(),
}));

function records(id: number, statuses: BackendApplicationStatus[] = ["CONFIRMED"]) {
  return {
    activityId: 42,
    activityScheduleId: id,
    applicants: statuses.map((status) => ({ status })),
  } as BuddyActivityApplicationsResponse;
}

beforeEach(() => {
  vi.mocked(getBuddyActivityApplications).mockReset();
  vi.mocked(getBuddyActivityApplications).mockImplementation(async (id) => ({
    status: "success",
    applications: records(Number(id)),
  }));
});

const schedules: ActivityScheduleResponse[] = [
  {
    scheduleId: 1,
    startAt: "2020-09-30T15:30:00Z",
    bookedCount: 4,
    remainingCapacity: 0,
    status: "CLOSED",
  },
  { scheduleId: 2, startAt: "2020-10-01T14:00:00+09:00", bookedCount: 0, status: "CANCELLED" },
  { scheduleId: 3, startAt: "2020-11-02T10:00:00+09:00", bookedCount: 0, status: "OPEN" },
];

function setup(
  items = schedules,
  locale: "en" | "ko" = "en",
  statuses?: BackendApplicationStatus[][],
) {
  const queryClient = createQueryClient();
  queryClient.setQueryData(buddyKeys.activityDetail(42), {
    schedules: items,
    totalDurationMinutes: 60,
  });
  items.forEach((item, index) => {
    queryClient.setQueryData(
      buddyKeys.applicationsBySchedule(item.scheduleId, locale === "ko" ? "KO" : "EN"),
      records(item.scheduleId, statuses?.[index]),
    );
  });
  const onSelect = vi.fn();
  const onClose = vi.fn();
  const { unmount } = renderWithQueryClient(
    <BuddySessionCalendarDialog
      activityId={42}
      selectedScheduleId={1}
      startAt={schedules[0].startAt}
      onSelect={onSelect}
      onClose={onClose}
    />,
    { queryClient, locale },
  );
  return { onSelect, onClose, unmount };
}

describe("BuddySessionCalendarDialog", () => {
  it("excludes empty and payment-only dates and times but retains every application tab's records", () => {
    const statuses: BackendApplicationStatus[][] = [
      ["CONFIRMED"],
      ["CANCELLED"],
      ["PENDING_APPROVAL"],
      ["REJECTED"],
      ["EXPIRED"],
      ["COMPLETED"],
      [],
      ["PENDING_PAYMENT", "SUPERSEDED"],
    ];
    const items = statuses.map((_, index) => ({
      scheduleId: index + 1,
      startAt: `2020-10-${String(index + 1).padStart(2, "0")}T10:00:00+09:00`,
      bookedCount: 0,
      status: "OPEN" as const,
    }));
    items.push({
      scheduleId: 9,
      startAt: "2020-10-01T11:00:00+09:00",
      bookedCount: 10,
      status: "OPEN",
    });
    setup(items, "en", [...statuses, []]);
    for (let day = 1; day <= 6; day++)
      expect(screen.getByRole("button", { name: `Select October ${day}, 2020` })).toBeEnabled();
    for (const day of [7, 8])
      expect(
        screen.queryByRole("button", { name: `Select October ${day}, 2020` }),
      ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^11:00 AM/ })).not.toBeInTheDocument();
  });

  it("loads only the visible month's records and retries failures instead of treating them as empty", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(buddyKeys.activityDetail(42), { schedules, totalDurationMinutes: 60 });
    vi.mocked(getBuddyActivityApplications).mockRejectedValueOnce(new Error("offline"));
    renderWithQueryClient(
      <BuddySessionCalendarDialog
        activityId={42}
        selectedScheduleId={1}
        startAt={schedules[0].startAt}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
      { queryClient },
    );
    expect(screen.getByRole("status")).toBeVisible();
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.queryByRole("button", { name: /October 1, 2020/ })).not.toBeInTheDocument();
    expect(getBuddyActivityApplications).not.toHaveBeenCalledWith(3, "EN");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("button", { name: /October 1, 2020/ })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(await screen.findByRole("button", { name: /November 2, 2020/ })).toBeEnabled();
    await waitFor(() => expect(getBuddyActivityApplications).toHaveBeenCalledWith(3, "EN"));
  });

  it("keeps month navigation available when the current month has no records", () => {
    setup(schedules, "en", [[], [], ["CANCELLED"]]);
    expect(screen.getByText("There are no sessions to view.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("button", { name: /November 2, 2020/ })).toBeEnabled();
  });
  it("stays open when Strict Mode replays mount effects", () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(buddyKeys.activityDetail(42), { schedules, totalDurationMinutes: 60 });
    function Harness() {
      const [open, setOpen] = useState(true);
      return open ? (
        <BuddySessionCalendarDialog
          activityId={42}
          selectedScheduleId={1}
          startAt={schedules[0].startAt}
          onSelect={vi.fn()}
          onClose={() => setOpen(false)}
        />
      ) : null;
    }
    renderWithQueryClient(
      <StrictMode>
        <Harness />
      </StrictMode>,
      { queryClient, reactStrictMode: true },
    );
    expect(screen.getByRole("dialog", { name: "Select session" })).toBeVisible();
  });
  it("shows loading, a retryable error and recovered sessions", async () => {
    let reject!: (error: Error) => void;
    vi.mocked(getMyActivity).mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    );
    renderWithQueryClient(
      <BuddySessionCalendarDialog
        activityId={42}
        selectedScheduleId={1}
        startAt={schedules[0].startAt}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("status")).toBeInTheDocument();
    reject(new Error("offline"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load sessions.");
    vi.mocked(getMyActivity).mockResolvedValueOnce({
      status: "success",
      activity: { schedules, totalDurationMinutes: 60 },
    } as Awaited<ReturnType<typeof getMyActivity>>);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("button", { name: /12:30 AM/ })).toBeEnabled();
    expect(getMyActivity).toHaveBeenLastCalledWith(42);
  });
  it("opens at the current KST session date and allows past, full and cancelled sessions", () => {
    const { onSelect } = setup();
    expect(screen.getByRole("dialog", { name: "Select session" })).toBeInTheDocument();
    expect(screen.getByText("October 2020")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /October 1, 2020/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const full = screen.getByRole("button", { name: /12:30 AM/ });
    expect(full).toBeEnabled();
    expect(full).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(full);
    expect(onSelect).toHaveBeenCalledWith(schedules[0]);
    fireEvent.click(screen.getByRole("button", { name: /2:00 PM/ }));
    expect(onSelect).toHaveBeenLastCalledWith(schedules[1]);
    expect(screen.getByRole("button", { name: "Previous month" })).toBeDisabled();
  });

  it("navigates months without showing times from the previous month", () => {
    const { onSelect } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.queryByRole("button", { name: /12:30 AM/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /November 2, 2020/ }));
    fireEvent.click(screen.getByRole("button", { name: /10:00 AM/ }));
    expect(onSelect).toHaveBeenCalledWith(schedules[2]);
    expect(screen.getByRole("button", { name: "Next month" })).toBeDisabled();
  });

  it("supports Korean, empty schedules and closing", () => {
    const { onClose } = setup([], "ko");
    expect(screen.getByRole("dialog", { name: "회차 선택" })).toBeInTheDocument();
    expect(screen.getByText("조회할 회차가 없습니다.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "대화상자 닫기" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
  it("supports Escape cancellation and restores body scrolling on unmount", () => {
    const previousOverflow = document.body.style.overflow;
    const { onClose, unmount } = setup();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(onClose).toHaveBeenCalledOnce();
    unmount();
    expect(document.body.style.overflow).toBe(previousOverflow);
  });
});
