import { fireEvent, screen } from "@testing-library/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import {
  NameStep,
  HostStep,
  DescriptionStep,
  InclusionsStep,
  RestrictionsStep,
} from "./activity-create-steps";
import { EMPTY_ACTIVITY_DRAFT } from "./activity-create-wizard";

function Fields() {
  const t = useTranslations("CreateActivity");
  return (
    <>
      <NameStep value="" onChange={vi.fn()} t={t} />
      <HostStep draft={EMPTY_ACTIVITY_DRAFT} onChange={vi.fn()} t={t} />
      <DescriptionStep value="" experienceName="A title" onChange={vi.fn()} t={t} />
    </>
  );
}

function ListHarness({
  kind,
  initial,
}: Readonly<{ kind: "inclusions" | "restrictions"; initial: string }>) {
  const t = useTranslations("CreateActivity");
  const [value, setValue] = useState(initial);
  return (
    <>
      {kind === "inclusions" ? (
        <InclusionsStep value={value} onChange={setValue} t={t} />
      ) : (
        <RestrictionsStep
          value={value}
          onChange={setValue}
          hasNoRestrictions={false}
          onNoRestrictionsChange={vi.fn()}
          t={t}
        />
      )}
      <output data-testid="items">{value}</output>
    </>
  );
}

describe("activity input limits", () => {
  it.each([
    ["ko", "반드시 영어로"],
    ["en", "in English"],
  ] as const)("emphasizes the English title requirement in %s", (locale, text) => {
    renderWithIntl(<Fields />, { locale });
    const emphasis = screen.getByText(text, { exact: true });
    expect(emphasis.tagName).toBe("STRONG");
    expect(emphasis).toHaveClass("font-bold", "text-primary");
    expect(emphasis.closest("p")).toHaveClass("text-muted");
  });

  it("uses expanded input limits and accessible English-only title guidance", () => {
    renderWithIntl(<Fields />);
    const title = screen.getByPlaceholderText("e.g., Cheer at a Korean Baseball Night");
    expect(title).toHaveAttribute("maxlength", "100");
    expect(title).toHaveAccessibleDescription(
      "Activity titles are not automatically translated. Please write the title in English.",
    );
    expect(
      screen.getByPlaceholderText("Introduce yourself and why you want to host this experience."),
    ).toHaveAttribute("maxlength", "2000");
    expect(
      screen.getByPlaceholderText(
        "Tell guests what the experience feels like from start to finish.",
      ),
    ).toHaveAttribute("maxlength", "3000");
  });

  it.each(["inclusions", "restrictions"] as const)(
    "counts presets together with custom %s and preserves oversized restored content",
    (kind) => {
      const value = Array.from({ length: 20 }, (_, i) => `Custom ${i}`).join("\n");
      const view = renderWithIntl(<ListHarness kind={kind} initial={value} />);
      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("maxlength", "500");
      fireEvent.change(input, { target: { value: "Extra item" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(screen.getByTestId("items").textContent).toBe(value);
      const preset = screen.getAllByRole("button").find((el) => el.hasAttribute("aria-pressed"))!;
      expect(preset).toBeDisabled();
      fireEvent.click(preset);
      expect(screen.getByTestId("items").textContent).toBe(value);
      view.unmount();
      const tooLong = "A".repeat(501);
      renderWithIntl(<ListHarness kind={kind} initial={tooLong} />);
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Each item must be 500 characters or fewer.",
      );
      expect(screen.getByTestId("items").textContent).toBe(tooLong);
    },
  );
});
