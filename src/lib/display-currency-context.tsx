"use client";

import { useLocale } from "next-intl";
import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import { getLocaleOrDefault } from "@/i18n/routing";
import {
  DISPLAY_CURRENCY_STORAGE_KEY,
  getDefaultDisplayCurrency,
  isDisplayCurrency,
} from "@/lib/display-currency";
import type { DisplayCurrency } from "@/types/display-currency";

interface DisplayCurrencyContextValue {
  displayCurrency: DisplayCurrency;
  selectDisplayCurrency: (currency: DisplayCurrency) => void;
}

const DisplayCurrencyContext = createContext<DisplayCurrencyContextValue | null>(null);
const DISPLAY_CURRENCY_CHANGE_EVENT = "hanbuddy:display-currency-change";

function subscribeToDisplayCurrency(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(DISPLAY_CURRENCY_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(DISPLAY_CURRENCY_CHANGE_EVENT, onStoreChange);
  };
}

export function DisplayCurrencyProvider({ children }: Readonly<{ children: ReactNode }>) {
  const locale = getLocaleOrDefault(useLocale());
  const localeDefault = getDefaultDisplayCurrency(locale);
  const displayCurrency = useSyncExternalStore(
    subscribeToDisplayCurrency,
    () => {
      const storedCurrency = window.localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY);
      return isDisplayCurrency(storedCurrency) ? storedCurrency : localeDefault;
    },
    () => localeDefault,
  );

  function selectDisplayCurrency(currency: DisplayCurrency) {
    window.localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, currency);
    window.dispatchEvent(new Event(DISPLAY_CURRENCY_CHANGE_EVENT));
  }

  return (
    <DisplayCurrencyContext value={{ displayCurrency, selectDisplayCurrency }}>
      {children}
    </DisplayCurrencyContext>
  );
}

export function useDisplayCurrency(): DisplayCurrencyContextValue {
  const context = useContext(DisplayCurrencyContext);
  if (!context) {
    throw new Error("useDisplayCurrency must be used inside DisplayCurrencyProvider");
  }

  return context;
}
