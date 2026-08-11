import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { localizePathname } from "@/i18n/pathname";
import { isLocale, routing } from "@/i18n/routing";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { getUserTypeHomePath, parseUserType } from "@/lib/auth/routes";

export const dynamic = "force-dynamic";

/** 역할별 홈으로 보내는 진입점 - 로고 클릭 등 "홈으로" 이동에 사용한다 */
export default async function HomePage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale: requestedLocale } = await params;
  const locale = isLocale(requestedLocale) ? requestedLocale : routing.defaultLocale;
  const cookieStore = await cookies();
  const userType = parseUserType(cookieStore.get(AUTH_COOKIES.userType)?.value);

  redirect(localizePathname(getUserTypeHomePath(userType), locale));
}
