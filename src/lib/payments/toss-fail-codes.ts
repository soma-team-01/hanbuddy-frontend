/** 결제 실패 화면에서 안내할 수 있는 토스 오류 사유 */
export type TossFailReasonKey =
  "cancelled" | "aborted" | "rejectedByCardCompany" | "cardIssue" | "exceededLimit";

/**
 * 토스 failUrl은 code·message를 쿼리로 전달한다.
 * message를 그대로 노출하면 임의 문구를 우리 화면에 띄울 수 있으므로,
 * 알려진 코드만 번역 키로 매핑하고 나머지는 일반 안내로 대체한다.
 */
const FAIL_REASON_KEYS: Record<string, TossFailReasonKey> = {
  PAY_PROCESS_CANCELED: "cancelled",
  USER_CANCEL: "cancelled",
  PAY_PROCESS_ABORTED: "aborted",
  REJECT_CARD_COMPANY: "rejectedByCardCompany",
  REJECT_CARD_PAYMENT: "rejectedByCardCompany",
  INVALID_CARD_EXPIRATION: "cardIssue",
  INVALID_STOPPED_CARD: "cardIssue",
  NOT_SUPPORTED_CARD_TYPE: "cardIssue",
  EXCEED_MAX_DAILY_PAYMENT_COUNT: "exceededLimit",
  EXCEED_MAX_PAYMENT_AMOUNT: "exceededLimit",
  EXCEED_MAX_ONE_DAY_AMOUNT: "exceededLimit",
};

export function resolveTossFailReasonKey(
  code: string | null | undefined,
): TossFailReasonKey | null {
  if (!code) return null;
  return FAIL_REASON_KEYS[code] ?? null;
}
