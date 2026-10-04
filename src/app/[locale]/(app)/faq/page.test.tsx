import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/routing";
import { expectLocalizedMetadata } from "@/test/expect-localized-metadata";
import { renderWithIntl } from "@/test/render-with-intl";
import FaqPage, { generateMetadata } from "./page";

vi.mock("next-intl/server", async () => {
  const [{ createTranslator }, { default: en }, { default: ko }] = await Promise.all([
    import("next-intl"),
    import("@/messages/en.json"),
    import("@/messages/ko.json"),
  ]);

  return {
    getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: "About" }) =>
      createTranslator({ locale, messages: locale === "ko" ? ko : en, namespace }),
  };
});

async function renderFaq(locale: Locale) {
  renderWithIntl(await FaqPage({ params: Promise.resolve({ locale }) }), { locale });
}

describe("FaqPage", () => {
  it.each([
    ["en", "Questions guests ask before booking"],
    ["ko", "예약 전에 게스트가 자주 묻는 질문"],
  ] as const)("titles the page with the FAQ heading for %s", async (locale, title) => {
    await renderFaq(locale);

    expect(screen.getByRole("heading", { level: 1, name: title })).toBeInTheDocument();
  });

  it("shows all ten questions with their answers open, in the order guests ask them", async () => {
    await renderFaq("en");

    const faq = screen.getByRole("region", { name: "Questions guests ask before booking" });
    const questions = within(faq).getAllByRole("heading", { level: 2 });
    expect(questions.map((question) => question.textContent)).toEqual([
      "What is HanBuddy?",
      "Who are the buddies?",
      "Can I come alone?",
      "How do I pay?",
      "What is included in the price?",
      "I have dietary restrictions. Is that a problem?",
      "Where do we meet?",
      "How late can I book?",
      "What if I need to cancel?",
      "Do I need to speak Korean or know the sport?",
    ]);
    for (const question of questions) {
      const answer = question.nextElementSibling;
      expect(answer?.tagName).toBe("P");
      expect(answer?.textContent).not.toBe("");
      expect(answer).toBeVisible();
    }
    // 답은 접지 않는다. 사람과 검색엔진이 같은 글을 읽는다.
    expect(document.querySelector("details")).toBeNull();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps the confirmed booking facts in the answers", async () => {
    await renderFaq("en");

    expect(screen.getByText(/Online with PayPal/)).toBeInTheDocument();
    expect(screen.getByText(/Need another payment method\?/)).toBeInTheDocument();
    expect(screen.getByText(/Special Requests/)).toBeInTheDocument();
    expect(screen.getByText("Bookings close 24 hours before the experience starts.")).toBeVisible();
  });

  it("gives every question a stable anchor and lists them for jumping", async () => {
    await renderFaq("en");

    const pay = screen.getByRole("heading", { level: 2, name: "How do I pay?" }).closest("section");
    expect(pay).toHaveAttribute("id", "faq-pay");

    const jumpList = screen.getByRole("navigation", { name: "FAQ" });
    const links = within(jumpList).getAllByRole("link");
    expect(links).toHaveLength(10);
    expect(within(jumpList).getByRole("link", { name: "How do I pay?" })).toHaveAttribute(
      "href",
      "#faq-pay",
    );
  });

  it("ends with the way to book an experience", async () => {
    await renderFaq("ko");

    expect(screen.getByRole("link", { name: /다가오는 활동 보기/ })).toHaveAttribute(
      "href",
      "/ko/explore",
    );
  });

  it("publishes localized metadata for the FAQ page", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "en" }) });

    expectLocalizedMetadata(
      metadata,
      "HanBuddy FAQ | Booking, payment and what to expect",
      "/en/faq",
      "/faq",
    );
    expect(metadata.description).toMatch(/^Answers to what guests ask before booking/);
    expect(metadata.openGraph).toMatchObject({ url: "https://hanbuddy.kr/en/faq" });
  });
});
