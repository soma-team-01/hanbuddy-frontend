import type { UserType } from "./types";

export type BottomNavRole = "tourist" | "buddy";

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
