import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { ProfilePageContent } from "./ProfilePageContent";
import { getSignupAgreementDocuments } from "@/lib/server/policy-content";
import { pageAlternates } from "@/lib/seo/metadata";

interface ProfilePageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Profile" });

  return {
    title: t("viewMetadataTitle"),
    description: t("viewMetadataDescription"),
    alternates: pageAlternates(locale, "/my-page/profile"),
  };
}

export default async function ProfilePage({ params }: Readonly<ProfilePageProps>) {
  const { locale } = await params;
  // Public documents only; the authenticated API determines which rows and role to display.
  const documents = await getSignupAgreementDocuments("BUDDY", locale);
  return <ProfilePageContent documents={documents} />;
}
