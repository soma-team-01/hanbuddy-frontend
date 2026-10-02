"use client";

import { useTranslations } from "next-intl";
import { PageContainer } from "@/components/layout/PageContainer";

export function PublicActivityError() {
  const t = useTranslations("Landing.recommended");
  return (
    <PageContainer className="py-10">
      <meta name="robots" content="noindex, nofollow" />
      <h1 className="font-display text-2xl font-bold">{t("errorTitle")}</h1>
      <p role="alert" className="mt-3 text-muted">
        {t("errorDescription")}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary"
      >
        {t("retry")}
      </button>
    </PageContainer>
  );
}
