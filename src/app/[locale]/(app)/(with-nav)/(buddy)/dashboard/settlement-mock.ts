/**
 * 정산 화면 확인용 목업 데이터.
 * 백엔드 정산 API가 아직 없어 UI를 먼저 만든다 — 연동되면 이 파일을 지우고 응답으로 대체한다.
 */

export interface SettlementItem {
  settlementId: number;
  /** 활동이 진행된 날짜 (Asia/Seoul 기준 YYYY-MM-DD) */
  date: string;
  activityTitle: string;
  /** 회차 시작 시각 표기 */
  timeLabel: string;
  guestCount: number;
  /** 정산 금액 (KRW) */
  amount: number;
  status: "scheduled" | "paid";
}

export interface SettlementSummary {
  /** 이번 달 지급 예정 금액 합계 (KRW) */
  expectedAmount: number;
  /** 예정 금액에 포함된 확정 신청 건수 */
  confirmedCount: number;
  /** 다음 지급일 (Asia/Seoul 기준 YYYY-MM-DD) */
  payoutDate: string;
  items: SettlementItem[];
}

export const SETTLEMENT_MOCK: SettlementSummary = {
  expectedAmount: 1_284_000,
  confirmedCount: 7,
  payoutDate: "2026-08-25",
  items: [
    {
      settlementId: 1,
      date: "2026-08-14",
      activityTitle: "이준영과 함께하는 한강 투어",
      timeLabel: "17:30",
      guestCount: 3,
      amount: 405_000,
      status: "scheduled",
    },
    {
      settlementId: 2,
      date: "2026-08-15",
      activityTitle: "이준영과 함께하는 한강 투어",
      timeLabel: "17:30",
      guestCount: 2,
      amount: 270_000,
      status: "scheduled",
    },
    {
      settlementId: 3,
      date: "2026-08-20",
      activityTitle: "북촌 골목 숨은 명소 산책",
      timeLabel: "10:00",
      guestCount: 2,
      amount: 609_000,
      status: "scheduled",
    },
    {
      settlementId: 4,
      date: "2026-07-28",
      activityTitle: "북촌 골목 숨은 명소 산책",
      timeLabel: "10:00",
      guestCount: 4,
      amount: 812_000,
      status: "paid",
    },
    {
      settlementId: 5,
      date: "2026-07-19",
      activityTitle: "이준영과 함께하는 한강 투어",
      timeLabel: "17:30",
      guestCount: 2,
      amount: 270_000,
      status: "paid",
    },
  ],
};
