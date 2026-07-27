import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const experiences = [
  { img: "/images/activities/gwangjang-market.jpg", messageKey: "gwangjangMarket" },
  { img: "/images/activities/hanok-hero.jpg", messageKey: "bukchonHanok" },
  { img: "/images/activities/tea-ceremony.jpg", messageKey: "teaCeremony" },
] as const;

const APP_ORIGIN = "https://hanbuddy-frontend.vercel.app";

interface LandingPageProps {
  readonly params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: LandingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    alternates: {
      canonical: `${APP_ORIGIN}/${locale}`,
      languages: {
        en: `${APP_ORIGIN}/en`,
        ko: `${APP_ORIGIN}/ko`,
      },
    },
  };
}

export default async function LandingPage({ params }: LandingPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });

  return (
    <main className="flex w-full flex-1 flex-col bg-canvas text-ink">
      <PageContainer className="grid items-center gap-10 py-10 md:py-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(520px,1.2fr)] lg:gap-14 lg:py-20">
        <section className="max-w-2xl">
          <p className="mb-4 font-display text-xs font-bold tracking-[0.2em] text-primary-strong uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="font-display text-4xl leading-[1.08] font-extrabold tracking-[-0.04em] text-ink sm:text-5xl lg:text-6xl">
            {t("headline")}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted md:text-lg">
            {t("description")}
          </p>
          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-8 font-display font-bold text-on-primary transition-colors hover:bg-primary-hover"
            >
              {t("getStarted")}
            </Link>
            <Link
              href="/explore"
              className="font-display font-bold text-primary-strong underline-offset-4 hover:underline"
            >
              {t("browseExperiences")}
            </Link>
          </div>
        </section>

        <section aria-label={t("eyebrow")}>
          <div className="flex snap-x scrollbar-none gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
            {experiences.map((experience) => {
              const title = t(`experiences.${experience.messageKey}.title`);
              return (
                <article
                  key={experience.messageKey}
                  className="relative aspect-[4/5] w-[72vw] max-w-64 shrink-0 snap-center overflow-hidden rounded-2xl bg-panel-raised shadow-sm md:w-auto"
                >
                  <Image
                    src={experience.img}
                    alt={title}
                    fill
                    sizes="(min-width: 768px) 30vw, 60vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
                  <div className="absolute right-0 bottom-0 left-0 p-4 text-white">
                    <p className="font-display text-[11px] font-bold tracking-wide text-primary-soft uppercase">
                      {t(`experiences.${experience.messageKey}.tag`)}
                    </p>
                    <h2 className="font-display text-lg font-bold">{title}</h2>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </PageContainer>

      {/* Footer */}
      <footer className="mt-auto border-t border-line-soft py-7 text-sm text-muted">
        <PageContainer>
          <span className="font-display font-bold text-primary-strong">HanBuddy</span>
          <span className="mx-2 text-line-strong">·</span>
          <span>{t("footerTagline")}</span>
        </PageContainer>
      </footer>
    </main>
  );
}
