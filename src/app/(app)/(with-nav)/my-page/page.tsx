import { cookies } from "next/headers";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { getUserTypeNavRole, parseUserType } from "@/lib/auth/routes";
import { BuddyMyPage } from "./buddy-my-page";
import { TouristMyPage } from "./tourist-my-page";

export default async function MyPage() {
  const cookieStore = await cookies();
  const role = getUserTypeNavRole(parseUserType(cookieStore.get(AUTH_COOKIES.userType)?.value));

  return role === "buddy" ? <BuddyMyPage /> : <TouristMyPage />;
}
