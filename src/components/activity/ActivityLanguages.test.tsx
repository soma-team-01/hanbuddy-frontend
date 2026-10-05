import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { getActivityLanguages } from "@/lib/api/activities";
import { ACTIVITY_LANGUAGES } from "@/types/activity-language";
import { ActivityLanguages } from "./ActivityLanguages";
import { ActivityLanguageSelect } from "./ActivityLanguageSelect";

vi.mock("@/lib/api/activities", () => ({ getActivityLanguages: vi.fn() }));
describe("spoken activity languages", () => {
  it.each(["en", "ko"] as const)("localizes actual codes in %s", (locale) => {
    renderWithQueryClient(<ActivityLanguages languages={["KO", "ZH", "YUE"]} />, { locale });
    expect(
      screen.getByText(
        locale === "ko"
          ? "한국어 · 중국어(보통화) · 광둥어"
          : "Korean · Mandarin Chinese · Cantonese",
      ),
    ).toBeVisible();
  });
  it("hides missing and empty legacy values", () => {
    const view = renderWithQueryClient(<ActivityLanguages />);
    expect(view.container).toBeEmptyDOMElement();
    view.rerender(<ActivityLanguages languages={[]} />);
    expect(view.container).toBeEmptyDOMElement();
  });
  it("shows all eleven fetched options and preserves initial selections", async () => {
    vi.mocked(getActivityLanguages).mockResolvedValue({
      status: "success",
      languages: [...ACTIVITY_LANGUAGES],
    });
    const onChange = vi.fn();
    renderWithQueryClient(<ActivityLanguageSelect value={["KO"]} onChange={onChange} />);
    expect(await screen.findByRole("checkbox", { name: "Korean" })).toBeChecked();
    expect(screen.getAllByRole("checkbox")).toHaveLength(11);
    fireEvent.click(screen.getByRole("checkbox", { name: "Cantonese" }));
    expect(onChange).toHaveBeenLastCalledWith(["KO", "YUE"]);
    fireEvent.click(screen.getByRole("checkbox", { name: "Korean" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});
