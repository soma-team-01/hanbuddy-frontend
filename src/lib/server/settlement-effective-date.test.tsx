import { render, cleanup } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PolicyDocument } from "@/components/policy/PolicyDocument";
import { getPolicyDocument, getSignupAgreementDocuments } from "./policy-content";

const clauses = [
  [
    "ko",
    "다음 달 제5영업일까지",
    "금융기관 휴무일을 제외",
    "시행일은 2026-10-06 한국시간(KST)",
    "송금 기한",
  ],
  [
    "en",
    "5th business day of the following month",
    "Bank holidays are excluded",
    "effective date is 2026-10-06 Korea Standard Time (KST)",
    "transfer deadline",
  ],
  [
    "ja",
    "翌月の第5営業日まで",
    "金融機関休業日を除いて",
    "施行日は2026-10-06韓国標準時（KST）",
    "送金期限",
  ],
  [
    "zh-Hans",
    "次月第5个工作日之前（含当日）",
    "不计银行休息日",
    "生效日期为2026-10-06韩国标准时间（KST）",
    "汇款期限",
  ],
  [
    "zh-Hant",
    "次月第5個工作日之前（含當日）",
    "不計銀行休息日",
    "生效日期為2026-10-06韓國標準時間（KST）",
    "匯款期限",
  ],
] as const;

describe("monthly settlement and confirmed effective date", () => {
  it.each(clauses)(
    "renders the monthly transfer deadline and effective date in %s",
    async (locale, deadline, holidays, effective, transfer) => {
      const policy = await getPolicyDocument("buddy-commission-settlement-policy", locale);
      const { container } = render(<PolicyDocument locale={locale} source={policy.source} />);
      for (const clause of [deadline, holidays, effective, transfer])
        expect(container).toHaveTextContent(clause);
      cleanup();
      for (const slug of [
        "terms-of-service",
        "buddy-operation-terms",
        "consent-notices",
      ] as const) {
        const doc = await getPolicyDocument(slug, locale);
        const rendered = render(<PolicyDocument locale={locale} source={doc.source} />);
        expect(rendered.container).toHaveTextContent(effective);
        cleanup();
      }
      const documents = await getSignupAgreementDocuments("BUDDY", locale);
      for (const doc of Object.values(documents)) expect(doc.source).toContain(effective);
    },
  );
});
