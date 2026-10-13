import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PricingChoice } from "./PricingChoice";

it("uses caller-provided labels and changes only the selected choice", () => {
  const onChange = vi.fn();
  render(
    <PricingChoice
      enabled={false}
      onChange={onChange}
      disabledLabel="Base rate"
      enabledLabel="Group rate"
    />,
  );
  expect(screen.getByRole("button", { name: "Base rate" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "Group rate" }));
  expect(onChange).toHaveBeenCalledWith(true);
});
