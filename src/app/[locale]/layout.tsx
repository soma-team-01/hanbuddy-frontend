import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { DM_Sans, Noto_Sans_KR, Plus_Jakarta_Sans } from "next/font/google";
import { notFound } from "next/navigation";
import { QueryProvider } from "../query-provider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SERVICE_TIME_ZONE } from "@/i18n/formats";
import { isLocale, routing, type Locale } from "@/i18n/routing";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { parseUserType } from "@/lib/auth/routes";
import "../globals.css";

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

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-noto-sans-kr",
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });

  return {
    title: "HanBuddy",
    description: t("metadataDescription"),
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const [messages, cookieStore] = await Promise.all([getMessages(), cookies()]);
  const userType = parseUserType(cookieStore.get(AUTH_COOKIES.userType)?.value);
  const authenticated = Boolean(userType && cookieStore.get(AUTH_COOKIES.accessToken)?.value);
  const role = userType === "BUDDY" ? "buddy" : userType === "TOURIST" ? "tourist" : null;

  return (
    <html
      lang={locale}
      className={`${plusJakartaSans.variable} ${dmSans.variable} ${notoSansKr.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone={SERVICE_TIME_ZONE}>
          <QueryProvider>
            <SiteHeader role={role} authenticated={authenticated} />
            <div className="flex flex-1 flex-col">{children}</div>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
