import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import SharedNavLayout from "./layout";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: vi.fn(() => "/explore"),
}));

describe("SharedNavLayout", () => {
  it("renders route content without persistent bottom navigation", async () => {
    renderWithIntl(await SharedNavLayout({ children: <main>Page content</main> }));

    expect(screen.getByText("Page content")).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});
