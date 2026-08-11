/** 숫자만 남긴다. 전화번호 상태 저장·백엔드 전송(E.164 조합)용. */
export function toDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * 휴대폰 번호 숫자를 3-4-4 하이픈 표기로 포맷한다 (예: 01012345678 -> 010-1234-5678).
 * 상태에는 숫자만 저장하고 화면에 표시할 때만 사용한다.
 */
export function formatKoreanPhone(digits: string): string {
  const d = digits.slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}
