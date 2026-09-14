import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { RefundPolicyDialog } from "./RefundPolicyDialog";
import { RefundPolicyNotice } from "./RefundPolicyNotice";

function DialogExample() {
  const [open, setOpen] = useState(true);
  return open ? (
    <RefundPolicyDialog
      document={{
        title: "Refund policy",
        version: "2026-09-07",
        source: "Policy content",
      }}
      idPrefix="test-refund"
      onClose={() => setOpen(false)}
    />
  ) : (
    <p>Closed</p>
  );
}

describe("RefundPolicyDialog", () => {
  it("returns focus to its trigger even when a pointer click did not focus it", async () => {
    renderWithIntl(
      <RefundPolicyNotice
        document={{ title: "Refund policy", version: "2026-09-07", source: "Policy content" }}
      />,
    );
    const trigger = screen.getByRole("button", { name: "View full policy" });
    fireEvent.click(trigger);
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("uses a separate backdrop button without closing when policy content is clicked", async () => {
    renderWithIntl(<DialogExample />);
    const dialog = screen.getByRole("dialog");
    fireEvent.click(screen.getByText("Policy content"));
    expect(dialog).toBeInTheDocument();
    const backdrop = dialog.querySelector('button[aria-hidden="true"]');
    expect(backdrop).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();
    fireEvent.click(backdrop!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("handles Escape through the native cancel event", async () => {
    renderWithIntl(<DialogExample />);
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    await waitFor(() => expect(screen.getByText("Closed")).toBeInTheDocument());
  });
});
