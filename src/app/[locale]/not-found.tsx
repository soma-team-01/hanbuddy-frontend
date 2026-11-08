import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageContainer } from "@/components/layout/PageContainer";

export default async function LocaleNotFound() {
  const t = await getTranslations("NotFound");
  return (
    <PageContainer className="py-16 text-center">
      <h1 className="font-display text-2xl font-bold text-ink">{t("title")}</h1>
      <p className="mt-3 text-muted">{t("description")}</p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 font-semibold text-on-primary hover:bg-primary-hover"
        >
          {t("home")}
        </Link>
        <Link href="/explore" className="font-semibold text-primary underline">
          {t("explore")}
        </Link>
      </div>
    </PageContainer>
  );
}
