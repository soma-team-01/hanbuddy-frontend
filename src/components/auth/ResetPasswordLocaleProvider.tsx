"use client";

import { useEffect, useState, type ReactNode } from "react";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { QueryProvider } from "@/app/query-provider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SERVICE_TIME_ZONE } from "@/i18n/formats";
import type { Locale } from "@/i18n/routing";

export function ResetPasswordLocaleProvider({
  initialLocale,
  messagesByLocale,
  children,
}: Readonly<{
  initialLocale: Locale;
  messagesByLocale: Record<Locale, AbstractIntlMessages>;
  children: ReactNode;
}>) {
  const [locale, setLocale] = useState(initialLocale);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.classList.toggle("font-noto-sans-kr", locale === "ko");
    if (locale === "ko") root.style.removeProperty("--font-noto-sans-kr");
    else root.style.setProperty("--font-noto-sans-kr", "system-ui");
  }, [locale]);

  // Do not navigate or key the provider by locale: the reset token and form stay in memory.
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messagesByLocale[locale]}
      timeZone={SERVICE_TIME_ZONE}
    >
      <QueryProvider>
        <SiteHeader authenticated={false} mayHaveSession={false} onLocaleChange={setLocale} />
        {children}
      </QueryProvider>
    </NextIntlClientProvider>
  );
}
