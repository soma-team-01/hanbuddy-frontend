import { screen } from "@testing-library/react";
import { usePathname } from "@/i18n/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { FooterLocaleSwitcher } from "./FooterLocaleSwitcher";

vi.mock("@/i18n/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/i18n/navigation")>()),
  usePathname: vi.fn(),
}));

vi.mock("./LocaleSwitcher", () => ({
  LocaleSwitcher: () => <button type="button">Language switcher</button>,
}));

const mockedUsePathname = vi.mocked(usePathname);

describe("FooterLocaleSwitcher", () => {
  beforeEach(() => {
    mockedUsePathname.mockReturnValue("/explore");
  });

  it("keeps language selection for tourists", () => {
    renderWithIntl(<FooterLocaleSwitcher role="tourist" />);

    expect(screen.getByRole("button", { name: "Language switcher" })).toBeInTheDocument();
  });

  it("hides language selection for authenticated buddies", () => {
    renderWithIntl(<FooterLocaleSwitcher role="buddy" />);

    expect(screen.queryByRole("button", { name: "Language switcher" })).not.toBeInTheDocument();
  });

  it("hides language selection throughout the public buddy entry flow", () => {
    mockedUsePathname.mockReturnValue("/buddy/onboarding");
    renderWithIntl(<FooterLocaleSwitcher />);

    expect(screen.queryByRole("button", { name: "Language switcher" })).not.toBeInTheDocument();
  });
});
