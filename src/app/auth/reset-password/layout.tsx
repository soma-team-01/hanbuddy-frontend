import type { Metadata } from "next";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { getLocaleOrDefault } from "@/i18n/routing";
import { koreanFontRootProps } from "@/lib/fonts/korean-font";
import { SERVICE_TIME_ZONE } from "@/i18n/formats";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { QueryProvider } from "@/app/query-provider";
import { dmSans, plusJakartaSans } from "@/styles/fonts";
import "../../globals.css";

export const metadata: Metadata = {
  title: "Reset password | HanBuddy",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** Separate document root: never mount AnalyticsProvider around fragment credentials. */
export default async function ResetLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocaleOrDefault((await headers()).get("x-reset-locale"));
  const koreanFont = koreanFontRootProps(locale, "font-noto-sans-kr");
  const messages = await getMessages({ locale });
  return (
    <html
      lang={locale}
      className={`${dmSans.variable} ${plusJakartaSans.variable} ${koreanFont.className} antialiased`}
      style={koreanFont.style}
    >
      <body className="min-h-screen bg-canvas-soft text-ink">
        <NextIntlClientProvider locale={locale} messages={messages} timeZone={SERVICE_TIME_ZONE}>
          <QueryProvider>
            <SiteHeader authenticated={false} mayHaveSession={false} />
            {children}
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
