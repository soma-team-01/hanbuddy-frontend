import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { OnboardingForm } from "@/app/[locale]/(app)/onboarding/OnboardingForm";
import type { Locale } from "@/i18n/routing";
import { AUTH_COOKIES, decodeGoogleProfile } from "@/lib/auth/cookies";
import { getSignupAgreementDocuments } from "@/lib/server/policy-content";
import { getSignupDraftAccountId } from "@/lib/server/signup-draft-account";

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
        ja: `${APP_ORIGIN}/ja/buddy/onboarding`,
        "zh-Hans": `${APP_ORIGIN}/zh-Hans/buddy/onboarding`,
        "zh-Hant": `${APP_ORIGIN}/zh-Hant/buddy/onboarding`,
      },
    },
  };
}

export default async function BuddyOnboardingPage({ params }: BuddyOnboardingPageProps) {
  const { locale } = await params;
  const [cookieStore, agreementDocuments] = await Promise.all([
    cookies(),
    getSignupAgreementDocuments("BUDDY", locale),
  ]);
  const googleProfile = decodeGoogleProfile(cookieStore.get(AUTH_COOKIES.googleProfile)?.value);
  const signupDraftAccountId = getSignupDraftAccountId(
    cookieStore.get(AUTH_COOKIES.signupToken)?.value,
  );

  return (
    <OnboardingForm
      userType="BUDDY"
      googleProfile={googleProfile}
      signupDraftAccountId={signupDraftAccountId}
      agreementDocuments={agreementDocuments}
    />
  );
}
