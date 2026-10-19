import { sanitizeReturnToPath } from "./return-to";

/** Keep signup recovery on the same role and validated booking destination. */
export function getEmailAuthLinks(locale: string, buddy: boolean, returnTo?: string | null) {
  if (buddy) return { login: "/ko/login", signup: "/ko/signup?intent=buddy" };
  const next = sanitizeReturnToPath(returnTo);
  const query = next ? `?next=${encodeURIComponent(next)}` : "";
  return { login: `/${locale}/login${query}`, signup: `/${locale}/signup${query}` };
}
