import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SignupAgreementDocuments } from "@/lib/auth/signup-agreement-notices";
import type { UserType } from "@/lib/auth/types";
import type { PolicySlug } from "@/lib/policy-routes";

const POLICY_DETAILS = {
  "terms-of-service": {
    fileName: "terms-of-service.ko.md",
    title: "HanBuddy 이용약관",
  },
  "privacy-policy": {
    fileName: "privacy-policy.ko.md",
    title: "HanBuddy 개인정보처리방침",
  },
  "cancellation-refund-policy": {
    fileName: "cancellation-refund-policy.ko.md",
    title: "HanBuddy 취소 및 환불 정책",
  },
  "buddy-operation-terms": {
    fileName: "buddy-operation-terms.ko.md",
    title: "HanBuddy 버디 운영약관",
  },
  "buddy-commission-settlement-policy": {
    fileName: "buddy-commission-settlement-policy.ko.md",
    title: "HanBuddy 버디 수수료·정산 정책",
  },
  "community-safety-policy": {
    fileName: "community-safety-policy.ko.md",
    title: "HanBuddy 커뮤니티 및 안전 정책",
  },
  "consent-notices": {
    fileName: "consent-notices.ko.md",
    title: "HanBuddy 화면별 동의문",
  },
} as const satisfies Record<PolicySlug, { fileName: string; title: string }>;

export async function getPolicyDocument(slug: PolicySlug) {
  const policy = POLICY_DETAILS[slug];
  const rawSource = await readFile(
    path.join(process.cwd(), "content", "policies", policy.fileName),
    "utf8",
  );
  const version = rawSource.match(/^(?:문서 )?버전: (.+)$/m)?.[1]?.trim() ?? "";
  const source = rawSource
    .replace(/^# .+\r?\n+/, "")
    .replace(/^(?:문서 )?버전: .*\r?\n?/gm, "")
    .replace(/^(?:시행일|적용 예정일): .*\r?\n?/gm, "")
    .replace(/^부칙: 이 (?:약관|방침)은 \d{4}년 \d{1,2}월 \d{1,2}일부터 시행합니다\.\r?\n?/gm, "")
    .replace(/\n{3,}/g, "\n\n");

  return {
    slug,
    title: policy.title,
    version,
    source,
  };
}

export async function getSignupAgreementDocuments(
  userType: UserType,
): Promise<SignupAgreementDocuments> {
  const terms = await getPolicyDocument("terms-of-service");
  const documents: SignupAgreementDocuments = {
    TERMS_OF_SERVICE: { version: terms.version, source: terms.source },
  };

  if (userType === "BUDDY") {
    const [operationTerms, commissionPolicy] = await Promise.all([
      getPolicyDocument("buddy-operation-terms"),
      getPolicyDocument("buddy-commission-settlement-policy"),
    ]);
    documents.BUDDY_OPERATION_TERMS = {
      version: operationTerms.version,
      source: operationTerms.source,
    };
    documents.BUDDY_COMMISSION_POLICY = {
      version: commissionPolicy.version,
      source: commissionPolicy.source,
    };
  }

  return documents;
}
