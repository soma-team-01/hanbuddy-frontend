import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TipMarkdown } from "./TipMarkdown";

describe("TipMarkdown", () => {
  it("renders GFM tables, keeps a single page h1 and opens only outside links in a new tab", () => {
    render(
      <TipMarkdown
        source={[
          "# Duplicate title",
          "",
          "## Seats",
          "",
          "| Area | Note |",
          "| --- | --- |",
          "| Infield | Close |",
          "",
          "[Explore](/en/explore) and [KBO](https://www.koreabaseball.com/)",
        ].join("\n")}
      />,
    );

    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Seats" })).toHaveAttribute("id", "seats");
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Explore" })).not.toHaveAttribute("target");
    expect(screen.getByRole("link", { name: "KBO" })).toHaveAttribute("target", "_blank");
  });
});
