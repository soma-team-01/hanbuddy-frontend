import { APP_ORIGIN } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { ProfilePageContent } from "./ProfilePageContent";
import { getSignupAgreementDocuments } from "@/lib/server/policy-content";

interface ProfilePageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Profile" });

  return {
    title: t("viewMetadataTitle"),
    description: t("viewMetadataDescription"),
    alternates: {
      canonical: `${APP_ORIGIN}/${locale}/my-page/profile`,
      languages: {
        en: `${APP_ORIGIN}/en/my-page/profile`,
        ko: `${APP_ORIGIN}/ko/my-page/profile`,
        ja: `${APP_ORIGIN}/ja/my-page/profile`,
        "zh-Hans": `${APP_ORIGIN}/zh-Hans/my-page/profile`,
        "zh-Hant": `${APP_ORIGIN}/zh-Hant/my-page/profile`,
      },
    },
  };
}

export default async function ProfilePage({ params }: Readonly<ProfilePageProps>) {
  const { locale } = await params;
  // Public documents only; the authenticated API determines which rows and role to display.
  const documents = await getSignupAgreementDocuments("BUDDY", locale);
  return <ProfilePageContent documents={documents} />;
}
