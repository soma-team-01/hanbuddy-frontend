import type { Locale } from "@/i18n/routing";

// English and Korean strings are the approved combined-measurement copy.
export const consentCopy: Record<
  Locale,
  { title: string; body: string; accept: string; reject: string; settings: string; pending: string }
> = {
  en: {
    title: "Analytics & advertising",
    body: "Allow analytics and advertising tools to measure site use and campaign results. We don’t send form answers or contact details. You can change this anytime in Cookie settings.",
    accept: "Allow",
    reject: "No thanks",
    settings: "Cookie settings",
    pending:
      "Withdrawal is pending. Analytics is off in this browser; reconnect to finish withdrawing.",
  },
  ko: {
    title: "분석 및 광고",
    body: "서비스 이용과 캠페인 성과 측정을 위해 분석·광고 도구를 사용합니다. 폼 답변과 연락처는 전송하지 않으며, 쿠키 설정에서 언제든 변경할 수 있습니다.",
    accept: "허용",
    reject: "거절",
    settings: "쿠키 설정",
    pending:
      "철회 처리 중입니다. 이 브라우저의 분석은 꺼져 있으며, 연결이 복구되면 철회를 다시 처리합니다.",
  },
  ja: {
    title: "分析と広告",
    body: "サイトの利用状況とキャンペーンの成果を測定するため、分析・広告ツールの使用を許可します。フォームの回答や連絡先は送信しません。Cookie設定からいつでも変更できます。",
    accept: "許可する",
    reject: "許可しない",
    settings: "Cookie設定",
    pending:
      "同意の撤回を処理中です。このブラウザーの解析は停止しています。接続が回復すると再試行します。",
  },
  "zh-Hans": {
    title: "分析与广告",
    body: "允许分析和广告工具衡量网站使用情况及广告活动成效。我们不会发送表单回答或联系方式。您可以随时在Cookie设置中更改选择。",
    accept: "允许",
    reject: "拒绝",
    settings: "Cookie设置",
    pending: "正在处理撤回。此浏览器的分析已关闭，恢复连接后将重试。",
  },
  "zh-Hant": {
    title: "分析與廣告",
    body: "允許分析與廣告工具衡量網站使用情況及廣告活動成效。我們不會傳送表單回答或聯絡方式。您可以隨時在Cookie設定中變更選擇。",
    accept: "允許",
    reject: "拒絕",
    settings: "Cookie設定",
    pending: "正在處理撤回。此瀏覽器的分析已關閉，恢復連線後將重試。",
  },
};
