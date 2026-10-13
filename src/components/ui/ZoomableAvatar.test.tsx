import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { ZoomableAvatar } from "./ZoomableAvatar";

describe("ZoomableAvatar", () => {
  it("opens a full-size photo and returns focus to its trigger", () => {
    renderWithIntl(<ZoomableAvatar name="Alex" src="/avatar.jpg" size={64} />);
    const trigger = screen.getByRole("button", { name: "Enlarge photo: Alex" });
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Alex" });
    expect(within(dialog).getByRole("img", { name: "Alex" })).toHaveClass("object-contain");
    expect(within(dialog).queryByRole("button", { name: "Next photo" })).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Close dialog" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("does not turn initials into a zoom button", () => {
    renderWithIntl(<ZoomableAvatar name="Alex" src={null} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("restores focus only after the modal is removed, not while the trigger is inert", () => {
    renderWithIntl(<ZoomableAvatar name="Alex" src="/avatar.jpg" />);
    const trigger = screen.getByRole("button", { name: "Enlarge photo: Alex" });
    expect(trigger).not.toHaveFocus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Alex" });
    const focus = trigger.focus.bind(trigger);
    const connectedAtFocus: boolean[] = [];
    vi.spyOn(trigger, "focus").mockImplementation(() => {
      connectedAtFocus.push(dialog.isConnected);
      // Model native modal inertness, which jsdom does not implement.
      if (!dialog.isConnected) focus();
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Close dialog" }));
    expect(connectedAtFocus).toEqual([false]);
    expect(trigger).toHaveFocus();
  });

  it("keeps the underlying profile dialog open when the photo closes or is cancelled", () => {
    const closeProfile = vi.fn();
    const cancelProfile = vi.fn();
    renderWithIntl(
      <dialog open aria-label="Profile" onClose={closeProfile} onCancel={cancelProfile}>
        <ZoomableAvatar name="Alex" src="/avatar.jpg" />
      </dialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Enlarge photo: Alex" }));
    const photo = screen.getByRole("dialog", { name: "Alex" });
    fireEvent(photo, new Event("cancel", { bubbles: true }));
    fireEvent(photo, new Event("close", { bubbles: true }));
    expect(closeProfile).not.toHaveBeenCalled();
    expect(cancelProfile).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Profile" })).toBeInTheDocument();
  });
});
