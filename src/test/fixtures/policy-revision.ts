import type { Locale } from "@/i18n/routing";

interface PolicyRevisionExpectations {
  cancellation: {
    timing: string;
    excludedMinimumParticipantText: string;
    discretion: string;
    venue: string;
    safety: string;
    weather: string;
    previousDate: string;
  };
  settlement: {
    deadline: string;
    holidays: string;
    effective: string;
    transfer: string;
  };
}

/** Literal test expectations shared by the two policy revision suites. */
export const policyRevisionExpectations = {
  ko: {
    cancellation: {
      timing: "남은 기간과 관계없이",
      excludedMinimumParticipantText: "최소 참가 인원",
      discretion: "부과할 수 있습니다",
      venue: "장소 폐쇄",
      safety: "심각한 안전 위험",
      weather: "기상 상황",
      previousDate: "기존 개정의 시행일",
    },
    settlement: {
      deadline: "다음 달 제5영업일까지",
      holidays: "금융기관 휴무일을 제외",
      effective: "시행일은 2026-10-06 한국시간(KST)",
      transfer: "송금 기한",
    },
  },
  en: {
    cancellation: {
      timing: "regardless of the time remaining",
      excludedMinimumParticipantText: "minimum participant",
      discretion: "may impose",
      venue: "venue closure",
      safety: "serious safety danger",
      weather: "weather",
      previousDate: "effective date of the earlier revision",
    },
    settlement: {
      deadline: "5th business day of the following month",
      holidays: "Bank holidays are excluded",
      effective: "effective date is 2026-10-06 Korea Standard Time (KST)",
      transfer: "transfer deadline",
    },
  },
  ja: {
    cancellation: {
      timing: "残りの期間にかかわらず",
      excludedMinimumParticipantText: "最低参加人数",
      discretion: "課すことができます",
      venue: "会場の閉鎖",
      safety: "重大な安全上の危険",
      weather: "天候",
      previousDate: "従前の改訂の施行日",
    },
    settlement: {
      deadline: "翌月の第5営業日まで",
      holidays: "金融機関休業日を除いて",
      effective: "施行日は2026-10-06韓国標準時（KST）",
      transfer: "送金期限",
    },
  },
  "zh-Hans": {
    cancellation: {
      timing: "无论距离活动开始还有多久",
      excludedMinimumParticipantText: "最低参与人数",
      discretion: "可收取",
      venue: "场地关闭",
      safety: "严重安全危险",
      weather: "天气",
      previousDate: "既有修订的生效日期",
    },
    settlement: {
      deadline: "次月第5个工作日之前（含当日）",
      holidays: "不计银行休息日",
      effective: "生效日期为2026-10-06韩国标准时间（KST）",
      transfer: "汇款期限",
    },
  },
  "zh-Hant": {
    cancellation: {
      timing: "無論距離活動開始還有多久",
      excludedMinimumParticipantText: "最低參與人數",
      discretion: "可收取",
      venue: "場地關閉",
      safety: "嚴重安全危險",
      weather: "天氣",
      previousDate: "既有修訂的生效日期",
    },
    settlement: {
      deadline: "次月第5個工作日之前（含當日）",
      holidays: "不計銀行休息日",
      effective: "生效日期為2026-10-06韓國標準時間（KST）",
      transfer: "匯款期限",
    },
  },
} satisfies Record<Locale, PolicyRevisionExpectations>;
