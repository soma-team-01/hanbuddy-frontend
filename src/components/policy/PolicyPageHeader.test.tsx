import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { PolicyPageHeader } from "./PolicyPageHeader";

const router = vi.hoisted(() => ({ back: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => router,
}));

afterEach(() => vi.restoreAllMocks());

describe("PolicyPageHeader", () => {
  it("returns through browser history rather than linking to home", () => {
    vi.spyOn(window.history, "length", "get").mockReturnValue(3);
    renderWithIntl(<PolicyPageHeader title="Privacy policy" />);
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(router.back).toHaveBeenCalledOnce();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("uses the localized home only for a direct visit without a previous entry", () => {
    vi.spyOn(window.history, "length", "get").mockReturnValue(1);
    renderWithIntl(<PolicyPageHeader title="개인정보 처리방침" />, { locale: "ko" });
    fireEvent.click(screen.getByRole("button", { name: "뒤로 가기" }));
    expect(router.replace).toHaveBeenCalledWith("/ko");
  });
});
