"use client";

import { useTranslations } from "next-intl";
import { PaymentResultPanel } from "@/components/payment/PaymentResultPanel";
import type { TossFailReasonKey } from "@/lib/payments/toss-fail-codes";

interface PaymentFailContentProps {
  /** 토스 오류 코드에서 매핑한 실패 사유. 알 수 없는 코드면 null */
  reasonKey: TossFailReasonKey | null;
}

export function PaymentFailContent({ reasonKey }: Readonly<PaymentFailContentProps>) {
  const t = useTranslations("Payment");
  return (
    <PaymentResultPanel
      title={t("failTitle")}
      description={t("failDescription")}
      message={reasonKey ? t(`failReasons.${reasonKey}`) : undefined}
    />
  );
}
