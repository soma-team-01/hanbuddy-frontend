import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { EditProfilePageContent } from "./EditProfileForm";

const APP_ORIGIN = "https://hanbuddy-frontend.vercel.app";

interface EditProfilePageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: EditProfilePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Profile" });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    alternates: {
      canonical: `${APP_ORIGIN}/${locale}/my-page/edit`,
      languages: {
        en: `${APP_ORIGIN}/en/my-page/edit`,
        ko: `${APP_ORIGIN}/ko/my-page/edit`,
        ja: `${APP_ORIGIN}/ja/my-page/edit`,
        "zh-Hans": `${APP_ORIGIN}/zh-Hans/my-page/edit`,
        "zh-Hant": `${APP_ORIGIN}/zh-Hant/my-page/edit`,
      },
    },
  };
}

export default function EditProfilePage() {
  return <EditProfilePageContent />;
}
