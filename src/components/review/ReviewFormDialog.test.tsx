import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { ReviewFormDialog } from "./ReviewFormDialog";

describe("ReviewFormDialog", () => {
  it("submits a review only once when the submit action fires repeatedly", async () => {
    const onSubmit = vi.fn();

    renderWithIntl(
      <ReviewFormDialog activityTitle="Han River Tour" onSubmit={onSubmit} onClose={vi.fn()} />,
    );

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "5 stars" }));
    fireEvent.change(within(dialog).getByLabelText("Your review"), {
      target: { value: "It was wonderful." },
    });

    const submit = within(dialog).getByRole("button", { name: "Submit review" });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
