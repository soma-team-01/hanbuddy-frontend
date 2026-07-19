import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ComponentProps, ReactElement, ReactNode } from "react";
import type { NextIntlClientProvider } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { createQueryClient } from "@/lib/query/client";
import { IntlTestProvider } from "@/test/render-with-intl";

interface QueryRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
  locale?: Locale;
  messages?: ComponentProps<typeof NextIntlClientProvider>["messages"];
}

export function renderWithQueryClient(ui: ReactElement, options: QueryRenderOptions = {}) {
  const { queryClient: providedQueryClient, locale = "en", messages, ...renderOptions } = options;
  const queryClient = providedQueryClient ?? createQueryClient();

  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <QueryClientProvider client={queryClient}>
        <IntlTestProvider locale={locale} messages={messages}>
          {children}
        </IntlTestProvider>
      </QueryClientProvider>
    );
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
