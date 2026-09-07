import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/routing";
import { getSignupAgreementNotice, SIGNUP_AGREEMENT_NOTICES } from "./signup-agreement-notices";
import type { SignupAgreementType } from "./types";

describe("localized signup notices", () => {
  it.each(LOCALES)("provides all notices and role-specific privacy details in %s", (locale) => {
    for (const agreementType of Object.keys(SIGNUP_AGREEMENT_NOTICES) as SignupAgreementType[]) {
      for (const userType of ["TOURIST", "BUDDY"] as const) {
        const original = getSignupAgreementNotice(agreementType, userType, "ko");
        const notice = getSignupAgreementNotice(agreementType, userType, locale);
        expect(notice.paragraphs.length).toBe(original.paragraphs.length);
        expect(notice.details?.length).toBe(original.details?.length);
        expect(JSON.stringify(notice).match(/\d+%/g)?.sort()).toEqual(
          JSON.stringify(original).match(/\d+%/g)?.sort(),
        );
        if (locale !== "ko") expect(JSON.stringify(notice)).not.toMatch(/[가-힣]/);
      }
    }
    expect(getSignupAgreementNotice("PRIVACY_COLLECTION_USE", "BUDDY", locale)).not.toEqual(
      getSignupAgreementNotice("PRIVACY_COLLECTION_USE", "TOURIST", locale),
    );
  });
});
