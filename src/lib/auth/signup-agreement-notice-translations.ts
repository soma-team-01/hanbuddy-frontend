import type { Locale } from "@/i18n/routing";
import type { SignupAgreementType, UserType } from "@/lib/auth/types";
import type { SignupAgreementNotice } from "@/lib/auth/signup-agreement-notices";
import en from "./notices/en.json";
import ja from "./notices/ja.json";
import zhHans from "./notices/zh-Hans.json";
import zhHant from "./notices/zh-Hant.json";

const notices = { en, ja, "zh-Hans": zhHans, "zh-Hant": zhHant } satisfies Record<
  Exclude<Locale, "ko">,
  Record<SignupAgreementType | "BUDDY_PRIVACY_COLLECTION_USE", SignupAgreementNotice>
>;

export function getTranslatedSignupNotice(
  agreementType: SignupAgreementType,
  userType: UserType,
  locale: Exclude<Locale, "ko">,
): SignupAgreementNotice {
  const key =
    agreementType === "PRIVACY_COLLECTION_USE" && userType === "BUDDY"
      ? "BUDDY_PRIVACY_COLLECTION_USE"
      : agreementType;
  return notices[locale][key];
}
