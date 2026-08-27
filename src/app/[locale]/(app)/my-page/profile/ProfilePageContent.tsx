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
}: Readonly<{
  Icon: DetailIcon;
  label: string;
  value: string;
}>) {
  return (
    <div className="flex items-start justify-between gap-5 border-t border-line-soft py-5 first:border-t-0">
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
  const tMyPage = useTranslations("MyPage");
  const tMessaging = useTranslations("Messaging");

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title={t("viewTitle")} backHref="/my-page" />

      <main className="flex flex-1 flex-col">
        <PageContainer className="flex flex-1 justify-center py-8 md:py-12">
          <section
            aria-label={t("summaryLabel")}
            className="relative w-full max-w-[560px] self-start overflow-hidden rounded-[2rem] border border-line-soft bg-white px-6 py-8 shadow-[0_24px_70px_rgba(38,27,24,0.09)] sm:px-10 sm:py-10 md:rounded-[2.5rem]"
          >
            <span className="absolute top-6 right-6 inline-flex items-center rounded-full border border-line-soft px-3 py-1.5 text-xs font-bold tracking-[0.12em] text-primary-strong uppercase">
              {tMyPage(profile.userType === "BUDDY" ? "buddy" : "tourist")}
            </span>

            <div className="flex justify-center pt-8 sm:pt-6">
              <Avatar
                name={profile.displayName}
                src={profile.profileImageUrl}
                size={160}
                eagerImage
                className="ring-1 ring-line-soft ring-offset-8 ring-offset-white"
              />
            </div>

            <div className="mt-10 min-w-0">
              <h2 className="truncate font-display text-3xl font-extrabold tracking-[-0.04em] text-ink sm:text-4xl">
                {profile.displayName}
              </h2>
              <p className="mt-2 flex items-center gap-2 text-sm break-all text-muted sm:text-base">
                <MailIcon aria-hidden className="size-4 shrink-0" />
                {profile.email}
              </p>
              <p className="mt-3 text-sm leading-6 text-muted">{t("viewDescription")}</p>
              <Link
                href="/my-page/edit"
                className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary-strong underline decoration-primary/35 underline-offset-4 transition-colors hover:text-primary focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              >
                <PencilIcon aria-hidden className="size-4" />
                {tMyPage("editProfile")}
              </Link>
            </div>

            <div className="mt-8 border-t border-line-soft pt-2">
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
                  value={formatContact(profile, tMessaging("phoneNumber"))}
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
