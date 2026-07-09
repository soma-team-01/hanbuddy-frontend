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
