"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ComponentType, SVGProps } from "react";
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

function formatContact(profile: MyProfile, phoneLabel: string) {
  const includesCountryCode =
    profile.contactMethod === "WHATSAPP" || profile.contactMethod === "PHONE";
  const value = [includesCountryCode ? profile.contactCountryCode : null, profile.contactIdentifier]
    .filter(Boolean)
    .join(" ");

  return `${getContactMethodLabel(profile.contactMethod, phoneLabel)} · ${value}`;
}

function ProfileDetail({
  Icon,
  label,
  value,
  withBorder = false,
}: Readonly<{
  Icon: DetailIcon;
  label: string;
  value: string;
  withBorder?: boolean;
}>) {
  return (
    <div
      className={`grid gap-2 py-5 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)] sm:items-center sm:gap-8 ${
        withBorder ? "border-t border-line-soft" : ""
      }`}
    >
      <dt className="flex items-center gap-3 text-sm font-medium text-muted">
        <Icon aria-hidden className="size-[18px] shrink-0" />
        {label}
      </dt>
      <dd className="text-base font-semibold break-words text-ink sm:text-right">{value}</dd>
    </div>
  );
}

function ProfileView({ profile }: Readonly<{ profile: MyProfile }>) {
  const locale = useLocale() as Locale;
  const t = useTranslations("Profile");
  const tMyPage = useTranslations("MyPage");
  const tMessaging = useTranslations("Messaging");

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={t("viewTitle")}
        backHref="/my-page"
        action={
          <Link
            href="/my-page/edit"
            aria-label={tMyPage("editProfile")}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <PencilIcon aria-hidden className="size-4" />
            <span aria-hidden className="sm:hidden">
              {t("editAction")}
            </span>
            <span aria-hidden className="hidden sm:inline">
              {tMyPage("editProfile")}
            </span>
          </Link>
        }
      />

      <main className="flex flex-1 flex-col">
        <PageContainer className="max-w-[900px] flex-1 py-8 md:py-12">
          <section className="flex flex-col gap-6 border-b border-line-strong pb-10 sm:flex-row sm:items-center md:gap-8">
            <Avatar
              name={profile.displayName}
              src={profile.profileImageUrl}
              size={112}
              eagerImage
              className="ring-4 ring-white"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-[0.16em] text-primary-strong uppercase">
                {tMyPage(profile.userType === "BUDDY" ? "buddy" : "tourist")}
              </p>
              <h2 className="mt-2 truncate font-display text-3xl font-extrabold tracking-[-0.04em] text-ink md:text-4xl">
                {profile.displayName}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">{t("viewDescription")}</p>
            </div>
          </section>

          <section aria-labelledby="profile-details-title" className="pt-10">
            <div>
              <h3
                id="profile-details-title"
                className="font-display text-xl font-bold tracking-tight text-ink"
              >
                {t("viewDetails")}
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted">{t("viewDetailsDescription")}</p>
            </div>

            <dl className="mt-6 border-y border-line-soft">
              <ProfileDetail Icon={MailIcon} label={t("email")} value={profile.email} />
              <ProfileDetail
                Icon={GlobeIcon}
                label={t("nationality")}
                value={formatNationalityCode(profile.nationalityCode, locale)}
                withBorder
              />
              <ProfileDetail
                Icon={CalendarIcon}
                label={t("age")}
                value={formatBirthDate(profile.birthDate, locale)}
                withBorder
              />
              <ProfileDetail
                Icon={MessageCircleIcon}
                label={t("contactDetails")}
                value={formatContact(profile, tMessaging("phoneNumber"))}
                withBorder
              />
            </dl>
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
      <PageHeader title={t("viewTitle")} backHref="/my-page" />
      <PageContainer className="flex max-w-[900px] flex-1 flex-col py-8 md:py-12">
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
