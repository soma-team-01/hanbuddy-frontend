import { isLocale, type Locale } from "./routing";

const LANGUAGE_SEGMENT = /^\/([A-Za-z]{2})(?:\/|$)/;
const CHINESE_LANGUAGE_SEGMENT = /^\/(zh-[A-Za-z]{2,4})(?:\/|$)/;

export function getLocaleFromPathname(pathname: string): Locale | null {
  const segment = pathname.split("/")[1];
  return isLocale(segment) ? segment : null;
}

export function getLocaleFromLocation(location: string | null): Locale | null {
  if (!location) return null;
  try {
    return getLocaleFromPathname(new URL(location, "http://localhost").pathname);
  } catch {
    return null;
  }
}

export function stripLocaleFromPathname(pathname: string): string {
  const locale = getLocaleFromPathname(pathname);
  if (!locale) return pathname || "/";
  const stripped = pathname.slice(locale.length + 1);
  return stripped || "/";
}

export function localizePathname(pathname: string, locale: Locale): string {
  if (pathname === "/") return `/${locale}`;
  const canonical = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `/${locale}${canonical}`;
}

export function hasUnsupportedLanguageSegment(pathname: string): boolean {
  const match = LANGUAGE_SEGMENT.exec(pathname) ?? CHINESE_LANGUAGE_SEGMENT.exec(pathname);
  return Boolean(match && !isLocale(match[1]));
}
