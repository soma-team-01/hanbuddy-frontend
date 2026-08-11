import type { SignupAgreementRequest, SignupAgreementType, UserType } from "@/lib/auth/types";

export const SIGNUP_AGREEMENT_VERSION = "2026-08-06";

const COMMON_REQUIRED_AGREEMENT_TYPES = [
  "ADULT_CONFIRMATION",
  "TERMS_OF_SERVICE",
  "PRIVACY_COLLECTION_USE",
] as const satisfies readonly SignupAgreementType[];

const BUDDY_REQUIRED_AGREEMENT_TYPES = [
  "BUDDY_OPERATION_TERMS",
  "BUDDY_COMMISSION_POLICY",
  "BUDDY_PROFILE_CONTACT_PROVISION",
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
): SignupAgreementRequest[] {
  return getSignupAgreementTypes(userType).map((type) => ({
    type,
    version: SIGNUP_AGREEMENT_VERSION,
    agreed: decisions[type] === true,
  }));
}
