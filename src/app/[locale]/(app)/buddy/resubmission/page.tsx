import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { BuddyResubmissionContent } from "./buddy-resubmission-content";

interface BuddyResubmissionPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: BuddyResubmissionPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BuddyResubmission" });
  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
  };
}

export default function BuddyResubmissionPage() {
  return <BuddyResubmissionContent />;
}
