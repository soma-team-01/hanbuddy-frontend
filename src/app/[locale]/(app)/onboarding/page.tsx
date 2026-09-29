import { APP_ORIGIN } from "@/lib/site";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { AUTH_COOKIES, decodeGoogleProfile } from "@/lib/auth/cookies";
import { sanitizeReturnToPath } from "@/lib/auth/return-to";
import { getSignupAgreementDocuments } from "@/lib/server/policy-content";
import { getSignupDraftAccountId } from "@/lib/server/signup-draft-account";
import { OnboardingForm } from "./OnboardingForm";

interface OnboardingPageProps {
  params: Promise<{ locale: Locale }>;
  searchParams?: Promise<{ next?: string | string[] }>;
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
        ja: `${APP_ORIGIN}/ja/onboarding`,
        "zh-Hans": `${APP_ORIGIN}/zh-Hans/onboarding`,
        "zh-Hant": `${APP_ORIGIN}/zh-Hant/onboarding`,
      },
    },
  };
}

export default async function ProfileSetupPage({
  params,
  searchParams,
}: Readonly<OnboardingPageProps>) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const [cookieStore, agreementDocuments] = await Promise.all([
    cookies(),
    getSignupAgreementDocuments("TOURIST", locale),
  ]);
  // 예약 화면 → 로그인 → 온보딩으로 온 신규 관광객이 가입 후 돌아갈 경로 (검증된 내부 경로만)
  const nextValue = Array.isArray(query?.next) ? query.next[0] : query?.next;
  const returnTo = sanitizeReturnToPath(nextValue);
  const googleProfile = decodeGoogleProfile(cookieStore.get(AUTH_COOKIES.googleProfile)?.value);
  const signupDraftAccountId = getSignupDraftAccountId(
    cookieStore.get(AUTH_COOKIES.signupToken)?.value,
  );

  return (
    <OnboardingForm
      userType="TOURIST"
      googleProfile={googleProfile}
      signupDraftAccountId={signupDraftAccountId}
      agreementDocuments={agreementDocuments}
      returnTo={returnTo}
    />
  );
}
