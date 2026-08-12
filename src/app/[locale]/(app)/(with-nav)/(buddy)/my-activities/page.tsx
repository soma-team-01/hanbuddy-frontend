import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlusIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { MyActivitiesContent } from "./my-activities-content";

export default async function MyActivitiesPage({
  params,
}: Readonly<{ params: Promise<{ locale: Locale }> }>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "MyActivities" });

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        backHref="/dashboard"
        action={
          <Link
            href="/my-activities/create"
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-display text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover"
          >
            <PlusIcon className="size-4" />
            <span className="hidden sm:inline">{t("createActivity")}</span>
          </Link>
        }
      />
      <PageContainer className="flex-1 py-6 md:py-10">
        <main>
          <MyActivitiesContent />
        </main>
      </PageContainer>
    </>
  );
}
