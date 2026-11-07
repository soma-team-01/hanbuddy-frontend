import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { Link } from "@/i18n/navigation";

export default async function LocaleNotFound() {
  const t = await getTranslations("NotFound");
  return (
    <PageContainer className="py-16 text-center">
      <h1 className="font-display text-2xl font-bold">{t("title")}</h1>
      <p className="mt-3 text-muted">{t("description")}</p>
      <Link
        href="/"
        className="mt-8 inline-block rounded-full bg-primary px-6 py-3 font-semibold text-on-primary hover:bg-primary-hover"
      >
        {t("home")}
      </Link>
    </PageContainer>
  );
}
