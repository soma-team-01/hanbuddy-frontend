import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createQueryClient } from "@/lib/query/client";
import { userKeys } from "@/lib/query/users";
import { createMockProfile } from "@/test/factories";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { BuddyMyPage } from "./buddy-my-page";
import { TouristMyPage } from "./tourist-my-page";

vi.mock("@/i18n/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/i18n/navigation")>()),
  usePathname: () => "/my-page",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

function renderRoleMyPage(
  ui: React.ReactElement,
  userType: "TOURIST" | "BUDDY",
  locale: "en" | "ko" = "en",
) {
  const queryClient = createQueryClient();
  queryClient.setQueryData(userKeys.me(), createMockProfile({ userType }));

  return renderWithQueryClient(ui, { queryClient, locale });
}

describe("role-specific My Page", () => {
  it("returns tourists to Explore", () => {
    renderRoleMyPage(<TouristMyPage />, "TOURIST");

    expect(screen.getByRole("link", { name: "Go back" })).toHaveAttribute("href", "/en/explore");
    expect(screen.getByTestId("my-page-layout")).toHaveClass(
      "lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]",
    );
  });

  it("returns buddies to Dashboard", () => {
    renderRoleMyPage(<BuddyMyPage />, "BUDDY");

    expect(screen.getByRole("link", { name: "Go back" })).toHaveAttribute("href", "/en/dashboard");
  });

  it("enables Language while unfinished menu actions remain disabled", () => {
    renderRoleMyPage(<TouristMyPage />, "TOURIST");

    expect(screen.getByRole("combobox", { name: "Language" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Help Center/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Delete Account/ })).toBeDisabled();
    expect(screen.getAllByText("Coming soon")).toHaveLength(2);
  });

  it("translates the My Page menu in Korean", () => {
    renderRoleMyPage(<TouristMyPage />, "TOURIST", "ko");

    expect(screen.getByRole("combobox", { name: "언어" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /고객센터/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /계정 삭제/ })).toBeDisabled();
    expect(screen.getAllByText("출시 예정")).toHaveLength(2);
  });
});
