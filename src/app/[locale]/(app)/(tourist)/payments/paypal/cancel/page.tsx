"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { XIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { clearPayPalRedirectContext } from "@/lib/payments/paypal-redirect-context";

export default function PayPalCancelPage() {
  const t = useTranslations("Payment");

  useEffect(() => {
    clearPayPalRedirectContext();
  }, []);

  return (
    <PageContainer className="flex flex-1 items-center justify-center py-10 pb-32 md:py-16 lg:pb-16">
      <main className="w-full max-w-xl rounded-3xl border border-line-soft bg-canvas-soft p-8 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full border border-line-strong text-muted">
          <XIcon className="size-7" aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold text-ink">{t("paypalCancelled")}</h1>
        <p className="mt-2 text-sm text-muted">{t("paypalCancelledDescription")}</p>
        <BottomActionBar>
          <Link
            href="/applications"
            className="flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-on-primary"
          >
            {t("viewApplications")}
          </Link>
        </BottomActionBar>
      </main>
    </PageContainer>
  );
}
