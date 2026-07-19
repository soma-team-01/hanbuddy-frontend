import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { AUTH_COOKIES, decodeGoogleProfile } from "@/lib/auth/cookies";
import { OnboardingForm } from "./OnboardingForm";

const APP_ORIGIN = "https://hanbuddy-frontend.vercel.app";

interface OnboardingPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: OnboardingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Onboarding" });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    alternates: {
      canonical: `${APP_ORIGIN}/${locale}/onboarding`,
      languages: {
        en: `${APP_ORIGIN}/en/onboarding`,
        ko: `${APP_ORIGIN}/ko/onboarding`,
      },
    },
  };
}

export default async function ProfileSetupPage() {
  const cookieStore = await cookies();
  const googleProfile = decodeGoogleProfile(cookieStore.get(AUTH_COOKIES.googleProfile)?.value);

  return <OnboardingForm googleProfile={googleProfile} />;
}
