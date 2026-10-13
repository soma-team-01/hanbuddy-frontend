import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { BuddyWorkspaceTabs } from "@/components/buddy/BuddyWorkspaceTabs";
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
    <PageContainer className="flex-1 py-6 md:py-8">
      <main className="mx-auto w-full max-w-4xl">
        <BuddyWorkspaceTabs active="activities" />
        <div className="-mx-4 -mt-4 md:-mx-6 lg:-mx-8">
          <PageHeader
            title={t("title")}
            compact
            action={
              <Link
                href="/my-activities/create"
                className="relative flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-primary px-3 font-display text-xs font-bold text-on-primary transition-colors after:absolute after:-inset-y-1 hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <PlusIcon className="size-4" />
                <span>{t("createActivity")}</span>
              </Link>
            }
          />
        </div>
        <MyActivitiesContent />
      </main>
    </PageContainer>
  );
}
