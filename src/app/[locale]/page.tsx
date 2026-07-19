import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
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
    <main className="flex min-h-dvh flex-col bg-cream text-ink">
      {/* Top bar */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <span className="font-display text-xl font-extrabold tracking-tight text-forest">
          HanBuddy
        </span>
        <Link
          href="/login"
          className="rounded-full border border-line px-5 py-2 font-display text-sm font-semibold text-ink transition-colors hover:bg-chip"
        >
          {t("login")}
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto flex w-full max-w-5xl flex-col items-center px-6 pt-12 pb-14 text-center md:pt-20 md:pb-20">
        <p className="mb-4 font-display text-xs font-semibold tracking-[0.2em] text-sage uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="max-w-3xl font-display text-4xl leading-tight font-extrabold text-forest md:text-6xl">
          {t("headline")}
        </h1>
        <p className="mt-5 max-w-xl text-base text-ink-soft md:text-lg">{t("description")}</p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="rounded-full bg-forest px-8 py-3 font-display font-semibold text-cream transition-colors hover:bg-forest-soft"
          >
            {t("getStarted")}
          </Link>
          <Link
            href="/explore"
            className="font-display font-semibold text-forest underline-offset-4 hover:underline"
          >
            {t("browseExperiences")}
          </Link>
        </div>
      </section>

      {/* Experience strip */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-16">
        <div className="flex scrollbar-none gap-4 overflow-x-auto md:grid md:grid-cols-3 md:overflow-visible">
          {experiences.map((experience) => {
            const title = t(`experiences.${experience.messageKey}.title`);
            return (
              <article
                key={experience.messageKey}
                className="relative aspect-[4/5] w-56 shrink-0 overflow-hidden rounded-2xl md:w-auto"
              >
                <Image
                  src={experience.img}
                  alt={title}
                  fill
                  sizes="(min-width: 768px) 30vw, 60vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest/80 via-forest/10 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4 text-cream">
                  <p className="font-display text-[11px] font-semibold tracking-wide text-sage uppercase">
                    {t(`experiences.${experience.messageKey}.tag`)}
                  </p>
                  <h2 className="font-display text-lg font-bold">{title}</h2>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto mt-auto w-full max-w-5xl px-6 py-8 text-sm text-ink-soft">
        <span className="font-display font-semibold text-forest">HanBuddy</span>
        <span className="mx-2 text-line-strong">·</span>
        <span>{t("footerTagline")}</span>
      </footer>
    </main>
  );
}
