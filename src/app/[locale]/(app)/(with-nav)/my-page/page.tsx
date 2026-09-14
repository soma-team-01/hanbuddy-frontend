import { redirect } from "next/navigation";
import { localizePathname } from "@/i18n/pathname";
import { getLocaleOrDefault } from "@/i18n/routing";

export default async function MyPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  redirect(localizePathname("/my-page/profile", getLocaleOrDefault(locale)));
}
