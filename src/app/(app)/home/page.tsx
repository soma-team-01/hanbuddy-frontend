import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIES } from "@/lib/auth/cookies";

export const dynamic = "force-dynamic";

/** 역할별 홈으로 보내는 진입점 - 로고 클릭 등 "홈으로" 이동에 사용한다 */
export default async function HomePage() {
  const cookieStore = await cookies();
  const userType = cookieStore.get(AUTH_COOKIES.userType)?.value;

  if (userType === "TOURIST") redirect("/explore");
  if (userType === "BUDDY") redirect("/dashboard");
  redirect("/login");
}
