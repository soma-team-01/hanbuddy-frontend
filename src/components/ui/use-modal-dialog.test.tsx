import { render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useModalDialog } from "./use-modal-dialog";

function DialogHarness() {
  const { dialogRef, closeRef } = useModalDialog();
  return (
    <dialog ref={dialogRef} aria-label="Test dialog">
      <button ref={closeRef}>Close</button>
    </dialog>
  );
}

describe("useModalDialog", () => {
  afterEach(() => {
    document.body.style.overflow = "";
    vi.restoreAllMocks();
  });

  it("opens the modal, focuses its close button and restores the previous state on unmount", () => {
    const openerView = render(<button>Open</button>);
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    document.body.style.overflow = "auto";
    const view = render(<DialogHarness />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
    view.rerender(<DialogHarness />);
    view.unmount();
    expect(dialog).not.toHaveAttribute("open");
    expect(document.body.style.overflow).toBe("auto");
    expect(opener).toHaveFocus();
    openerView.unmount();
  });

  it("preserves focus restoration through Strict Mode effect replay", () => {
    render(<button>Open</button>);
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    const view = render(
      <StrictMode>
        <DialogHarness />
      </StrictMode>,
    );
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    view.unmount();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("does not focus an opener removed while the dialog was open", () => {
    const openerView = render(<button>Open</button>);
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    const view = render(<DialogHarness />);
    openerView.unmount();
    const focus = vi.spyOn(opener, "focus");
    view.unmount();
    expect(focus).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe("");
  });
});
