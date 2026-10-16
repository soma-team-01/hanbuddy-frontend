"use client";

import { useTranslations } from "next-intl";
import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { PageContainer } from "@/components/layout/PageContainer";
import { ClockIcon, XIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";

/** Shared result layout; an unknown payment outcome must not be labelled as failed. */
export function PaymentResultPanel({
  title,
  description,
  message,
  pending = false,
}: Readonly<{ title: string; description?: string; message?: string; pending?: boolean }>) {
  const t = useTranslations("Payment");
  const Icon = pending ? ClockIcon : XIcon;
  return (
    <PageContainer className="flex flex-1 items-center justify-center py-10 pb-44 md:py-16 lg:pb-16">
      <main
        data-testid={pending ? "payment-pending" : "payment-fail"}
        className="w-full max-w-2xl rounded-3xl border border-line-soft bg-canvas-soft p-6 text-center shadow-[0_18px_45px_rgba(61,45,43,0.1)] md:p-10"
      >
        <section className="flex flex-col items-center">
          <span
            className={`flex size-20 items-center justify-center rounded-full border-2 ${pending ? "border-warning/40 text-warning" : "border-danger/40 text-danger"}`}
          >
            <Icon className="size-10" aria-hidden />
          </span>
          <h1 className="mt-6 font-display text-3xl font-bold text-ink">{title}</h1>
          {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
          {message ? (
            <p
              role="alert"
              className={`mt-4 text-sm break-keep ${pending ? "text-muted" : "text-danger"}`}
            >
              {message}
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

export function PayPalRecoveryResult({
  message,
  declined = false,
}: Readonly<{ message: string; declined?: boolean }>) {
  const t = useTranslations("Payment");
  const authorization = useTranslations("PayPalAuthorization");
  return (
    <PaymentResultPanel
      title={declined ? t("failTitle") : authorization("checking")}
      message={message}
      pending={!declined}
    />
  );
}
