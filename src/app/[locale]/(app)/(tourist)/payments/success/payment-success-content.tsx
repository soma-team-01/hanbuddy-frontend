"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { CheckCircleIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { formatSeoulDateTime } from "@/lib/datetime";
import { formatCurrency, formatKrw } from "@/lib/format";
import { myApplicationsQueryOptions } from "@/lib/query/applications";
import { useAuthQueryRedirect } from "@/lib/query/use-auth-query-redirect";

interface PaymentSuccessContentProps {
  applicationId: string;
}

function RecoveryState({ message }: Readonly<{ message: string }>) {
  const t = useTranslations("Payment");

  return (
    <>
      <main className="flex flex-1 flex-col items-center justify-center px-6 pb-32 text-center">
        <p role="alert" className="text-base text-ink-soft">
          {message}
        </p>
      </main>
      <BottomActionBar>
        <Link
          href="/applications"
          className="flex w-full items-center justify-center rounded-xl bg-forest px-5 py-3.5 text-sm font-semibold text-white"
        >
          {t("viewApplications")}
        </Link>
      </BottomActionBar>
    </>
  );
}

export function PaymentSuccessContent({ applicationId }: Readonly<PaymentSuccessContentProps>) {
  const locale = useLocale();
  const t = useTranslations("Payment");
  const tErrors = useTranslations("Errors");
  const getApiErrorMessage = useApiErrorMessage();
  const applicationsQuery = useQuery({
    ...myApplicationsQueryOptions(),
    enabled: applicationId.length > 0,
  });
  useAuthQueryRedirect(applicationsQuery.error);

  if (!applicationId) {
    return <RecoveryState message={t("confirmationNotFound")} />;
  }

  if (applicationsQuery.isPending) {
    return <p className="flex flex-1 items-center justify-center text-ink-soft">{t("loading")}</p>;
  }

  if (applicationsQuery.error) {
    return <RecoveryState message={getApiErrorMessage(applicationsQuery.error, t("loadError"))} />;
  }

  const application = applicationsQuery.data.find(
    (item) => String(item.applicationId) === applicationId,
  );
  if (!application) {
    return <RecoveryState message={t("confirmationNotFound")} />;
  }
  if (application.status !== "CONFIRMED" && application.status !== "COMPLETED") {
    return <RecoveryState message={t("notPaid")} />;
  }

  const scheduleLabel =
    formatSeoulDateTime(application.startAt, locale) ?? tErrors("dateTimeUnavailable");
  const paypalCharge =
    application.paymentAmount !== null &&
    application.paymentAmount !== undefined &&
    application.paymentCurrency
      ? formatCurrency(application.paymentAmount, application.paymentCurrency, locale)
      : "—";

  return (
    <>
      <main className="flex flex-1 flex-col px-6 pt-12 pb-44">
        <section className="flex flex-col items-center text-center">
          <span className="flex size-20 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircleIcon className="size-10" aria-hidden />
          </span>
          <h1 className="mt-6 font-display text-3xl font-semibold text-forest">{t("complete")}</h1>
          <p className="mt-2 text-sm text-ink-soft">{t("confirmed")}</p>
        </section>

        <section className="mt-10 rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
          <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
            {t("experience")}
          </p>
          <h2 className="mt-2 font-display text-xl font-semibold text-forest">
            {application.activityTitle}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">{scheduleLabel}</p>

          <div className="mt-5 divide-y divide-line border-y border-line">
            <div className="py-3 font-display text-base font-semibold text-ink">
              <p>
                {t("totalApplicationAmount", {
                  amount: formatKrw(application.totalPrice, locale),
                })}
              </p>
            </div>
            <div className="py-3 font-display text-lg font-semibold text-forest">
              <p>{t("paidWithPayPal", { amount: paypalCharge })}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-soft">{t("paypalUsdNotice")}</p>
        </section>
      </main>

      <BottomActionBar>
        <div className="flex w-full flex-col gap-2">
          <Link
            href="/applications"
            className="flex w-full items-center justify-center rounded-xl bg-forest px-5 py-3.5 text-sm font-semibold text-white"
          >
            {t("viewApplications")}
          </Link>
          <Link
            href="/explore"
            className="flex w-full items-center justify-center rounded-xl border border-forest px-5 py-3 text-sm font-semibold text-forest"
          >
            {t("exploreMore")}
          </Link>
        </div>
      </BottomActionBar>
    </>
  );
}
