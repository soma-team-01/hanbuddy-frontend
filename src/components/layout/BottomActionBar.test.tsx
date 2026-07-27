import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BottomActionBar } from "./BottomActionBar";

describe("BottomActionBar", () => {
  it("uses a safe mobile action surface and returns to document flow on desktop", () => {
    render(
      <BottomActionBar>
        <button type="button">Continue</button>
      </BottomActionBar>,
    );

    expect(screen.getByTestId("bottom-action-bar")).toHaveClass(
      "pb-[max(1rem,env(safe-area-inset-bottom))]",
      "lg:static",
      "lg:rounded-2xl",
    );
  });
});
