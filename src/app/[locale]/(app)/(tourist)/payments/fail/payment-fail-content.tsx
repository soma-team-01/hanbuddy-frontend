"use client";

import { useTranslations } from "next-intl";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { XIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { TossFailReasonKey } from "@/lib/payments/toss-fail-codes";

interface PaymentFailContentProps {
  /** 토스 오류 코드에서 매핑한 실패 사유. 알 수 없는 코드면 null */
  reasonKey: TossFailReasonKey | null;
}

export function PaymentFailContent({ reasonKey }: Readonly<PaymentFailContentProps>) {
  const t = useTranslations("Payment");

  return (
    <PageContainer className="flex flex-1 items-center justify-center py-10 pb-44 md:py-16 lg:pb-16">
      <main
        data-testid="payment-fail"
        className="w-full max-w-2xl rounded-3xl border border-line-soft bg-canvas-soft p-6 text-center shadow-[0_18px_45px_rgba(61,45,43,0.1)] md:p-10"
      >
        <section className="flex flex-col items-center">
          <span className="flex size-20 items-center justify-center rounded-full border-2 border-danger/40 text-danger">
            <XIcon className="size-10" aria-hidden />
          </span>
          <h1 className="mt-6 font-display text-3xl font-bold text-ink">{t("failTitle")}</h1>
          <p className="mt-2 text-sm text-muted">{t("failDescription")}</p>
          {reasonKey ? (
            <p role="alert" className="mt-4 text-sm break-keep text-danger">
              {t(`failReasons.${reasonKey}`)}
            </p>
          ) : null}
        </section>
        <BottomActionBar>
          <div className="flex w-full flex-col gap-2">
            <Link
              href="/applications"
              className="flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-on-primary"
            >
              {t("retryFromApplications")}
            </Link>
            <Link
              href="/explore"
              className="flex w-full items-center justify-center rounded-xl border border-primary px-5 py-3 text-sm font-bold text-primary"
            >
              {t("exploreMore")}
            </Link>
          </div>
        </BottomActionBar>
      </main>
    </PageContainer>
  );
}
