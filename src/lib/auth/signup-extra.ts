export const SIGNUP_SOURCES = [
  "INSTAGRAM",
  "FACEBOOK",
  "GOOGLE_SEARCH",
  "FRIEND",
  "MEETUP",
  "OFFLINE_PROMOTION",
  "UNIVERSITY_COMMUNITY",
  "OTHER",
] as const;
export type SignupSource = (typeof SIGNUP_SOURCES)[number];

/** Backend #173 allowlist. Display labels are not API request values. */
export const BANKS = {
  KDB: "한국산업은행",
  IBK: "IBK기업은행",
  KB: "KB국민은행",
  SUHYUP: "Sh수협은행",
  NH: "NH농협은행",
  LOCAL_NH: "지역농축협",
  WOORI: "우리은행",
  SC: "SC제일은행",
  CITI: "한국씨티은행",
  SUHYUP_CENTRAL: "수협중앙회",
  IM_BANK: "iM뱅크",
  BUSAN: "부산은행",
  GWANGJU: "광주은행",
  JEJU: "제주은행",
  JEONBUK: "전북은행",
  KYONGNAM: "경남은행",
  SAEMAUL: "새마을금고",
  SHINHYUP: "신협",
  SAVINGS_BANK: "저축은행",
  HSBC: "HSBC은행",
  BOA: "Bank of America",
  FORESTRY: "산림조합",
  POST: "우체국",
  HANA: "하나은행",
  SHINHAN: "신한은행",
  K_BANK: "케이뱅크",
  KAKAO_BANK: "카카오뱅크",
  TOSS_BANK: "토스뱅크",
} as const;
export type BankName = keyof typeof BANKS;
export interface SignupExtraDraft {
  signupSource: string;
  signupSourceDetail: string;
  bankName: string;
  bankAccountNumber: string;
}
export type SignupExtraError = {
  field: "source" | "bank";
  key:
    | "sourceRequired"
    | "sourceInvalid"
    | "sourceDetailRequired"
    | "sourceDetailTooLong"
    | "bankPair"
    | "bankFormat"
    | "bankLength"
    | "bankInvalid";
};
export function isSignupSource(value: string): value is SignupSource {
  return SIGNUP_SOURCES.some((source) => source === value);
}
export function isBankName(value: string): value is BankName {
  return Object.hasOwn(BANKS, value);
}
export function validateSignupSource(draft: SignupExtraDraft): SignupExtraError | null {
  if (!draft.signupSource) return { field: "source", key: "sourceRequired" };
  if (!isSignupSource(draft.signupSource)) return { field: "source", key: "sourceInvalid" };
  if (draft.signupSource === "OTHER") {
    if (!draft.signupSourceDetail.trim()) return { field: "source", key: "sourceDetailRequired" };
    if (draft.signupSourceDetail.length > 100)
      return { field: "source", key: "sourceDetailTooLong" };
  }
  return null;
}
export function validateSignupBank(draft: SignupExtraDraft, role: string): SignupExtraError | null {
  if (role !== "BUDDY") return null;
  const hasAccount = Boolean(draft.bankAccountNumber.trim());
  if (Boolean(draft.bankName) !== hasAccount) return { field: "bank", key: "bankPair" };
  if (!draft.bankName && !hasAccount) return null;
  if (!isBankName(draft.bankName)) return { field: "bank", key: "bankInvalid" };
  if (draft.bankAccountNumber.length > 50) return { field: "bank", key: "bankLength" };
  if (!/^[0-9 -]+$/.test(draft.bankAccountNumber) || !/[0-9]/.test(draft.bankAccountNumber))
    return { field: "bank", key: "bankFormat" };
  return null;
}
export function validateSignupExtra(
  draft: SignupExtraDraft,
  role: string,
): SignupExtraError | null {
  return validateSignupSource(draft) ?? validateSignupBank(draft, role);
}
export function buildSignupExtra(draft: SignupExtraDraft, role: string) {
  return {
    ...(isSignupSource(draft.signupSource)
      ? {
          signupSource: draft.signupSource,
          ...(draft.signupSource === "OTHER"
            ? { signupSourceDetail: draft.signupSourceDetail.trim() }
            : {}),
        }
      : {}),
    ...(role === "BUDDY" && isBankName(draft.bankName) && draft.bankAccountNumber.trim()
      ? { bankName: draft.bankName, bankAccountNumber: draft.bankAccountNumber.trim() }
      : {}),
  };
}
