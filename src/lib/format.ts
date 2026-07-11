export function formatKrw(amount: number): string {
  return `₩${amount.toLocaleString("en-US")}`;
}

/**
 * 백엔드 startAt(Asia/Seoul 오프셋 포함 date-time)을 표기용 날짜/시각으로 분리한다.
 * 오프셋이 이미 서울 현지 시각이므로 타임존 변환 없이 문자열을 그대로 자른다.
 */
export function splitStartAt(startAt: string): { date: string; time: string } {
  return { date: startAt.slice(0, 10), time: startAt.slice(11, 16) };
}
