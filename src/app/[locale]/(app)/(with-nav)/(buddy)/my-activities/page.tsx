import { getTranslations } from "next-intl/server";
import { TopAppBar } from "@/components/layout/TopAppBar";
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
      <TopAppBar backHref="/dashboard" />
      <main className="flex flex-1 flex-col gap-6 px-4 py-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-forest">{t("title")}</h1>
          <p className="mt-1 text-ink-soft">{t("description")}</p>
        </div>

        <Link
          href="/my-activities/create"
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-forest font-display text-sm font-semibold text-cream transition-colors hover:bg-forest-soft"
        >
          <PlusIcon className="size-4" />
          {t("createActivity")}
        </Link>

        <MyActivitiesContent />
      </main>
    </>
  );
}
