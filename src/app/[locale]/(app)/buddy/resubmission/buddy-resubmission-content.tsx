"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { OnboardingForm } from "@/app/[locale]/(app)/onboarding/OnboardingForm";
import { PageContainer } from "@/components/layout/PageContainer";
import { Link } from "@/i18n/navigation";
import type { ApiResponse, BuddyResubmission, ErrorApiResponse } from "@/lib/auth/types";

type LoadState =
  | { status: "loading" }
  | { status: "success"; application: BuddyResubmission }
  | { status: "error"; sessionExpired: boolean };

export function BuddyResubmissionContent() {
  const t = useTranslations("BuddyResubmission");
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [requestVersion, setRequestVersion] = useState(0);

  const retry = useCallback(() => {
    setLoadState({ status: "loading" });
    setRequestVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadApplication() {
      try {
        const response = await fetch("/api/auth/buddy/resubmission", {
          signal: controller.signal,
        });
        const body = (await response.json().catch(() => undefined)) as
          ApiResponse<BuddyResubmission> | ErrorApiResponse | undefined;

        if (!response.ok || !body?.isSuccess) {
          setLoadState({
            status: "error",
            sessionExpired: response.status === 401 || response.status === 409,
          });
          return;
        }
        setLoadState({ status: "success", application: body.result });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLoadState({ status: "error", sessionExpired: false });
      }
    }

    void loadApplication();
    return () => controller.abort();
  }, [requestVersion]);

  if (loadState.status === "success") {
    return <OnboardingForm userType="BUDDY" resubmission={loadState.application} />;
  }

  return (
    <main className="flex flex-1 items-center bg-white py-10">
      <PageContainer>
        <section
          aria-live="polite"
          className="mx-auto max-w-xl rounded-[28px] border border-line-soft bg-white px-6 py-10 text-center md:px-10"
        >
          {loadState.status === "loading" ? (
            <>
              <div className="mx-auto size-8 animate-spin rounded-full border-2 border-line-soft border-t-primary motion-reduce:animate-none" />
              <h1 className="mt-5 font-display text-xl font-bold text-ink">{t("loading")}</h1>
            </>
          ) : (
            <>
              <h1 className="font-display text-2xl font-extrabold text-ink">
                {loadState.sessionExpired ? t("sessionExpiredTitle") : t("loadFailedTitle")}
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                {loadState.sessionExpired
                  ? t("sessionExpiredDescription")
                  : t("loadFailedDescription")}
              </p>
              <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                {loadState.sessionExpired ? (
                  <Link
                    href="/buddy"
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-on-primary hover:bg-primary-hover"
                  >
                    {t("loginAgain")}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={retry}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-on-primary hover:bg-primary-hover"
                  >
                    {t("retry")}
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </PageContainer>
    </main>
  );
}
