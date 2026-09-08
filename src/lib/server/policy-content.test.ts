import { describe, expect, it } from "vitest";
import { POLICY_SLUGS } from "@/lib/policy-routes";
import { LOCALES } from "@/i18n/routing";
import { getPolicyDocument, getSignupAgreementDocuments } from "./policy-content";

describe("policy content", () => {
  it("keeps the company as the requester in Japanese buddy publishing terms", async () => {
    const policy = await getPolicyDocument("buddy-operation-terms", "ja");
    expect(policy.source).toContain(
      "当社は明らかな不正確・違法情報、高リスク、サービス趣旨に合わない活動の修正・掲載停止を求めることができます。",
    );
    expect(policy.source).not.toContain("掲載停止を求められます");
  });

  it("uses the correct traditional Chinese withdrawal-restriction wording", async () => {
    const policy = await getPolicyDocument("consent-notices", "zh-Hant");
    expect(policy.source).toContain("法定期限後或法定限制事由成立時");
    expect(policy.source).not.toContain("限製");
  });

  it.each([
    ["zh-Hans", "通过服务公布内容及生效日。", "重大影响权利的变更提前30天通知，其他提前7天通知。"],
    ["zh-Hant", "透過服務公布內容及生效日。", "重大影響權利的變更提前30天通知，其他提前7天通知。"],
  ] as const)(
    "clearly describes how privacy-policy changes are announced in %s",
    async (locale, publication, noticePeriod) => {
      const policy = await getPolicyDocument("privacy-policy", locale);
      expect(policy.source).toContain(publication);
      expect(policy.source).toContain(noticePeriod);
    },
  );

  it.each([
    ["ko", "최초 신청 시의 동의는 해당 신청에 유지됩니다.", "다시 확인하고 필수 동의합니다"],
    [
      "en",
      "Consent given at the initial application remains valid for that application.",
      "give required consent again",
    ],
    ["ja", "初回申請時の同意は、その申請について維持されます。", "再確認して必須同意します"],
    ["zh-Hans", "首次申请时的同意继续适用于该申请。", "重新确认相同说明并必选同意"],
    ["zh-Hant", "首次申請時的同意繼續適用於該申請。", "重新確認相同說明並必選同意"],
  ] as const)(
    "keeps initial consent without requiring repeat consent in %s",
    async (locale, retained, repeated) => {
      const document = await getPolicyDocument("consent-notices", locale);
      expect(document.source).toContain(retained);
      expect(document.source).not.toContain(repeated);
    },
  );

  it.each(LOCALES)(
    "loads every complete policy in %s with the same version and sections",
    async (locale) => {
      for (const slug of POLICY_SLUGS) {
        const original = await getPolicyDocument(slug, "ko");
        const translated = await getPolicyDocument(slug, locale);
        expect(translated.version).toBe(original.version);
        expect(translated.source.match(/^## /gm)?.length).toBe(
          original.source.match(/^## /gm)?.length,
        );
        expect(translated.source.match(/^\d+\. /gm)?.length).toBe(
          original.source.match(/^\d+\. /gm)?.length,
        );
        expect(translated.source.match(/\d+%/g)?.sort()).toEqual(
          original.source.match(/\d+%/g)?.sort(),
        );
        expect(translated.title).toMatch(/^HanBuddy /);
        expect(translated.source).not.toMatch(/^(Version|Effective date|버전|시행일):/m);
        if (locale !== "ko") {
          expect(translated.title).not.toBe(original.title);
          expect(translated.source).not.toMatch(/[가-힣]/);
        }
      }
    },
  );

  it("passes the language through to signup policy documents", async () => {
    const documents = await getSignupAgreementDocuments("BUDDY", "en");
    expect(documents.TERMS_OF_SERVICE?.source).toContain("## Article 1.");
    expect(documents.BUDDY_COMMISSION_POLICY?.source).toContain("22%");
    expect(documents.BUDDY_COMMISSION_POLICY?.source).toContain("11%");
    expect(documents.BUDDY_OPERATION_TERMS?.source).not.toMatch(/[가-힣]/);
  });
  it.each(POLICY_SLUGS)("loads the published Korean source for %s", async (slug) => {
    const policy = await getPolicyDocument(slug);

    expect(policy.slug).toBe(slug);
    expect(policy.title).toMatch(/^HanBuddy /);
    expect(policy.version).toBe(
      ["cancellation-refund-policy", "terms-of-service", "consent-notices"].includes(slug)
        ? "2026-09-08"
        : "2026-09-07",
    );
    expect(policy.source).not.toContain("버전:");
    expect(policy.source).not.toContain("시행일:");
    expect(policy.source).not.toContain("적용 예정일:");
    expect(policy.source).not.toContain("2026년 9월 20일부터 시행");
    expect(policy.source).not.toContain("게시 전");
  });

  it("loads the full agreement documents required for each signup role", async () => {
    const touristDocuments = await getSignupAgreementDocuments("TOURIST");
    const buddyDocuments = await getSignupAgreementDocuments("BUDDY");

    expect(Object.keys(touristDocuments)).toEqual(["TERMS_OF_SERVICE"]);
    expect(touristDocuments.TERMS_OF_SERVICE?.source).toContain("## 제1조 목적");
    expect(Object.keys(buddyDocuments)).toEqual([
      "TERMS_OF_SERVICE",
      "BUDDY_OPERATION_TERMS",
      "BUDDY_COMMISSION_POLICY",
    ]);
    expect(buddyDocuments.BUDDY_OPERATION_TERMS?.source).toContain("## 제1조 버디 자격과 승인");
    expect(buddyDocuments.BUDDY_OPERATION_TERMS?.source).toContain(
      "제공받은 투어리스트의 닉네임, 프로필 이미지, 예약 인원, 요청사항 및 연락처",
    );
    expect(buddyDocuments.BUDDY_COMMISSION_POLICY?.source).toContain("## 1. 수수료율");
  });

  it("publishes the actual reservation contact disclosure flow", async () => {
    const privacyPolicy = await getPolicyDocument("privacy-policy");
    const consentNotices = await getPolicyDocument("consent-notices");

    expect(privacyPolicy.source).toContain(
      "닉네임과 프로필 이미지는 버디와 투어리스트 모두에게 동일하게 공개됩니다.",
    );
    expect(privacyPolicy.source).toContain(
      "버디가 가입 심사를 위해 제출한 전화번호 등 연락 정보는 투어리스트나 일반 이용자에게 공개하거나 제공하지 않습니다.",
    );
    expect(privacyPolicy.source).not.toContain("해당 활동을 예약한 투어리스트 | 제공자 확인");
    expect(consentNotices.source).not.toContain("예약 투어리스트 연락처 이용·보호 의무 확인");
    expect(consentNotices.source).not.toContain("버디 프로필 및 연락처 제공 동의");
  });
});
