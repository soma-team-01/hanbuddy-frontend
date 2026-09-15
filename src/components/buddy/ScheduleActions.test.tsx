import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelSchedule, getScheduleCancellation } from "@/lib/api/schedule-cancellation";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { ScheduleActions } from "./ScheduleActions";
import { createApiClientError } from "@/lib/api/errors";

vi.mock("@/lib/api/schedule-cancellation", () => ({
  cancelSchedule: vi.fn(),
  getScheduleCancellation: vi.fn(),
}));
vi.mock("next/navigation", async (original) => ({
  ...(await original<typeof import("next/navigation")>()),
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("@/components/chat/StartChatButton", () => ({
  StartChatButton: ({ label }: { label: string }) => <button>{label}</button>,
}));
const open = {
  activityScheduleId: 99,
  status: "OPEN" as const,
  cancelledAt: null,
  reason: null,
  applicants: [],
};
const cancelled = {
  ...open,
  status: "CANCELLED" as const,
  cancelledAt: "2026-09-15T12:00:00+09:00",
  reason: "Weather",
};
const failure = {
  status: "error" as const,
  error: createApiClientError(null, null, "Network unavailable"),
};
function renderActions(props = {}) {
  return renderWithQueryClient(
    <ScheduleActions
      scheduleId={99}
      startAt="2099-10-20T10:00:00+09:00"
      applicantCount={2}
      {...props}
    />,
    { locale: "ko" },
  );
}
async function openDialog() {
  fireEvent.click(screen.getByRole("button", { name: "일정 옵션" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "일정 취소" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "일정 취소" }));
}

describe("ScheduleActions", () => {
  beforeEach(() => {
    vi.mocked(getScheduleCancellation)
      .mockReset()
      .mockResolvedValue({ status: "success", cancellation: open });
    vi.mocked(cancelSchedule).mockReset();
  });

  it("requires a public reason, cancels the schedule once, and keeps existing chat open", async () => {
    vi.mocked(cancelSchedule).mockResolvedValue({ status: "success", cancellation: cancelled });
    renderActions({ roomId: 8 });
    await openDialog();
    expect(screen.getByText(/취소한 일정은 다시 열 수 없으며/)).toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "일정 취소하기" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Weather" } });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await screen.findByText("취소된 일정");
    expect(cancelSchedule).toHaveBeenCalledExactlyOnceWith(99, "Weather");
    expect(screen.getByRole("link", { name: "단체 채팅방 입장" })).toHaveAttribute(
      "href",
      "/ko/chat/8",
    );
    expect(screen.queryByRole("button", { name: "일정 옵션" })).not.toBeInTheDocument();
  });

  it("checks a lost POST response and recognizes a saved cancellation without reposting", async () => {
    vi.mocked(cancelSchedule).mockResolvedValue(failure);
    renderActions();
    await openDialog();
    vi.mocked(getScheduleCancellation).mockResolvedValue({
      status: "success",
      cancellation: cancelled,
    });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Weather" } });
    fireEvent.click(screen.getByRole("button", { name: "일정 취소하기" }));
    await screen.findByText("취소된 일정");
    expect(cancelSchedule).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "단체 채팅방 만들기" })).not.toBeInTheDocument();
  });

  it("blocks another cancellation and new chat creation while the saved state is unknown", async () => {
    vi.mocked(cancelSchedule).mockResolvedValue(failure);
    renderActions();
    await openDialog();
    vi.mocked(getScheduleCancellation).mockResolvedValue(failure);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Weather" } });
    fireEvent.click(screen.getByRole("button", { name: "일정 취소하기" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "일정 취소하기" })).toBeDisabled(),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/확인/);
    expect(cancelSchedule).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "단체 채팅방 만들기" })).not.toBeInTheDocument();
  });

  it("does not allow a started schedule to be cancelled", () => {
    renderActions({ startAt: "2000-01-01T10:00:00+09:00" });
    expect(screen.queryByRole("button", { name: "일정 옵션" })).not.toBeInTheDocument();
  });
});
