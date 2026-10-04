import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { ReferralApplicationCancelButton } from "./ReferralApplicationCancelButton";
import en from "@/messages/en.json";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import zhHans from "@/messages/zh-Hans.json";
import zhHant from "@/messages/zh-Hant.json";

const messages = { en, ko, ja, "zh-Hans": zhHans, "zh-Hant": zhHant };

describe("ReferralApplicationCancelButton", () => {
  it.each([
    [
      "ko",
      "신청을 취소할까요?",
      "홈페이지가 아닌 업체에 별도로 예약·결제했다면 업체에 직접 확인해 주세요.",
    ],
    [
      "en",
      "Cancel this application?",
      "If you booked or paid directly with the provider outside this website, please contact the provider directly.",
    ],
    [
      "ja",
      "申し込みをキャンセルしますか？",
      "このサイトを通さず事業者に別途予約・支払いをした場合は、事業者に直接ご確認ください。",
    ],
    ["zh-Hans", "取消申请？", "如未通过本网站，而是直接向商家另行预约或付款，请直接联系商家。"],
    ["zh-Hant", "取消申請？", "如未透過本網站，而是直接向商家另行預約或付款，請直接聯絡商家。"],
  ] as const)("matches the standard cancellation style in %s", (locale, title, notice) => {
    const onCancel = vi.fn().mockResolvedValue({ ok: true });
    renderWithIntl(<ReferralApplicationCancelButton className="" onCancel={onCancel} />, {
      locale,
      messages: messages[locale],
    });
    fireEvent.click(screen.getByRole("button", { name: messages[locale].Applications.cancel }));
    const dialog = screen.getByRole("dialog", { name: title });
    expect(dialog).toHaveClass("md:rounded-3xl");
    expect(within(dialog).getByText(notice)).toHaveClass("text-sm", "leading-6");
    const [keep, cancel] = within(dialog).getAllByRole("button");
    expect(keep).toHaveClass("border-line-strong");
    expect(keep).not.toHaveClass("bg-panel");
    expect(cancel).toHaveClass("border-primary", "text-primary", "font-bold");
    expect(cancel).not.toHaveClass("bg-danger", "bg-primary");
    expect(within(dialog).queryByRole("radio")).not.toBeInTheDocument();
    fireEvent.click(keep);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
