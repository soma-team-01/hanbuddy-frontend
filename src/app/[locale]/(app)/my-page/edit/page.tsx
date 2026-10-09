import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { EditProfilePageContent } from "./EditProfileForm";
import { pageAlternates } from "@/lib/seo/metadata";

interface EditProfilePageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: EditProfilePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Profile" });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    alternates: pageAlternates(locale, "/my-page/edit"),
  };
}

export default function EditProfilePage() {
  return <EditProfilePageContent />;
}
