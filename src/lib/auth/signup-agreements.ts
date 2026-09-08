import type { SignupAgreementRequest, SignupAgreementType, UserType } from "@/lib/auth/types";
import type { SignupAgreementDocuments } from "./signup-agreement-notices";

export const SIGNUP_AGREEMENT_VERSION = "2026-09-07";

const COMMON_REQUIRED_AGREEMENT_TYPES = [
  "ADULT_CONFIRMATION",
  "TERMS_OF_SERVICE",
  "PRIVACY_COLLECTION_USE",
] as const satisfies readonly SignupAgreementType[];

const BUDDY_REQUIRED_AGREEMENT_TYPES = [
  "BUDDY_OPERATION_TERMS",
  "BUDDY_COMMISSION_POLICY",
] as const satisfies readonly SignupAgreementType[];

export function getRequiredSignupAgreementTypes(userType: UserType): SignupAgreementType[] {
  return userType === "BUDDY"
    ? [...COMMON_REQUIRED_AGREEMENT_TYPES, ...BUDDY_REQUIRED_AGREEMENT_TYPES]
    : [...COMMON_REQUIRED_AGREEMENT_TYPES];
}

export function getSignupAgreementTypes(userType: UserType): SignupAgreementType[] {
  return [...getRequiredSignupAgreementTypes(userType), "MARKETING_COMMUNICATION"];
}

export function hasAllRequiredSignupAgreements(
  userType: UserType,
  decisions: Partial<Record<SignupAgreementType, boolean>>,
) {
  return getRequiredSignupAgreementTypes(userType).every((type) => decisions[type] === true);
}

export function buildSignupAgreements(
  userType: UserType,
  decisions: Partial<Record<SignupAgreementType, boolean>>,
  documents?: SignupAgreementDocuments,
): SignupAgreementRequest[] {
  return getSignupAgreementTypes(userType).map((type) => ({
    type,
    // Record the document shown to the member; unchanged inline notices retain their own version.
    version: documents?.[type]?.version ?? SIGNUP_AGREEMENT_VERSION,
    agreed: decisions[type] === true,
  }));
}
