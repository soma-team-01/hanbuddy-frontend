import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import CatchAllPage from "./[...catchAll]/page";
import LocaleNotFound from "./not-found";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => en.NotFound[key as keyof typeof en.NotFound],
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("locale not-found", () => {
  it("throws notFound for unknown paths", () => {
    expect(() => CatchAllPage()).toThrow();
  });

  it("offers links back to home and explore", async () => {
    render(await LocaleNotFound());
    expect(screen.getByRole("link", { name: en.NotFound.home })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: en.NotFound.explore })).toHaveAttribute(
      "href",
      "/explore",
    );
  });
});
