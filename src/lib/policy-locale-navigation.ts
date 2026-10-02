import { localizePathname } from "@/i18n/pathname";
import { LOCALE_COOKIE_NAME, type Locale } from "@/i18n/routing";

/** A hard navigation avoids retaining the old locale in the intercepted policy slot. */
export function reloadPolicyInLocale(pathname: string, locale: Locale): boolean {
  if (!pathname.startsWith("/policies/")) return false;
  const { search, hash } = window.location;
  // The proxy prioritizes the saved locale, so update it before requesting the new document.
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  window.location.replace(`${localizePathname(pathname, locale)}${search}${hash}`);
  return true;
}
