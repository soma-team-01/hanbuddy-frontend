export type BottomNavRole = "tourist" | "buddy";

export function getUserTypeHomePath(userType?: string | null) {
  if (userType === "TOURIST") return "/explore";
  if (userType === "BUDDY") return "/dashboard";
  return "/login";
}

export function getUserTypeNavRole(userType?: string | null): BottomNavRole {
  return userType === "BUDDY" ? "buddy" : "tourist";
}
