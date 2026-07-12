import type { UserType } from "./types";

export type BottomNavRole = "tourist" | "buddy";

interface RouteAccessInput {
  pathname: string;
  accessToken?: string;
  signupToken?: string;
  userType?: UserType;
}

const SHARED_PROTECTED_ROUTES = ["/home", "/my-page"] as const;
const TOURIST_ROUTES = ["/explore", "/activities", "/applications"] as const;
const BUDDY_ROUTES = ["/dashboard", "/my-activities"] as const;

export function parseUserType(value?: string | null): UserType | undefined {
  if (value === "TOURIST" || value === "BUDDY") return value;
  return undefined;
}

export function getUserTypeHomePath(userType?: UserType | null) {
  if (userType === "TOURIST") return "/explore";
  if (userType === "BUDDY") return "/dashboard";
  return "/login";
}

export function getUserTypeNavRole(userType?: UserType | null): BottomNavRole {
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

  if (pathname === "/login") {
    return authenticated ? homePath : null;
  }

  if (pathname === "/onboarding") {
    if (authenticated) return homePath;
    return signupToken ? null : "/login";
  }

  const isSharedProtectedRoute = SHARED_PROTECTED_ROUTES.some((route) =>
    isRouteOrDescendant(pathname, route),
  );
  const isTouristRoute = TOURIST_ROUTES.some((route) => isRouteOrDescendant(pathname, route));
  const isBuddyRoute = BUDDY_ROUTES.some((route) => isRouteOrDescendant(pathname, route));

  if (!isSharedProtectedRoute && !isTouristRoute && !isBuddyRoute) return null;
  if (!authenticated) return "/login";
  if (isTouristRoute && userType !== "TOURIST") return homePath;
  if (isBuddyRoute && userType !== "BUDDY") return homePath;

  return null;
}

function isRouteOrDescendant(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}
