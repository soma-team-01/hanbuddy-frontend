import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { OnboardingForm } from "@/app/[locale]/(app)/onboarding/OnboardingForm";
import type { Locale } from "@/i18n/routing";
import { AUTH_COOKIES, decodeGoogleProfile } from "@/lib/auth/cookies";

const APP_ORIGIN = "https://hanbuddy-frontend.vercel.app";

interface BuddyOnboardingPageProps {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: BuddyOnboardingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BuddyOnboarding" });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    alternates: {
      canonical: `${APP_ORIGIN}/${locale}/buddy/onboarding`,
      languages: {
        en: `${APP_ORIGIN}/en/buddy/onboarding`,
        ko: `${APP_ORIGIN}/ko/buddy/onboarding`,
      },
    },
  };
}

export default async function BuddyOnboardingPage() {
  const cookieStore = await cookies();
  const googleProfile = decodeGoogleProfile(cookieStore.get(AUTH_COOKIES.googleProfile)?.value);

  return <OnboardingForm userType="BUDDY" googleProfile={googleProfile} />;
}
