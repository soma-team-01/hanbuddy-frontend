import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { AccountStatusContent } from "@/components/auth/AccountStatusContent";
import { localizePathname } from "@/i18n/pathname";
import type { Locale } from "@/i18n/routing";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import type { AuthStatus } from "@/lib/auth/types";

interface AccountStatusPageProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ status?: string | string[] }>;
}

type InactiveAuthStatus = Extract<AuthStatus, "PENDING_APPROVAL" | "REJECTED" | "SUSPENDED">;

export async function generateMetadata({ params }: AccountStatusPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AccountStatus" });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
  };
}

export default async function AccountStatusPage({ params, searchParams }: AccountStatusPageProps) {
  const [{ locale }, query, cookieStore] = await Promise.all([params, searchParams, cookies()]);
  const status = parseInactiveAuthStatus(query.status);

  if (!status) {
    redirect(localizePathname("/login", locale));
  }

  const reason = cookieStore.get(AUTH_COOKIES.statusReason)?.value;
  const canResubmit = Boolean(cookieStore.get(AUTH_COOKIES.resubmissionToken)?.value);
  return (
    <AccountStatusContent
      status={status}
      reason={reason}
      userType="BUDDY"
      canResubmit={status === "REJECTED" && canResubmit}
    />
  );
}

function parseInactiveAuthStatus(value?: string | string[]): InactiveAuthStatus | null {
  const status = Array.isArray(value) ? value[0] : value;
  if (status === "PENDING_APPROVAL" || status === "REJECTED" || status === "SUSPENDED") {
    return status;
  }
  return null;
}
