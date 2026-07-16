import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createQueryClient } from "@/lib/query/client";
import { userKeys } from "@/lib/query/users";
import { createMockProfile } from "@/test/factories";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { BuddyMyPage } from "./buddy-my-page";
import { TouristMyPage } from "./tourist-my-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

function renderRoleMyPage(ui: React.ReactElement, userType: "TOURIST" | "BUDDY") {
  const queryClient = createQueryClient();
  queryClient.setQueryData(userKeys.me(), createMockProfile({ userType }));

  return renderWithQueryClient(ui, { queryClient });
}

describe("role-specific My Page", () => {
  it("returns tourists to Explore", () => {
    renderRoleMyPage(<TouristMyPage />, "TOURIST");

    expect(screen.getByRole("link", { name: "Go back" })).toHaveAttribute("href", "/en/explore");
  });

  it("returns buddies to Dashboard", () => {
    renderRoleMyPage(<BuddyMyPage />, "BUDDY");

    expect(screen.getByRole("link", { name: "Go back" })).toHaveAttribute("href", "/en/dashboard");
  });

  it("disables menu actions whose product flows are not available yet", () => {
    renderRoleMyPage(<TouristMyPage />, "TOURIST");

    expect(screen.getByRole("button", { name: /Language/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Help Center/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Delete Account/ })).toBeDisabled();
    expect(screen.getAllByText("Coming soon")).toHaveLength(3);
  });
});
