import type { Metadata } from "next";
import { headers } from "next/headers";
import type { AbstractIntlMessages } from "next-intl";
import { getMessages } from "next-intl/server";
import { getLocaleOrDefault, LOCALES, type Locale } from "@/i18n/routing";
import { koreanFontRootProps } from "@/lib/fonts/korean-font";
import { ResetPasswordLocaleProvider } from "@/components/auth/ResetPasswordLocaleProvider";
import { dmSans, plusJakartaSans } from "@/styles/fonts";
import "../../globals.css";

export const metadata: Metadata = {
  title: "Reset password | HanBuddy",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** Separate document root: never mount AnalyticsProvider around fragment credentials. */
export default async function ResetLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = getLocaleOrDefault((await headers()).get("x-reset-locale"));
  const koreanFont = koreanFontRootProps(locale, "font-noto-sans-kr");
  const messagesByLocale = Object.fromEntries(
    await Promise.all(
      LOCALES.map(async (language) => {
        const messages = await getMessages({ locale: language });
        return [language, { EmailAuth: messages.EmailAuth, Navigation: messages.Navigation }];
      }),
    ),
  ) as Record<Locale, AbstractIntlMessages>;
  return (
    <html
      lang={locale}
      className={`${dmSans.variable} ${plusJakartaSans.variable} ${koreanFont.className} antialiased`}
      style={koreanFont.style}
    >
      <body className="min-h-screen bg-canvas-soft text-ink">
        <ResetPasswordLocaleProvider initialLocale={locale} messagesByLocale={messagesByLocale}>
          {children}
        </ResetPasswordLocaleProvider>
      </body>
    </html>
  );
}
