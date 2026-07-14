import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("renders title, description, and children", () => {
    render(
      <ConfirmDialog
        title="Submit this application?"
        description="Check the details below."
        confirmLabel="Submit"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      >
        <p>2 guests</p>
      </ConfirmDialog>,
    );

    expect(screen.getByRole("heading", { name: "Submit this application?" })).toBeInTheDocument();
    expect(screen.getByText("Check the details below.")).toBeInTheDocument();
    expect(screen.getByText("2 guests")).toBeInTheDocument();
  });

  it("uses the shared dialog entrance motion", () => {
    render(
      <ConfirmDialog
        title="Submit this application?"
        confirmLabel="Submit"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog")).toHaveClass("motion-dialog");
  });

  it("calls onConfirm and onClose from the action buttons", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        title="Log out?"
        confirmLabel="Log Out"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Log Out" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose only once when dismissed via Escape", () => {
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        title="Log out?"
        confirmLabel="Log Out"
        onConfirm={vi.fn()}
        onClose={onClose}
      />,
    );

    // 브라우저에서 Escape는 cancel 이벤트 후 기본 동작으로 close 이벤트를 연달아 발생시킨다
    const dialog = screen.getByRole("dialog");
    fireEvent(dialog, new Event("cancel"));
    fireEvent(dialog, new Event("close"));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("locks both buttons while pending", () => {
    render(
      <ConfirmDialog
        title="Delete this activity?"
        confirmLabel="Delete"
        isPending
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Delete..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("prevents Escape dismissal while pending", () => {
    render(
      <ConfirmDialog
        title="Pay for this application?"
        confirmSlot={<button type="button">PayPal</button>}
        isPending
        onClose={vi.fn()}
      />,
    );

    const cancelEvent = new Event("cancel", { cancelable: true });
    fireEvent(screen.getByRole("dialog"), cancelEvent);

    expect(cancelEvent.defaultPrevented).toBe(true);
  });

  it("renders a custom confirm slot at full width without the bottom cancel button", () => {
    render(
      <ConfirmDialog
        title="Pay for this application?"
        onClose={vi.fn()}
        confirmSlot={
          <>
            <button type="button">Debit or Credit Card</button>
            <button type="button">PayPal</button>
          </>
        }
      />,
    );

    const paymentButton = screen.getByRole("button", { name: "PayPal" });
    expect(paymentButton).toBeInTheDocument();
    expect(paymentButton.parentElement).toHaveClass("w-full");
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Close dialog" })).toBeInTheDocument();
  });

  it("calls onClose from the custom slot dialog close button", () => {
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        title="Pay for this application?"
        onClose={onClose}
        confirmSlot={<button type="button">PayPal</button>}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("uses the danger style for the confirm button when tone is danger", () => {
    render(
      <ConfirmDialog
        title="Delete this activity?"
        confirmLabel="Delete"
        tone="danger"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("bg-danger");
  });
});
