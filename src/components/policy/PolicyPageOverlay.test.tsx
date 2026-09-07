import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PolicyPageOverlay } from "./PolicyPageOverlay";

const router = vi.hoisted(() => ({ back: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

afterEach(() => vi.restoreAllMocks());

describe("PolicyPageOverlay", () => {
  it("opens above the retained screen and restores scroll locking on removal", () => {
    document.body.style.overflow = "auto";
    const { unmount } = render(
      <PolicyPageOverlay title="Terms">
        <h1>Terms</h1>
      </PolicyPageOverlay>,
    );
    expect(screen.getByRole("dialog", { name: "Terms" })).toHaveAttribute("open");
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("handles Escape through history, so the URL and screen return together", () => {
    render(<PolicyPageOverlay title="Terms">Policy</PolicyPageOverlay>);
    const dialog = screen.getByRole("dialog");
    const cancel = new Event("cancel", { cancelable: true });
    fireEvent(dialog, cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(router.back).toHaveBeenCalledOnce();
    expect(dialog).toHaveAttribute("open");
  });
});
