import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RelatedTips } from "./RelatedTips";

describe("RelatedTips", () => {
  it("links each related tip under the English Tips path", () => {
    render(
      <RelatedTips
        tips={[
          { slug: "watch-kbo", title: "How to Watch a KBO Game", description: "Short answer." },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Tips for this experience" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /How to Watch a KBO Game/ })).toHaveAttribute(
      "href",
      "/en/tips/watch-kbo",
    );
  });

  it("renders nothing without related tips", () => {
    const { container } = render(<RelatedTips tips={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
