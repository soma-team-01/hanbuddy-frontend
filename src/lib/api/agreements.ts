import type { MarketingConsentRequest, MyAgreement, MyAgreements } from "@/types/agreement";
import { requestApiResult } from "@/lib/api/result";

export function getMyAgreements() {
  return requestApiResult<MyAgreements, "data">(
    "/api/users/me/agreements",
    "data",
    undefined,
    "동의 내역을 불러오지 못했습니다.",
  );
}

export function updateMarketingConsent(request: MarketingConsentRequest) {
  return requestApiResult<MyAgreement, "agreement">(
    "/api/users/me/marketing-consent",
    "agreement",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    },
    "마케팅 수신 설정을 저장하지 못했습니다.",
  );
}
