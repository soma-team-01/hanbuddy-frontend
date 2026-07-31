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
      <section className="relative overflow-hidden bg-primary-soft/60">
        <div className="pointer-events-none absolute -top-40 right-[-8%] size-[520px] rounded-full bg-primary/10" />
        <div className="pointer-events-none absolute right-[18%] bottom-[-260px] size-[500px] rounded-full bg-primary/5" />
        <PageContainer className="grid min-h-[620px] items-center gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.9fr)] lg:gap-16 lg:py-20">
          <section className="relative z-10 max-w-2xl min-w-0">
            <p className="mb-5 font-display text-xs font-bold tracking-[0.3em] text-primary uppercase">
              {t("eyebrow")}
            </p>
            <h1 className="max-w-xl font-display text-5xl leading-[1.04] font-extrabold tracking-[-0.06em] text-ink sm:text-6xl lg:text-[64px]">
              {t("headline")}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted md:text-lg">
              {t("description")}
            </p>
            <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <Link
                href="/login"
                className="inline-flex min-h-14 min-w-48 items-center justify-center rounded-full bg-primary px-8 font-display font-bold text-on-primary shadow-[0_12px_24px_rgba(209,63,50,0.25)] transition-colors hover:bg-primary-hover"
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

          <section aria-label={t("eyebrow")} className="relative min-h-[390px] min-w-0">
            <div className="absolute top-5 right-0 w-[min(100%,300px)] rotate-[-2deg] rounded-2xl bg-canvas-soft p-5 shadow-[0_18px_40px_rgba(61,45,43,0.14)] sm:right-6">
              <div className="mb-5 flex gap-2 text-xl">
                <span>🍵</span>
                <span>🏘️</span>
                <span>🌙</span>
              </div>
              <p className="font-display text-lg font-bold">{t("experiences.teaCeremony.title")}</p>
              <p className="mt-2 text-sm text-muted">📍 Bukchon · Sat 1:00 PM</p>
              <div className="mt-6 flex items-center justify-between">
                <strong className="font-display text-xl">₩35,000</strong>
                <span className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-white">
                  Apply
                </span>
              </div>
            </div>
            <div className="absolute top-[-18px] left-0 flex items-center gap-3 rounded-2xl bg-canvas-soft px-5 py-4 shadow-lg sm:left-8">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft font-bold text-primary">
                S
              </span>
              <span className="text-sm">
                <strong className="block">Sarah · Tourist</strong>
                <span className="text-muted">wants a tea ceremony</span>
              </span>
            </div>
            <div className="absolute right-10 bottom-2 flex items-center gap-3 rounded-2xl bg-canvas-soft px-5 py-4 shadow-lg">
              <span className="flex size-10 items-center justify-center rounded-full bg-panel font-bold text-primary">
                J
              </span>
              <span className="text-sm">
                <strong className="block">Jihoon · Local buddy</strong>
                <span className="text-muted">hosts & confirms your booking</span>
              </span>
            </div>
            <div className="absolute right-0 bottom-[-38px] rounded-full bg-ink px-7 py-3 text-sm font-bold text-white shadow-xl">
              ✅ Booking confirmed — see you Saturday!
            </div>
          </section>
        </PageContainer>
      </section>

      <section className="py-16 md:py-20">
        <PageContainer className="grid gap-5 md:grid-cols-3">
          {["Browse freely", "Pick a date & apply", "Meet your buddy"].map((title, index) => (
            <article key={title} className="rounded-2xl border border-line-soft bg-canvas-soft p-7">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary-soft font-display font-bold text-primary">
                {index + 1}
              </span>
              <h2 className="mt-5 font-display text-lg font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                {index === 0
                  ? "Every experience is open to view — no account needed to look around."
                  : index === 1
                    ? "Choose a schedule, tell your buddy about you, and pay securely."
                    : "Your buddy confirms and reaches you on your preferred messaging app."}
              </p>
            </article>
          ))}
        </PageContainer>
      </section>

      <section className="border-t border-line-soft py-12">
        <PageContainer className="grid gap-5 sm:grid-cols-3">
          {experiences.map((experience, index) => {
            const title = t(`experiences.${experience.messageKey}.title`);
            return (
              <article
                key={experience.messageKey}
                className="relative aspect-[5/3] overflow-hidden rounded-2xl bg-panel"
              >
                <Image
                  src={experience.img}
                  alt={title}
                  fill
                  loading={index === 0 ? "eager" : undefined}
                  sizes="(min-width: 1024px) 18vw, (min-width: 768px) 30vw, 256px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
                <p className="absolute right-4 bottom-4 font-display text-sm font-bold text-white">
                  {title}
                </p>
              </article>
            );
          })}
        </PageContainer>
      </section>

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
