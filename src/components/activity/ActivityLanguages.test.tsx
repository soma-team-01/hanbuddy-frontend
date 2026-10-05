import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { getActivityLanguages } from "@/lib/api/activities";
import { ACTIVITY_LANGUAGES } from "@/types/activity-language";
import { ActivityLanguages } from "./ActivityLanguages";
import { ActivityLanguageSelect } from "./ActivityLanguageSelect";
import en from "@/messages/en.json";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import zhHans from "@/messages/zh-Hans.json";
import zhHant from "@/messages/zh-Hant.json";

vi.mock("@/lib/api/activities", () => ({ getActivityLanguages: vi.fn() }));
describe("spoken activity languages", () => {
  beforeEach(() => {
    vi.mocked(getActivityLanguages).mockReset();
  });

  it.each([
    ["en", en, "Could not load the activity languages. Please try again."],
    ["ko", ko, "진행 언어를 불러오지 못했습니다. 다시 시도해 주세요."],
    ["ja", ja, "対応言語を読み込めませんでした。もう一度お試しください。"],
    ["zh-Hans", zhHans, "无法加载活动服务语言，请重试。"],
    ["zh-Hant", zhHant, "無法載入活動服務語言，請重試。"],
  ] as const)(
    "announces a localized load failure before retry in %s",
    async (locale, messages, message) => {
      vi.mocked(getActivityLanguages).mockRejectedValue(new Error("Network unavailable"));
      renderWithQueryClient(<ActivityLanguageSelect value={[]} onChange={vi.fn()} />, {
        locale,
        messages,
      });
      const alert = await screen.findByRole("alert");
      const retry = screen.getByRole("button", { name: messages.ActivityLanguages.retry });
      expect(alert).toHaveTextContent(message);
      expect(alert.compareDocumentPosition(retry) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    },
  );

  it.each(["en", "ko"] as const)(
    "clears the alert and preserves selections after manual retry in %s",
    async (locale) => {
      vi.mocked(getActivityLanguages)
        .mockRejectedValueOnce(new Error("Network unavailable"))
        .mockResolvedValue({ status: "success", languages: ["KO", "EN"] });
      const onChange = vi.fn();
      renderWithQueryClient(<ActivityLanguageSelect value={["KO"]} onChange={onChange} />, {
        locale,
      });
      expect(await screen.findByRole("alert")).toBeVisible();
      expect(getActivityLanguages).toHaveBeenCalledTimes(1);
      fireEvent.click(
        screen.getByRole("button", {
          name: locale === "ko" ? ko.ActivityLanguages.retry : en.ActivityLanguages.retry,
        }),
      );
      expect(
        await screen.findByRole("checkbox", { name: locale === "ko" ? "한국어" : "Korean" }),
      ).toBeChecked();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(getActivityLanguages).toHaveBeenCalledTimes(2);
      expect(onChange).not.toHaveBeenCalled();
    },
  );

  it("does not announce an error while initially loading", () => {
    vi.mocked(getActivityLanguages).mockReturnValue(new Promise(() => {}));
    renderWithQueryClient(<ActivityLanguageSelect value={[]} onChange={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading languages…");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

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
