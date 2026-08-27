import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders page context without behaving as the sticky global header", () => {
    renderWithIntl(<PageHeader title="Applicants" />);

    expect(screen.getByTestId("page-header")).not.toHaveClass("sticky", "top-0");
    expect(screen.getByTestId("page-header-content")).toHaveClass("min-h-24", "md:min-h-28");
    expect(screen.getByRole("heading", { name: "Applicants" })).toHaveClass(
      "text-2xl",
      "md:text-3xl",
      "text-ink",
    );
  });

  it("keeps custom titles as plain headings", () => {
    renderWithIntl(<PageHeader title="Applicants" />);

    expect(screen.getByRole("heading", { name: "Applicants" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Applicants" })).not.toBeInTheDocument();
  });

  it("renders supporting page context when a description is provided", () => {
    renderWithIntl(<PageHeader title="My Activities" description="Manage your experiences." />);

    expect(screen.getByText("Manage your experiences.")).toHaveClass("text-muted");
  });

  it("supports a compact layout for focused profile screens", () => {
    renderWithIntl(<PageHeader title="Profile" compact />);

    expect(screen.getByTestId("page-header-content")).toHaveClass("min-h-20", "md:min-h-24");
    expect(screen.getByRole("heading", { name: "Profile" })).toHaveClass("text-2xl");
    expect(screen.getByRole("heading", { name: "Profile" })).not.toHaveClass("md:text-3xl");
  });

  it("renders a back button instead of a link when onLeftClick is provided", () => {
    const onLeftClick = vi.fn();
    renderWithIntl(<PageHeader title="Create" onLeftClick={onLeftClick} />);

    const button = screen.getByRole("button", { name: "Go back" });
    fireEvent.click(button);

    expect(onLeftClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("link", { name: "Go back" })).not.toBeInTheDocument();
  });

  it("localizes the back action in Korean", () => {
    renderWithIntl(<PageHeader title="만들기" backHref="/my-activities" />, { locale: "ko" });

    expect(screen.getByRole("link", { name: "뒤로 가기" })).toHaveAttribute(
      "href",
      "/ko/my-activities",
    );
  });
});
