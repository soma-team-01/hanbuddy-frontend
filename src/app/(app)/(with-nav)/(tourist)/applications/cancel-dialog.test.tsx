import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CancelDialog } from "./cancel-dialog";

describe("CancelDialog", () => {
  it("disables Yes, Cancel until a reason is selected", () => {
    render(<CancelDialog onClose={vi.fn()} onConfirm={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Yes, Cancel" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Schedule conflict" }));

    expect(screen.getByRole("button", { name: "Yes, Cancel" })).toBeEnabled();
  });

  it("submits the selected reason as a backend enum value", async () => {
    const onConfirm = vi.fn().mockResolvedValue({ ok: true });
    render(<CancelDialog onClose={vi.fn()} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Found another option" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Cancel" }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith("FOUND_OTHER"));
  });

  it("recovers with an error message when onConfirm rejects unexpectedly", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("network down"));
    render(<CancelDialog onClose={vi.fn()} onConfirm={onConfirm} />);

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
    render(<CancelDialog onClose={vi.fn()} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Illness or unexpected emergency" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Cancel" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Failed to cancel the application.");
    expect(screen.getByRole("button", { name: "Yes, Cancel" })).toBeInTheDocument();
  });
});
