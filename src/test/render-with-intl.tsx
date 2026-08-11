import { render, type RenderOptions } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { SERVICE_TIME_ZONE } from "@/i18n/formats";
import type { Locale } from "@/i18n/routing";
import en from "@/messages/en.json";
import ko from "@/messages/ko.json";

type IntlMessages = ComponentProps<typeof NextIntlClientProvider>["messages"];

export interface IntlRenderOptions extends Omit<RenderOptions, "wrapper"> {
  locale?: Locale;
  messages?: IntlMessages;
}

interface IntlTestProviderProps {
  children: ReactNode;
  locale?: Locale;
  messages?: IntlMessages;
}

export function IntlTestProvider({
  children,
  locale = "en",
  messages,
}: Readonly<IntlTestProviderProps>) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages ?? (locale === "ko" ? ko : en)}
      timeZone={SERVICE_TIME_ZONE}
    >
      {children}
    </NextIntlClientProvider>
  );
}

export function renderWithIntl(ui: ReactElement, options: IntlRenderOptions = {}) {
  const { locale = "en", messages, ...renderOptions } = options;
  return render(ui, {
    wrapper: ({ children }) => (
      <IntlTestProvider locale={locale} messages={messages}>
        {children}
      </IntlTestProvider>
    ),
    ...renderOptions,
  });
}
