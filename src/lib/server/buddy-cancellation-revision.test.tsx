import { cleanup, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PolicyDocument } from "@/components/policy/PolicyDocument";
import { getPolicyDocument, getSignupAgreementDocuments } from "./policy-content";

const cases = [
  [
    "ko",
    "남은 기간과 관계없이",
    "최소 참가 인원",
    "부과할 수 있습니다",
    "장소 폐쇄",
    "심각한 안전 위험",
    "기상 상황",
    "기존 개정의 시행일",
  ],
  [
    "en",
    "regardless of the time remaining",
    "minimum participant",
    "may impose",
    "venue closure",
    "serious safety danger",
    "weather",
    "effective date of the earlier revision",
  ],
  [
    "ja",
    "残りの期間にかかわらず",
    "最低参加人数",
    "課すことができます",
    "会場の閉鎖",
    "重大な安全上の危険",
    "天候",
    "従前の改訂の施行日",
  ],
  [
    "zh-Hans",
    "无论距离活动开始还有多久",
    "最低参与人数",
    "可收取",
    "场地关闭",
    "严重安全危险",
    "天气",
    "既有修订的生效日期",
  ],
  [
    "zh-Hant",
    "無論距離活動開始還有多久",
    "最低參與人數",
    "可收取",
    "場地關閉",
    "嚴重安全危險",
    "天氣",
    "既有修訂的生效日期",
  ],
] as const;

describe("Buddy-attributable cancellation terms", () => {
  it.each(cases)(
    "shows the revised conditions in public and signup %s documents",
    async (locale, timing, minimum, discretion, venue, safety, weather, previousDate) => {
      const operation = await getPolicyDocument("buddy-operation-terms", locale);
      const settlement = await getPolicyDocument("buddy-commission-settlement-policy", locale);
      for (const doc of [operation, settlement]) {
        const { container } = render(<PolicyDocument locale={locale} source={doc.source} />);
        for (const phrase of [timing, discretion, "20%", previousDate])
          expect(container).toHaveTextContent(phrase);
        expect(container).not.toHaveTextContent(minimum);
        expect(doc.version).toBe("2026-10-08");
        cleanup();
      }
      const cancellation = operation.source.split(/^## /m)[4];
      for (const phrase of [venue, safety, weather]) expect(cancellation).toContain(phrase);
      expect(cancellation).not.toMatch(/7일|7 days|7日|7天/);
      expect(settlement.source.split(/^## /m)[3]).not.toMatch(/7일|7 days|7日|7天/);
      const documents = await getSignupAgreementDocuments("BUDDY", locale);
      expect(documents.BUDDY_OPERATION_TERMS).toEqual({
        version: operation.version,
        source: operation.source,
      });
      expect(documents.BUDDY_COMMISSION_POLICY).toEqual({
        version: settlement.version,
        source: settlement.source,
      });
    },
  );
});
