import type { SignupAgreementType, UserType } from "@/lib/auth/types";

export interface MyAgreement {
  type: SignupAgreementType;
  required: boolean;
  editable: boolean;
  recorded: boolean;
  agreed: boolean | null;
  version: string | null;
  currentVersion: string;
  decidedAt: string | null;
  withdrawnAt: string | null;
}

export interface MyAgreements {
  userType: UserType;
  agreements: MyAgreement[];
}

export type MarketingConsentRequest = { agreed: true; version: string } | { agreed: false };
