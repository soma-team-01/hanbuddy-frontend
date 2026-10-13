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

  it("emphasizes the unjustified cancellation fee before the reason and confirmation", async () => {
    renderActions();
    await openDialog();
    const warning = screen.getByText(
      "정당한 사유가 아닌 경우, 정산 시 취소 수수료 20%가 부과됩니다.",
    );
    expect(warning).toHaveClass("text-danger", "font-semibold");
    expect(
      warning.compareDocumentPosition(screen.getByRole("textbox")) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(cancelSchedule).not.toHaveBeenCalled();
  });

  it("can place the menu in the card header without moving the chat action", async () => {
    renderActions({ menuPlacement: "card-header", roomId: 8 });
    const menu = screen.getByRole("button", { name: "일정 옵션" }).parentElement;
    expect(menu).toHaveClass("absolute", "top-4", "right-4");
    expect(menu).not.toContainElement(screen.getByRole("link", { name: "단체 채팅방 입장" }));
    await openDialog();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("separates the mobile menu from the full-width chat row while preserving desktop actions", async () => {
    renderActions({ compactMobile: true, roomId: 8 });
    const trigger = screen.getByRole("button", { name: "일정 옵션" });
    expect(trigger).toHaveClass("max-md:size-11");
    expect(trigger.parentElement).toHaveClass("max-md:absolute", "max-md:top-0", "max-md:right-0");
    expect(trigger.parentElement?.parentElement).toHaveClass(
      "max-md:w-full",
      "flex-col",
      "items-end",
    );
    expect(trigger.parentElement?.parentElement).not.toHaveClass("max-md:flex-row");
    expect(screen.getByRole("link", { name: "단체 채팅방 입장" })).toHaveClass(
      "border",
      "max-md:border-orange-600",
      "max-md:min-h-9",
      "max-md:bg-transparent",
      "max-md:text-orange-700",
      "max-md:rounded-full",
      "max-md:px-2.5",
    );
    expect(screen.getByRole("link", { name: "단체 채팅방 입장" })).not.toHaveClass(
      "max-md:bg-primary-soft",
      "max-md:hover:bg-primary/10",
      "max-md:border-0",
    );
    await openDialog();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("hides only chat outside the participants view while keeping schedule options", async () => {
    renderActions({ showChat: false, roomId: 8, menuPlacement: "session-header" });
    expect(screen.queryByRole("link", { name: "단체 채팅방 입장" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "일정 옵션" }).parentElement).toHaveClass(
      "absolute",
      "top-0",
      "right-0",
    );
    await openDialog();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("keeps an existing room accessible with zero participants", () => {
    renderActions({ applicantCount: 0, roomId: 8 });
    expect(screen.getByRole("link", { name: "단체 채팅방 입장" })).toHaveAttribute(
      "href",
      "/ko/chat/8",
    );
  });

  it("does not offer a new room with zero participants", async () => {
    renderActions({ applicantCount: 0 });
    await openDialog();
    expect(screen.queryByRole("button", { name: "단체 채팅방 만들기" })).not.toBeInTheDocument();
  });

  it("requires a public reason, cancels the schedule once, and keeps existing chat open", async () => {
    vi.mocked(cancelSchedule).mockResolvedValue({ status: "success", cancellation: cancelled });
    renderActions({ roomId: 8, menuPlacement: "card-header" });
    await openDialog();
    const description = screen.getByText(/일정 취소 후 재오픈·신규 신청은 불가하며/);
    expect(description).toHaveTextContent(
      "환불은 자동 처리됩니다. 신청자에게 취소 사실을 꼭 알려주세요.",
    );
    expect(description).toHaveClass("text-sm");
    expect(screen.queryByText(/취소 접수 시 유지 중인 확정 예약/)).not.toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "일정 취소하기" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Weather" } });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await screen.findByText("취소된 일정");
    expect(screen.getByText("취소된 일정")).toHaveClass("absolute", "top-5", "right-4");
    expect(screen.getByText("취소된 일정").parentElement).toHaveAttribute(
      "data-schedule-cancelled",
      "true",
    );
    expect(screen.getByRole("status")).toHaveClass("sr-only");
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

  it("keeps cancellation uncertain even when the verification GET rejects", async () => {
    vi.mocked(cancelSchedule).mockResolvedValue(failure);
    renderActions();
    await openDialog();
    vi.mocked(getScheduleCancellation).mockRejectedValue(new Error("connection lost"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Weather" } });
    fireEvent.click(screen.getByRole("button", { name: "일정 취소하기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("다시 제출하기 전에 상태를 확인");
    expect(screen.getByRole("button", { name: "일정 취소하기" })).toBeDisabled();
    expect(cancelSchedule).toHaveBeenCalledTimes(1);
  });

  it("does not treat an unavailable old endpoint as an open schedule", async () => {
    vi.mocked(getScheduleCancellation).mockResolvedValue(failure);
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: "일정 옵션" }));
    expect(await screen.findByText(/최신 취소 상태/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "일정 취소" })).toBeDisabled();
    expect(cancelSchedule).not.toHaveBeenCalled();
  });
});
