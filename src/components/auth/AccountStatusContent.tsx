"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AuthStatus } from "@/lib/auth/types";
import { ArrowLeftIcon, CircleHelpIcon, ClockIcon, UserMinusIcon } from "@/components/ui/icons";

const CONTACT_EMAIL = "contact@hanbuddy.kr";

type InactiveAuthStatus = Extract<AuthStatus, "PENDING_APPROVAL" | "REJECTED" | "SUSPENDED">;

interface AccountStatusContentProps {
  status: InactiveAuthStatus;
  reason?: string;
  userType: "TOURIST" | "BUDDY";
  canResubmit?: boolean;
}

export function AccountStatusContent({
  status,
  reason,
  userType,
  canResubmit = false,
}: Readonly<AccountStatusContentProps>) {
  const t = useTranslations("AccountStatus");
  const copy = getStatusCopy(status, userType, t);
  const isBuddy = userType === "BUDDY";

  return (
    <main className="flex flex-1 items-center justify-center bg-white px-4 py-8 md:px-6 md:py-10">
      <div className="w-full max-w-[680px]">
        <Link
          href={isBuddy ? "/buddy" : "/"}
          aria-label={t(isBuddy ? "backToBuddy" : "backToHome")}
          className="mb-4 inline-flex size-10 items-center justify-center rounded-full border border-line-soft bg-white text-ink transition-colors hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <ArrowLeftIcon className="size-5" />
        </Link>

        <section className="overflow-hidden rounded-[28px] border border-line-soft bg-white shadow-[0_20px_56px_rgba(38,27,24,0.07)]">
          <div className="h-1 bg-primary" />
          <div className="flex flex-col items-center px-6 py-8 text-center sm:px-9 md:px-10 md:py-10">
            <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
              <AccountStatusIcon status={status} />
            </div>
            <h1 className="max-w-[540px] font-display text-2xl leading-tight font-extrabold tracking-[-0.04em] text-ink md:text-[30px]">
              {copy.title}
            </h1>
            {copy.description ? (
              <p className="mt-3 max-w-[540px] text-sm leading-6 text-muted md:text-base">
                {copy.description}
              </p>
            ) : null}

            {reason ? (
              <div className="mt-5 w-full rounded-2xl border border-line-soft bg-panel-raised p-4 text-left">
                <p className="text-[11px] font-bold tracking-[0.14em] text-primary uppercase">
                  {t("reasonLabel")}
                </p>
                <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-ink">{reason}</p>
              </div>
            ) : null}

            {copy.note ? (
              <p className="mt-5 rounded-full bg-primary-soft px-4 py-2 text-sm font-semibold text-primary-strong">
                {copy.note}
              </p>
            ) : null}

            {status === "REJECTED" && canResubmit ? (
              <Link
                href="/buddy/resubmission"
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-6 font-display text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
              >
                {t("rejected.resubmit")}
              </Link>
            ) : null}

            <p
              className={`${status === "REJECTED" && canResubmit ? "mt-4" : "mt-6"} max-w-[540px] text-sm leading-6 text-muted`}
            >
              {t.rich("contactHelp", {
                email: (chunks) => (
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="font-semibold text-primary underline underline-offset-4"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function AccountStatusIcon({ status }: Readonly<{ status: InactiveAuthStatus }>) {
  if (status === "PENDING_APPROVAL") return <ClockIcon className="size-7" />;
  if (status === "REJECTED") return <CircleHelpIcon className="size-7" />;
  return <UserMinusIcon className="size-7" />;
}

function getStatusCopy(
  status: InactiveAuthStatus,
  userType: "TOURIST" | "BUDDY",
  t: ReturnType<typeof useTranslations>,
) {
  if (status === "PENDING_APPROVAL") {
    return {
      title: t("pending.title"),
      description: null,
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
    title: t(userType === "BUDDY" ? "suspended.title" : "suspended.touristTitle"),
    description: t(userType === "BUDDY" ? "suspended.description" : "suspended.touristDescription"),
    note: null,
  };
}
