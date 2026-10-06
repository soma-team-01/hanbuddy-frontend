import { render, cleanup } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/routing";
import { PolicyDocument } from "@/components/policy/PolicyDocument";
import { getSignupAgreementNotice } from "@/lib/auth/signup-agreement-notices";
import { buildSignupAgreements } from "@/lib/auth/signup-agreements";
import { getPolicyDocument, getSignupAgreementDocuments } from "./policy-content";

const eligibility = {
  ko: ["2026-11-30", "KST", "영구", "12월 이후", "자동 승인"],
  en: ["2026-11-30", "KST", "permanent", "December or later", "automatically approve"],
  ja: ["2026-11-30", "KST", "恒久", "12月以降", "自動承認"],
  "zh-Hans": ["2026-11-30", "KST", "永久", "12月或以后", "自动批准"],
  "zh-Hant": ["2026-11-30", "KST", "永久", "12月或以後", "自動批准"],
} as const;

describe("buddy commission revision at policy and signup boundaries", () => {
  it.each(LOCALES)(
    "renders the approved rates and eligibility in every %s entry point",
    async (locale) => {
      for (const slug of [
        "buddy-operation-terms",
        "buddy-commission-settlement-policy",
        "consent-notices",
      ] as const) {
        const document = await getPolicyDocument(slug, locale);
        const { container } = render(<PolicyDocument locale={locale} source={document.source} />);
        const text = container.textContent!;
        expect(text).toContain("20%");
        expect(text).toContain("15%");
        expect(text).not.toMatch(/22%|11%/);
        for (const clause of eligibility[locale]) expect(text).toContain(clause);
        expect(document.version).toBe("2026-10-06");
        cleanup();
      }
      const notice = getSignupAgreementNotice(
        "BUDDY_COMMISSION_POLICY",
        "BUDDY",
        locale,
      ).paragraphs.join(" ");
      expect(notice).toContain("20%");
      expect(notice).toContain("15%");
      expect(notice).not.toMatch(/22%|11%/);
      for (const clause of eligibility[locale]) expect(notice).toContain(clause);
    },
  );

  it.each(LOCALES)(
    "records the revised document versions shown to a Buddy in %s",
    async (locale) => {
      const documents = await getSignupAgreementDocuments("BUDDY", locale);
      const agreements = buildSignupAgreements("BUDDY", {}, documents);
      expect(agreements.find(({ type }) => type === "BUDDY_OPERATION_TERMS")?.version).toBe(
        "2026-10-06",
      );
      expect(agreements.find(({ type }) => type === "BUDDY_COMMISSION_POLICY")?.version).toBe(
        "2026-10-06",
      );
      expect(agreements.find(({ type }) => type === "TERMS_OF_SERVICE")?.version).toBe(
        "2026-10-06",
      );
    },
  );
});
