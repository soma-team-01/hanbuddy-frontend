"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AuthStatus } from "@/lib/auth/types";
import { CircleHelpIcon, ClockIcon, MailIcon, UserMinusIcon } from "@/components/ui/icons";

const CONTACT_EMAIL = "zeroone.soma@gmail.com";

type InactiveAuthStatus = Extract<AuthStatus, "PENDING_APPROVAL" | "REJECTED" | "SUSPENDED">;

interface AccountStatusContentProps {
  status: InactiveAuthStatus;
  reason?: string;
}

export function AccountStatusContent({ status, reason }: Readonly<AccountStatusContentProps>) {
  const t = useTranslations("AccountStatus");
  const copy = getStatusCopy(status, t);

  return (
    <main className="flex flex-1 items-center justify-center bg-white px-4 py-12 md:px-6 md:py-16">
      <section className="w-full max-w-[720px] overflow-hidden rounded-[32px] border border-line-soft bg-white shadow-[0_24px_70px_rgba(38,27,24,0.08)]">
        <div className="h-1.5 bg-primary" />
        <div className="flex flex-col items-center px-6 py-10 text-center sm:px-10 md:px-14 md:py-14">
          <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary">
            <AccountStatusIcon status={status} />
          </div>
          <p className="mb-3 text-xs font-bold tracking-[0.24em] text-primary uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="max-w-[580px] font-display text-3xl font-extrabold tracking-[-0.04em] text-ink md:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-[570px] text-base leading-7 text-muted md:text-lg">
            {copy.description}
          </p>

          {reason ? (
            <div className="mt-7 w-full rounded-2xl border border-line-soft bg-panel-raised p-5 text-left">
              <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
                {t("reasonLabel")}
              </p>
              <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-ink md:text-base">
                {reason}
              </p>
            </div>
          ) : null}

          {copy.note ? (
            <p className="mt-6 rounded-full bg-primary-soft px-5 py-2.5 text-sm font-semibold text-primary-strong">
              {copy.note}
            </p>
          ) : null}

          <p className="mt-7 text-sm leading-6 text-muted md:text-base">{t("contactHelp")}</p>
          <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover sm:max-w-[260px]"
            >
              <MailIcon className="size-5" />
              {t("emailUs")}
            </a>
            <Link
              href="/buddy"
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-line-strong bg-white px-6 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary-strong sm:max-w-[260px]"
            >
              {t("backToBuddy")}
            </Link>
          </div>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="mt-5 text-sm font-semibold text-primary underline underline-offset-4"
          >
            {CONTACT_EMAIL}
          </a>
        </div>
      </section>
    </main>
  );
}

function AccountStatusIcon({ status }: Readonly<{ status: InactiveAuthStatus }>) {
  if (status === "PENDING_APPROVAL") return <ClockIcon className="size-7" />;
  if (status === "REJECTED") return <CircleHelpIcon className="size-7" />;
  return <UserMinusIcon className="size-7" />;
}

function getStatusCopy(status: InactiveAuthStatus, t: ReturnType<typeof useTranslations>) {
  if (status === "PENDING_APPROVAL") {
    return {
      title: t("pending.title"),
      description: t("pending.description"),
      note: t("pending.reviewTime"),
    };
  }
  if (status === "REJECTED") {
    return {
      title: t("rejected.title"),
      description: t("rejected.description"),
      note: null,
    };
  }
  return {
    title: t("suspended.title"),
    description: t("suspended.description"),
    note: null,
  };
}
