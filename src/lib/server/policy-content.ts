import { readFile } from "node:fs/promises";
import path from "node:path";
import { isLocale, type Locale } from "@/i18n/routing";
import type { SignupAgreementDocuments } from "@/lib/auth/signup-agreement-notices";
import type { UserType } from "@/lib/auth/types";
import { isPolicySlug, type PolicySlug } from "@/lib/policy-routes";

export async function getPolicyDocument(slug: PolicySlug, locale: Locale = "ko") {
  // Validate before constructing a filesystem path, including calls from route params.
  if (!isPolicySlug(slug) || !isLocale(locale)) throw new Error("Invalid policy document");
  const rawSource = await readFile(
    path.join(process.cwd(), "content", "policies", `${slug}.${locale}.md`),
    "utf8",
  );
  const title = rawSource.match(/^# (.+)$/m)?.[1]?.trim();
  const version = rawSource.match(/^(?:(?:문서 )?버전|Version): (.+)$/m)?.[1]?.trim();
  if (!title || !version) throw new Error(`Missing policy metadata: ${slug}.${locale}`);
  const source = rawSource
    .replace(/^# .+\r?\n+/, "")
    .replace(/^(?:(?:문서 )?버전|Version): .*\r?\n?/gm, "")
    .replace(/^(?:시행일|적용 예정일|Effective date): .*\r?\n?/gm, "")
    .replace(/^부칙: 이 (?:약관|방침)은 \d{4}년 \d{1,2}월 \d{1,2}일부터 시행합니다\.\r?\n?/gm, "")
    .replace(/\n{3,}/g, "\n\n");

  return {
    slug,
    title,
    version,
    source,
  };
}

export async function getSignupAgreementDocuments(
  userType: UserType,
  locale: Locale = "ko",
): Promise<SignupAgreementDocuments> {
  const terms = await getPolicyDocument("terms-of-service", locale);
  const documents: SignupAgreementDocuments = {
    TERMS_OF_SERVICE: { version: terms.version, source: terms.source },
  };

  if (userType === "BUDDY") {
    const [operationTerms, commissionPolicy] = await Promise.all([
      getPolicyDocument("buddy-operation-terms", locale),
      getPolicyDocument("buddy-commission-settlement-policy", locale),
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
