import type { Locale } from "@/i18n/routing";

// Purpose-specific drafts; no Meta, advertising, legal or cross-border promises.
export const consentCopy: Record<
  Locale,
  { title: string; body: string; accept: string; reject: string; settings: string }
> = {
  en: {
    title: "Optional analytics",
    body: "With your permission, Google Analytics helps us understand activity views, booking steps and completed payments. Analytics stays off until you accept. Your form answers and contact details are not included. You can withdraw in Cookie settings. Your choice does not affect booking or payment.",
    accept: "Sure",
    reject: "No thanks",
    settings: "Cookie settings",
  },
  ko: {
    title: "선택 분석",
    body: "허용하면 Google Analytics로 액티비티 조회, 예약 단계와 완료된 결제를 분석합니다. 허용하기 전에는 분석을 시작하지 않습니다. 입력한 요청사항과 연락처는 분석에 포함하지 않습니다. 쿠키 설정에서 언제든 철회할 수 있으며, 선택은 예약과 결제에 영향을 주지 않습니다.",
    accept: "좋아요",
    reject: "괜찮아요",
    settings: "쿠키 설정",
  },
  ja: {
    title: "任意のアクセス解析",
    body: "同意いただくと、Google Analyticsでアクティビティの閲覧、予約の手順、完了した支払いを分析します。同意するまで解析は開始しません。フォームの回答や連絡先は含めません。Cookie設定からいつでも同意を撤回できます。選択は予約や支払いに影響しません。",
    accept: "同意する",
    reject: "同意しない",
    settings: "Cookie設定",
  },
  "zh-Hans": {
    title: "可选分析",
    body: "经您同意后，我们使用Google Analytics分析活动浏览、预订步骤和已完成的付款。在您同意前不会开始分析，也不会包含表单回答或联系方式。您可以随时在Cookie设置中撤回同意。您的选择不会影响预订或付款。",
    accept: "同意",
    reject: "不同意",
    settings: "Cookie设置",
  },
  "zh-Hant": {
    title: "選用分析",
    body: "經您同意後，我們使用Google Analytics分析活動瀏覽、預訂步驟和已完成的付款。在您同意前不會開始分析，也不會包含表單回答或聯絡方式。您可以隨時在Cookie設定中撤回同意。您的選擇不會影響預訂或付款。",
    accept: "同意",
    reject: "不同意",
    settings: "Cookie設定",
  },
};
