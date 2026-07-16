import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { TopAppBar } from "./TopAppBar";

describe("TopAppBar", () => {
  it("links the HanBuddy wordmark to the role-aware home entry", () => {
    renderWithIntl(<TopAppBar />);

    expect(screen.getByRole("link", { name: "HanBuddy" })).toHaveAttribute("href", "/en/home");
  });

  it("keeps custom titles as plain headings", () => {
    renderWithIntl(<TopAppBar title="Applicants" />);

    expect(screen.getByRole("heading", { name: "Applicants" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Applicants" })).not.toBeInTheDocument();
  });

  it("renders a back button instead of a link when onLeftClick is provided", () => {
    const onLeftClick = vi.fn();
    renderWithIntl(<TopAppBar title="Create" onLeftClick={onLeftClick} />);

    const button = screen.getByRole("button", { name: "Go back" });
    fireEvent.click(button);

    expect(onLeftClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("link", { name: "Go back" })).not.toBeInTheDocument();
  });

  it("localizes the back action in Korean", () => {
    renderWithIntl(<TopAppBar title="만들기" backHref="/my-activities" />, { locale: "ko" });

    expect(screen.getByRole("link", { name: "뒤로 가기" })).toHaveAttribute(
      "href",
      "/ko/my-activities",
    );
  });
});
