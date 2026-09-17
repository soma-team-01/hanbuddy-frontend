import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageContainer } from "@/components/layout/PageContainer";

export default async function ActivityNotFound() {
  const t = await getTranslations("ActivityDetail");
  const explore = await getTranslations("Explore");
  return (
    <PageContainer className="py-10">
      <h1 className="font-display text-2xl font-bold">{t("notFound")}</h1>
      <Link href="/explore" className="mt-6 inline-block text-primary underline">
        {explore("title")}
      </Link>
    </PageContainer>
  );
}
