import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import LocaleNotFound from "./not-found";
import CatchAllPage from "./[...catchAll]/page";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => en.NotFound[key as keyof typeof en.NotFound],
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

describe("locale not-found", () => {
  it("offers a link back to home", async () => {
    render(await LocaleNotFound());
    expect(screen.getByRole("link", { name: "Go to home" })).toHaveAttribute("href", "/");
  });

  it("routes unknown paths to not-found", () => {
    expect(() => CatchAllPage()).toThrow();
  });
});
