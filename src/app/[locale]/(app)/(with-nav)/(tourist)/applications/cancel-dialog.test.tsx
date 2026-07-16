import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { CancelDialog, type CancelDialogOutcome } from "./cancel-dialog";

describe("CancelDialog", () => {
  it("disables Yes, Cancel until a reason is selected", () => {
    renderWithIntl(<CancelDialog onClose={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Yes, Cancel" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Schedule conflict" }));

    expect(screen.getByRole("button", { name: "Yes, Cancel" })).toBeEnabled();
  });

  it("submits the selected reason as a backend enum value", async () => {
    const onConfirm = vi.fn().mockResolvedValue({ ok: true });
    renderWithIntl(<CancelDialog onClose={vi.fn()} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Found another option" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Cancel" }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith("FOUND_OTHER"));
  });

  it("prevents Escape from closing while cancellation is submitting", async () => {
    const onClose = vi.fn();
    let resolveConfirm!: (outcome: CancelDialogOutcome) => void;
    const onConfirm = vi.fn(
      () =>
        new Promise<CancelDialogOutcome>((resolve) => {
          resolveConfirm = resolve;
        }),
    );
    renderWithIntl(<CancelDialog onClose={onClose} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Schedule conflict" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Cancel" }));
    await screen.findByRole("button", { name: "Cancelling..." });

    const cancelEvent = new Event("cancel", { bubbles: false, cancelable: true });
    fireEvent(screen.getByRole("dialog"), cancelEvent);

    expect(cancelEvent.defaultPrevented).toBe(true);
    expect(onClose).not.toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveConfirm({ ok: false, message: "Failed to cancel the application." });
    });
    await screen.findByRole("alert");
  });

  it("recovers with an error message when onConfirm rejects unexpectedly", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("network down"));
    renderWithIntl(<CancelDialog onClose={vi.fn()} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Schedule conflict" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Cancel" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong. Please try again.",
    );
    expect(screen.getByRole("button", { name: "Yes, Cancel" })).toBeEnabled();
  });

  it("shows an error and keeps the dialog open when cancellation fails", async () => {
    const onConfirm = vi.fn().mockResolvedValue({
      ok: false,
      message: "Failed to cancel the application.",
    });
    renderWithIntl(<CancelDialog onClose={vi.fn()} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Illness or unexpected emergency" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Cancel" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to cancel the application.");
    expect(screen.getByRole("button", { name: "Yes, Cancel" })).toBeEnabled();
  });

  it("localizes the complete Korean cancellation dialog", () => {
    renderWithIntl(<CancelDialog onClose={vi.fn()} onConfirm={vi.fn()} />, { locale: "ko" });

    expect(screen.getByRole("dialog", { name: "신청을 취소할까요?" })).toBeInTheDocument();
    expect(
      screen.getByText("정말 이 신청을 취소하시겠어요? 취소 후에는 되돌릴 수 없습니다."),
    ).toBeInTheDocument();
    expect(screen.getByText("취소 사유를 선택해 주세요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "일정 충돌" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "질병 또는 긴급 상황" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다른 옵션을 찾음" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "기타 사유" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "유지하기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "신청 취소" })).toBeDisabled();
  });
});
