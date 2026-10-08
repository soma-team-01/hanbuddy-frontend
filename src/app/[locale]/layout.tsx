import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { readAnalyticsPolicy } from "@/lib/analytics/policy";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Caveat, DM_Sans, Noto_Sans_KR, Plus_Jakarta_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import { QueryProvider } from "../query-provider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { RouteShell } from "@/components/layout/RouteShell";
import { SERVICE_TIME_ZONE } from "@/i18n/formats";
import { isLocale, routing, type Locale } from "@/i18n/routing";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { parseUserType } from "@/lib/auth/routes";
import "../globals.css";
import { koreanFontRootProps } from "@/lib/fonts/korean-font";
import { sharePreview } from "@/lib/seo/metadata";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  weight: ["600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

// 한글 글꼴은 미리 받지 않는다. 라틴 글자는 앞 순서의 DM Sans·Plus Jakarta Sans가 그리므로, 미리 받던
// 라틴 부분 파일은 어느 언어에서도 쓰이지 않았다. 한국어 페이지에서만 글꼴 변수를 연결하고(koreanFontRootProps),
// 화면에 있는 한글 글자 묶음만 받는다.
const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-noto-sans-kr",
  // 가변 글꼴 하나로 400~700을 모두 그린다. 굵기별 정적 글꼴 4벌은 한글 글자 묶음(약 124개)마다
  // @font-face가 4개씩 생겨 렌더링을 막는 CSS가 105KB(gzip)였다. 가변 글꼴은 묶음마다 1개다.
  weight: "variable",
  preload: false,
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  weight: ["400", "500", "600", "700"],
});

// iOS 세이프에어리어(env(safe-area-inset-*))와 키보드 대응 레이아웃을 켠다. 확대는 막지 않는다(접근성).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });

  // 페이지가 공유 정보를 따로 정하지 않아도 링크 미리보기에 대표 사진이 나오게 한다.
  // 기본값을 물려받는 페이지(로그인·정책 등)가 메인의 제목·설명·주소를 자기 것으로 내보내지 않도록
  // 사진과 사이트 정보만 남긴다. 제목과 설명은 각 페이지의 <title>과 description을 따른다.
  const preview = sharePreview({
    locale,
    path: "",
    title: t("metadataTitle"),
    description: t("metadataDescription"),
  });

  return {
    title: "HanBuddy",
    description: t("metadataDescription"),
    openGraph: { ...preview.openGraph, url: undefined, title: undefined, description: undefined },
    twitter: { ...preview.twitter, title: undefined, description: undefined },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  policy,
  params,
}: Readonly<{
  children: React.ReactNode;
  policy: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const [messages, cookieStore] = await Promise.all([getMessages(), cookies()]);
  const userType = parseUserType(cookieStore.get(AUTH_COOKIES.userType)?.value);
  const accessToken = cookieStore.get(AUTH_COOKIES.accessToken)?.value;
  const authenticated = Boolean(userType && accessToken);
  const mayHaveSession =
    Boolean(accessToken) || Boolean(cookieStore.get(AUTH_COOKIES.refreshToken)?.value);
  let role: "buddy" | "tourist" | null = null;
  if (authenticated && userType === "BUDDY") {
    role = "buddy";
  } else if (authenticated && userType === "TOURIST") {
    role = "tourist";
  }

  const koreanFont = koreanFontRootProps(locale, notoSansKr.variable);

  return (
    <html
      lang={locale}
      className={`${plusJakartaSans.variable} ${dmSans.variable} ${koreanFont.className} ${caveat.variable} h-full antialiased`}
      style={koreanFont.style}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone={SERVICE_TIME_ZONE}>
          <QueryProvider>
            <AnalyticsProvider
              policy={readAnalyticsPolicy({
                GA4_ORIGIN: process.env.GA4_ORIGIN,
                GA_ENABLED: process.env.GA_ENABLED,
                GA_MEASUREMENT_ID: process.env.GA_MEASUREMENT_ID,
                META_PIXEL_ENABLED: process.env.META_PIXEL_ENABLED,
                META_PIXEL_ID: process.env.META_PIXEL_ID,
              })}
            >
              <RouteShell
                sessionRole={role}
                header={
                  <SiteHeader
                    role={role}
                    authenticated={authenticated}
                    mayHaveSession={mayHaveSession}
                  />
                }
                footer={<SiteFooter locale={locale} role={role} />}
              >
                {children}
              </RouteShell>
              {policy}
            </AnalyticsProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
