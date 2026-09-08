import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/routing";
import { POLICY_SLUGS } from "@/lib/policy-routes";
import { getPolicyDocument } from "./policy-content";

const clauses = {
  ko: [
    "예약이 확정된 시점부터 30분 이내",
    "활동 시작 예정 시각 전",
    "공급이 시작된 날부터 7일",
    "제공이 개시되지 않은 부분",
    "기산일부터 3영업일 이내에 환급",
  ],
  en: [
    "within 30 minutes of payment confirmation",
    "before the scheduled activity start",
    "7 days from receipt or commencement of supply",
    "portions whose provision has not begun",
    "refund within 3 business days of the statutory starting date",
  ],
  ja: [
    "決済により予約が確定してから30分以内",
    "活動の予定開始時刻前",
    "供給を受けた日または供給開始日から7日",
    "提供が開始されていない部分",
    "法定の起算日から3営業日以内に返金",
  ],
  "zh-Hans": [
    "付款完成并确认预订后30分钟内",
    "活动计划开始时间之前",
    "收到供应或供应开始之日起7天",
    "尚未开始提供的部分",
    "法定起算日起3个工作日内退款",
  ],
  "zh-Hant": [
    "付款完成並確認預訂後30分鐘內",
    "活動預定開始時間之前",
    "收到供應或供應開始之日起7天",
    "尚未開始提供的部分",
    "法定起算日起3個工作日內退款",
  ],
} as const;

describe("refund policy revision", () => {
  it.each(LOCALES)("publishes the agreed refund conditions in %s", async (locale) => {
    const policy = await getPolicyDocument("cancellation-refund-policy", locale);
    expect(policy.version).toBe("2026-09-08");
    for (const clause of clauses[locale]) expect(policy.source).toContain(clause);
    for (const slug of ["terms-of-service", "consent-notices"] as const) {
      const document = await getPolicyDocument(slug, locale);
      expect(document.version).toBe("2026-09-08");
      expect(document.source).toContain(clauses[locale][0]);
      expect(document.source).toContain(clauses[locale][1]);
      expect(document.source).toContain(clauses[locale][2]);
    }
  });

  it.each(LOCALES)("keeps version-only metadata in raw %s documents", async (locale) => {
    for (const slug of POLICY_SLUGS) {
      const source = await readFile(
        path.join(process.cwd(), "content/policies", `${slug}.${locale}.md`),
        "utf8",
      );
      expect(source).not.toMatch(/^(시행일|적용 예정일|Effective date):/m);
      expect(source).not.toMatch(/^부칙:.*\d{4}년\s*\d{1,2}월\s*\d{1,2}일부터 시행합니다\./m);
    }
  });
});
