"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { PageContainer } from "@/components/layout/PageContainer";
import { mapTouristActivityDetailToActivity } from "@/lib/api/activity-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { getContentLanguage } from "@/lib/content-language";
import { getDefaultDisplayCurrency } from "@/lib/display-currency";
import { getLocaleOrDefault } from "@/i18n/routing";
import { isPaymentProviderVisible, PAYMENT_PROVIDER_MODE } from "@/lib/payment-provider-visibility";
import { touristActivityQueryOptions } from "@/lib/query/activities";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";
import type { TouristActivityDetail } from "@/types/activity";
import type { PolicyDocumentData } from "@/types/policy";
import { BookingForm } from "./booking-form";

function getPayPalUnitPriceUsd(detail: TouristActivityDetail | undefined): number | undefined {
  if (detail?.displayPrice?.currency !== "USD") return undefined;
  return detail.displayPrice.discountedPrice ?? detail.displayPrice.price;
}

export function BookingContent({
  activityId,
  initialScheduleId,
  refundPolicyDocument,
}: Readonly<{
  activityId: string;
  initialScheduleId?: string;
  refundPolicyDocument?: PolicyDocumentData;
}>) {
  const locale = getLocaleOrDefault(useLocale());
  const language = getContentLanguage(locale);
  const displayCurrency = getDefaultDisplayCurrency(locale);
  const showPayPalPayment = isPaymentProviderVisible("PAYPAL", PAYMENT_PROVIDER_MODE);
  const activityQuery = useQuery(
    touristActivityQueryOptions(activityId, language, displayCurrency),
  );
  // 화면 참고 가격과 별개로 PayPal 버튼에는 실제 결제 통화인 USD 예상액을 표시한다.
  const payPalActivityQuery = useQuery({
    ...touristActivityQueryOptions(activityId, language, "USD"),
    enabled: showPayPalPayment && displayCurrency !== "USD",
  });
  const t = useTranslations("Booking");
  const tErrors = useTranslations("Errors");
  const getApiErrorMessage = useApiErrorMessage();
  useAuthQueryRedirect(activityQuery.error);

  const activity = activityQuery.data
    ? mapTouristActivityDetailToActivity(activityQuery.data, tErrors("dateTimeUnavailable"), locale)
    : null;
  const payPalUnitPriceUsd = showPayPalPayment
    ? getPayPalUnitPriceUsd(
        displayCurrency === "USD" ? activityQuery.data : payPalActivityQuery.data,
      )
    : undefined;

  if (activityQuery.isPending) {
    return <PageContainer className="py-10 text-center text-muted">{t("loading")}</PageContainer>;
  }

  if (activityQuery.error || !activity) {
    return (
      <PageContainer className="py-6 md:py-10">
        <p
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {activityQuery.error
            ? getApiErrorMessage(activityQuery.error, t("loadError"))
            : t("notFound")}
        </p>
      </PageContainer>
    );
  }

  return (
    <BookingForm
      activity={activity}
      initialSessionId={initialScheduleId}
      payPalUnitPriceUsd={payPalUnitPriceUsd}
      refundPolicyDocument={refundPolicyDocument}
    />
  );
}
