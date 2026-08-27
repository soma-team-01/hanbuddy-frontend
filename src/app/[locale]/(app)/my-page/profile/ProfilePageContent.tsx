"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ComponentType, ReactNode, SVGProps } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Avatar } from "@/components/ui/Avatar";
import {
  CalendarIcon,
  GlobeIcon,
  MailIcon,
  MessageCircleIcon,
  PencilIcon,
} from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import { getIntlLocale, type Locale } from "@/i18n/routing";
import { formatNationalityCode } from "@/lib/api/buddy-view";
import { useApiErrorMessage } from "@/lib/api/use-api-error-message";
import { useMyProfile } from "@/lib/api/useMyProfile";
import type { ContactMethod } from "@/lib/auth/types";
import type { MyProfile } from "@/types/user";

type DetailIcon = ComponentType<SVGProps<SVGSVGElement>>;

function formatBirthDate(birthDate: string, locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${birthDate}T00:00:00Z`));
}

function getContactMethodLabel(method: ContactMethod, phoneLabel: string) {
  const labels: Record<ContactMethod, string> = {
    WHATSAPP: "WhatsApp",
    LINE: "LINE",
    WECHAT: "WeChat",
    PHONE: phoneLabel,
  };
  return labels[method];
}

function formatContactValue(profile: MyProfile) {
  const includesCountryCode =
    profile.contactMethod === "WHATSAPP" || profile.contactMethod === "PHONE";
  return [includesCountryCode ? profile.contactCountryCode : null, profile.contactIdentifier]
    .filter(Boolean)
    .join(" ");
}

function ContactValue({
  profile,
  phoneLabel,
}: Readonly<{ profile: MyProfile; phoneLabel: string }>) {
  const methodLabel = getContactMethodLabel(profile.contactMethod, phoneLabel);
  const value = formatContactValue(profile);

  return (
    <span
      aria-label={`${methodLabel}: ${value}`}
      className="inline-flex max-w-full items-center justify-end gap-2.5"
    >
      <span className="shrink-0 text-xs font-bold tracking-[0.08em] text-primary uppercase sm:text-sm">
        {methodLabel}
      </span>
      <span
        aria-hidden
        data-testid="contact-method-divider"
        className="h-4 w-px shrink-0 bg-line-strong"
      />
      <span className="min-w-0 break-all text-ink">{value}</span>
    </span>
  );
}

function ProfileDetail({
  Icon,
  label,
  value,
}: Readonly<{
  Icon: DetailIcon;
  label: string;
  value: ReactNode;
}>) {
  return (
    <div className="flex items-start justify-between gap-5 border-t border-line-soft py-3.5 first:border-t-0 sm:py-4">
      <dt className="flex items-center gap-3 text-sm font-medium text-muted">
        <Icon aria-hidden className="size-[18px] shrink-0" />
        {label}
      </dt>
      <dd className="min-w-0 text-right text-sm font-semibold break-words text-ink sm:text-base">
        {value}
      </dd>
    </div>
  );
}

function ProfileView({ profile }: Readonly<{ profile: MyProfile }>) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Profile");
  const tMessaging = useTranslations("Messaging");

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title={t("viewTitle")} compact />

      <main className="flex flex-1 flex-col">
        <PageContainer className="flex flex-1 justify-center py-4 md:py-6">
          <section
            aria-label={t("summaryLabel")}
            className="relative w-full max-w-[520px] self-start overflow-hidden rounded-[2rem] border border-line-soft bg-white px-6 py-6 shadow-[0_20px_55px_rgba(38,27,24,0.08)] sm:px-8 sm:py-7"
          >
            <Link
              href="/my-page/edit"
              className="absolute top-5 right-5 inline-flex min-h-9 items-center gap-2 rounded-full border border-line-strong bg-white px-3.5 text-sm font-bold text-primary-strong shadow-[0_6px_18px_rgba(38,27,24,0.06)] transition-colors hover:border-primary hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <PencilIcon aria-hidden className="size-4" />
              {t("editAction")}
            </Link>

            <div className="flex justify-center pt-5 sm:pt-3">
              <Avatar
                name={profile.displayName}
                src={profile.profileImageUrl}
                size={120}
                eagerImage
                className="ring-1 ring-line-soft ring-offset-6 ring-offset-white"
              />
            </div>

            <div className="mt-7 min-w-0">
              <h2 className="truncate font-display text-2xl font-extrabold tracking-[-0.04em] text-ink sm:text-3xl">
                {profile.displayName}
              </h2>
              <p className="mt-2 flex items-center gap-2 text-sm break-all text-muted sm:text-base">
                <MailIcon aria-hidden className="size-4 shrink-0" />
                {profile.email}
              </p>
            </div>

            <div className="mt-5 border-t border-line-soft pt-1">
              <h3 className="sr-only">{t("viewDetails")}</h3>
              <p className="sr-only">{t("viewDetailsDescription")}</p>
              <dl>
                <ProfileDetail
                  Icon={GlobeIcon}
                  label={t("nationality")}
                  value={formatNationalityCode(profile.nationalityCode, locale)}
                />
                <ProfileDetail
                  Icon={CalendarIcon}
                  label={t("age")}
                  value={formatBirthDate(profile.birthDate, locale)}
                />
                <ProfileDetail
                  Icon={MessageCircleIcon}
                  label={t("contactDetails")}
                  value={<ContactValue profile={profile} phoneLabel={tMessaging("phoneNumber")} />}
                />
              </dl>
            </div>
          </section>
        </PageContainer>
      </main>
    </div>
  );
}

export function ProfilePageContent() {
  const t = useTranslations("Profile");
  const getApiErrorMessage = useApiErrorMessage();
  const result = useMyProfile();

  if (result?.status === "success") {
    return <ProfileView profile={result.profile} />;
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title={t("viewTitle")} compact />
      <PageContainer className="flex max-w-[900px] flex-1 flex-col py-4 md:py-6">
        {result?.status === "error" ? (
          <p role="alert" className="text-sm text-danger">
            {getApiErrorMessage(result.error, t("loadFailed"))}
          </p>
        ) : (
          <div aria-hidden className="space-y-6">
            <div className="flex items-center gap-6 border-b border-line-soft pb-10">
              <span className="size-28 animate-pulse rounded-full bg-line-soft" />
              <span className="h-8 w-40 animate-pulse rounded bg-line-soft" />
            </div>
            <span className="block h-40 animate-pulse rounded bg-line-soft" />
          </div>
        )}
      </PageContainer>
    </div>
  );
}
