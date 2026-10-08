import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "@/i18n/routing";
import { expectLocalizedMetadata } from "@/test/expect-localized-metadata";
import { renderWithIntl } from "@/test/render-with-intl";
import { findJsonLd } from "@/test/json-ld";
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

  it("groups the ten questions by topic and folds each answer under its question", async () => {
    await renderFaq("en");

    const faq = screen.getByRole("region", { name: "Questions guests ask before booking" });
    expect(
      within(faq)
        .getAllByRole("heading", { level: 2 })
        .map((group) => group.textContent),
    ).toEqual(["HanBuddy & buddies", "Booking & payment", "On the day"]);

    const questions = within(faq).getAllByRole("heading", { level: 3 });
    expect(questions.map((question) => question.textContent)).toEqual([
      "What is HanBuddy?",
      "Who are the buddies?",
      "Can I come alone?",
      "Do I need to speak Korean or know the sport?",
      "How do I pay?",
      "What is included in the price?",
      "How late can I book?",
      "What if I need to cancel?",
      "I have dietary restrictions. Is that a problem?",
      "Where do we meet?",
    ]);
    for (const question of questions) {
      // 답은 접혀 있어도 HTML에 들어 있어 검색엔진이 읽는다.
      const item = question.closest("details");
      expect(item).not.toHaveAttribute("open");
      const answer = item?.querySelector(":scope > p");
      expect(answer?.textContent).not.toBe("");
    }
  });

  it("opens an answer when its question is tapped", async () => {
    await renderFaq("en");

    const pay = screen.getByRole("heading", { level: 3, name: "How do I pay?" });
    const item = pay.closest("details")!;
    fireEvent.click(pay.closest("summary")!);
    expect(item).toHaveAttribute("open");
    expect(within(item).getByText(/Online with PayPal/)).toBeVisible();
  });

  it("names the topic groups in Korean", async () => {
    await renderFaq("ko");

    for (const name of ["HanBuddy와 버디", "예약과 결제", "활동 당일"]) {
      expect(screen.getByRole("heading", { level: 2, name })).toBeInTheDocument();
    }
  });

  it("keeps the confirmed booking facts in the answers", async () => {
    await renderFaq("en");

    expect(screen.getByText(/Online with PayPal/)).toBeInTheDocument();
    expect(screen.getByText(/Need another payment method\?/)).toBeInTheDocument();
    expect(screen.getByText(/Special Requests/)).toBeInTheDocument();
    expect(
      screen.getByText("Bookings close 24 hours before the experience starts."),
    ).toBeInTheDocument();
  });

  it("gives every question a stable anchor and lists them for jumping", async () => {
    await renderFaq("en");

    const pay = screen.getByRole("heading", { level: 3, name: "How do I pay?" });
    expect(pay.closest("details")).toHaveAttribute("id", "faq-pay");

    // 모바일은 묶음 칩, 데스크톱은 묶음과 질문 목차. 둘 다 같은 이름의 내비게이션이다.
    const [chips, rail] = screen.getAllByRole("navigation", { name: "FAQ" });
    expect(within(chips).getByRole("link", { name: /Booking & payment/ })).toHaveAttribute(
      "href",
      "#faq-group-booking",
    );
    const questionLinks = within(rail)
      .getAllByRole("link")
      .filter(
        (link) =>
          link.getAttribute("href")?.startsWith("#faq-") &&
          !link.getAttribute("href")?.startsWith("#faq-group-"),
      );
    expect(questionLinks).toHaveLength(10);
    expect(within(rail).getByRole("link", { name: "How do I pay?" })).toHaveAttribute(
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

  it.each(["en", "ko"] as const)(
    "publishes FAQPage structured data with the same questions and answers as the page in %s",
    async (locale) => {
      await renderFaq(locale);
      const html = document.body.innerHTML;
      const faq = findJsonLd(html, "FAQPage") as {
        mainEntity: { name: string; acceptedAnswer: { text: string } }[];
      };

      const items = [...document.querySelectorAll("details")];
      expect(faq.mainEntity).toHaveLength(10);
      expect(faq.mainEntity.map((entry) => entry.name)).toEqual(
        screen.getAllByRole("heading", { level: 3 }).map((question) => question.textContent),
      );
      faq.mainEntity.forEach((entry, index) => {
        expect(items[index].textContent).toContain(entry.acceptedAnswer.text);
      });
      expect(findJsonLd(html, "BreadcrumbList")).toMatchObject({
        itemListElement: [
          { position: 1, item: `https://hanbuddy.kr/${locale}` },
          { position: 2, item: `https://hanbuddy.kr/${locale}/faq` },
        ],
      });
    },
  );

  it("shows the breadcrumb that the structured data describes", async () => {
    await renderFaq("en");

    const current = screen.getByText("FAQ", { selector: "[aria-current=page]" });
    const trail = current.closest("ol")!;
    expect(within(trail).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/en");
  });
});
