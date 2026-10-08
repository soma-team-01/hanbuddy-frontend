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

/** Keep the locale mapping in one place while retaining literal test expectations. */
function localized(
  ko: string,
  en: string,
  ja: string,
  zhHans: string,
  zhHant: string,
): Record<Locale, string> {
  return { ko, en, ja, "zh-Hans": zhHans, "zh-Hant": zhHant };
}

const cancellation = {
  timing: localized(
    "남은 기간과 관계없이",
    "regardless of the time remaining",
    "残りの期間にかかわらず",
    "无论距离活动开始还有多久",
    "無論距離活動開始還有多久",
  ),
  excludedMinimumParticipantText: localized(
    "최소 참가 인원",
    "minimum participant",
    "最低参加人数",
    "最低参与人数",
    "最低參與人數",
  ),
  discretion: localized(
    "부과할 수 있습니다",
    "may impose",
    "課すことができます",
    "可收取",
    "可收取",
  ),
  venue: localized("장소 폐쇄", "venue closure", "会場の閉鎖", "场地关闭", "場地關閉"),
  safety: localized(
    "심각한 안전 위험",
    "serious safety danger",
    "重大な安全上の危険",
    "严重安全危险",
    "嚴重安全危險",
  ),
  weather: localized("기상 상황", "weather", "天候", "天气", "天氣"),
  previousDate: localized(
    "기존 개정의 시행일",
    "effective date of the earlier revision",
    "従前の改訂の施行日",
    "既有修订的生效日期",
    "既有修訂的生效日期",
  ),
};

const settlement = {
  deadline: localized(
    "다음 달 제5영업일까지",
    "5th business day of the following month",
    "翌月の第5営業日まで",
    "次月第5个工作日之前（含当日）",
    "次月第5個工作日之前（含當日）",
  ),
  holidays: localized(
    "금융기관 휴무일을 제외",
    "Bank holidays are excluded",
    "金融機関休業日を除いて",
    "不计银行休息日",
    "不計銀行休息日",
  ),
  effective: localized(
    "시행일은 2026-10-06 한국시간(KST)",
    "effective date is 2026-10-06 Korea Standard Time (KST)",
    "施行日は2026-10-06韓国標準時（KST）",
    "生效日期为2026-10-06韩国标准时间（KST）",
    "生效日期為2026-10-06韓國標準時間（KST）",
  ),
  transfer: localized("송금 기한", "transfer deadline", "送金期限", "汇款期限", "匯款期限"),
};

function forLocale(locale: Locale): PolicyRevisionExpectations {
  return {
    cancellation: {
      timing: cancellation.timing[locale],
      excludedMinimumParticipantText: cancellation.excludedMinimumParticipantText[locale],
      discretion: cancellation.discretion[locale],
      venue: cancellation.venue[locale],
      safety: cancellation.safety[locale],
      weather: cancellation.weather[locale],
      previousDate: cancellation.previousDate[locale],
    },
    settlement: {
      deadline: settlement.deadline[locale],
      holidays: settlement.holidays[locale],
      effective: settlement.effective[locale],
      transfer: settlement.transfer[locale],
    },
  };
}

export const policyRevisionExpectations = {
  ko: forLocale("ko"),
  en: forLocale("en"),
  ja: forLocale("ja"),
  "zh-Hans": forLocale("zh-Hans"),
  "zh-Hant": forLocale("zh-Hant"),
} satisfies Record<Locale, PolicyRevisionExpectations>;
