import type { UserType } from "./types";

export type SiteNavRole = "tourist" | "buddy";

interface RouteAccessInput {
  pathname: string;
  accessToken?: string;
  signupToken?: string;
  userType?: UserType;
}

const SHARED_PROTECTED_ROUTES = ["/home", "/my-page"] as const;
const TOURIST_ROUTES = ["/applications"] as const;
const BUDDY_ROUTES = ["/dashboard", "/my-activities"] as const;

export function parseUserType(value?: string | null): UserType | undefined {
  if (value === "TOURIST" || value === "BUDDY") return value;
  return undefined;
}

export function getUserTypeHomePath(userType: "TOURIST"): "/";
export function getUserTypeHomePath(userType: "BUDDY"): "/dashboard";
export function getUserTypeHomePath(userType?: UserType | null): "/login" | "/" | "/dashboard";
export function getUserTypeHomePath(userType?: UserType | null) {
  if (userType === "TOURIST") return "/";
  if (userType === "BUDDY") return "/dashboard";
  return "/login";
}

export function getUserTypeNavRole(userType?: UserType | null): SiteNavRole {
  return userType === "BUDDY" ? "buddy" : "tourist";
}

export function getRouteAccessRedirect({
  pathname,
  accessToken,
  signupToken,
  userType,
}: RouteAccessInput): string | null {
  const authenticated = Boolean(accessToken && userType);
  const homePath = getUserTypeHomePath(userType);

  if (pathname === "/login" || pathname === "/onboarding" || pathname === "/buddy/onboarding") {
    return getAuthEntryRedirect({ pathname, signupToken }, authenticated, homePath);
  }

  return getProtectedRouteRedirect({ pathname, userType }, authenticated, homePath);
}

function getAuthEntryRedirect(
  { pathname, signupToken }: Pick<RouteAccessInput, "pathname" | "signupToken">,
  authenticated: boolean,
  homePath: string,
) {
  if (authenticated) return homePath;
  if ((pathname === "/onboarding" || pathname === "/buddy/onboarding") && !signupToken) {
    return "/login";
  }
  return null;
}

function getProtectedRouteRedirect(
  { pathname, userType }: Pick<RouteAccessInput, "pathname" | "userType">,
  authenticated: boolean,
  homePath: string,
) {
  const isSharedProtectedRoute = SHARED_PROTECTED_ROUTES.some((route) =>
    isRouteOrDescendant(pathname, route),
  );
  const isTouristRoute = TOURIST_ROUTES.some((route) => isRouteOrDescendant(pathname, route));
  const isTouristBookingRoute = /^\/activities\/[^/]+\/book(?:\/|$)/.test(pathname);
  const isBuddyRoute = BUDDY_ROUTES.some((route) => isRouteOrDescendant(pathname, route));

  if (!isSharedProtectedRoute && !isTouristRoute && !isTouristBookingRoute && !isBuddyRoute) {
    return null;
  }
  if (!authenticated) return "/login";
  if ((isTouristRoute || isTouristBookingRoute) && userType !== "TOURIST") return homePath;
  if (isBuddyRoute && userType !== "BUDDY") return homePath;

  return null;
}

function isRouteOrDescendant(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}
