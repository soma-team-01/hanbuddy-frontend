import { describe, expect, it } from "vitest";
import { POLICY_SLUGS } from "@/lib/policy-routes";
import { getPolicyDocument, getSignupAgreementDocuments } from "./policy-content";

describe("policy content", () => {
  it.each(POLICY_SLUGS)("loads the published Korean source for %s", async (slug) => {
    const policy = await getPolicyDocument(slug);

    expect(policy.slug).toBe(slug);
    expect(policy.title).toMatch(/^HanBuddy /);
    expect(policy.version).toBe("2026-09-06");
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
