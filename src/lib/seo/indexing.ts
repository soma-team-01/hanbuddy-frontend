import { stripLocaleFromPathname } from "@/i18n/pathname";

const PRIVATE_ROUTES = [
  "/admin",
  "/login",
  "/onboarding",
  "/home",
  "/my-page",
  "/chat",
  "/applications",
  "/dashboard",
  "/my-activities",
  "/payments",
  "/auth",
  "/buddy/onboarding",
  "/buddy/resubmission",
  "/buddy/auth",
];

export function isNoindexPath(pathname: string): boolean {
  const path = stripLocaleFromPathname(pathname);
  return (
    PRIVATE_ROUTES.some((route) => path === route || path.startsWith(`${route}/`)) ||
    /^\/activities\/[^/]+\/book(?:\/|$)/.test(path)
  );
}
