import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const HERO_IMAGES = {
  main: {
    src: "/images/activities/hanok-hero.jpg",
    altKey: "visuals.mainAlt",
  },
  market: {
    src: "/images/activities/gwangjang-market.jpg",
    altKey: "visuals.marketAlt",
  },
  tea: {
    src: "/images/activities/tea-ceremony.jpg",
    altKey: "visuals.teaAlt",
  },
} as const;

const HERO_HIGHLIGHTS = ["localPerspective", "realConnection", "sharedMoments"] as const;
const SERVICE_CARDS = ["traveler", "buddy", "together"] as const;
const REVIEW_KEYS = ["traveler", "buddy", "travelerTwo"] as const;

// Replace these mock values with the official contact details before launch.
const CONTACT_DETAILS = {
  email: "hello@hanbuddy.kr",
  instagramLabel: "@hanbuddy",
  instagramUrl: "https://www.instagram.com/hanbuddy",
} as const;

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
      <section className="relative overflow-hidden bg-primary-soft/65">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-48 right-[-12%] size-[620px] rounded-full bg-canvas-soft/55"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-300px] left-[42%] size-[560px] rounded-full bg-primary-soft"
        />

        <PageContainer className="grid min-h-[calc(100svh-76px)] items-center gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(460px,1.1fr)] lg:gap-10 lg:py-16">
          <div className="landing-reveal landing-reveal-delay-1 relative z-10 max-w-2xl min-w-0">
            <p className="mb-6 font-display text-xs font-bold tracking-[0.28em] text-primary uppercase">
              {t("eyebrow")}
            </p>
            <h1 className="max-w-xl font-display text-5xl leading-[1.02] font-extrabold tracking-[-0.06em] text-ink sm:text-6xl lg:text-[clamp(4rem,6vw,5.75rem)]">
              {t("headline")}
            </h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              {t("description")}
            </p>
            <Link
              href="/explore"
              className="motion-press mt-9 inline-flex min-h-14 items-center justify-center rounded-full bg-primary px-8 font-display text-base font-bold text-on-primary shadow-[0_14px_28px_rgba(209,63,50,0.24)] transition-colors hover:bg-primary-hover"
            >
              {t("exploreExperiences")}
              <span aria-hidden className="ml-3 text-lg leading-none">
                →
              </span>
            </Link>

            <div className="mt-12 grid max-w-2xl gap-5 border-t border-primary/20 pt-6 sm:grid-cols-3 sm:gap-4">
              {HERO_HIGHLIGHTS.map((highlight) => (
                <div key={highlight}>
                  <p className="font-display text-sm font-bold text-primary-strong">
                    {t(`highlights.${highlight}.title`)}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-muted">
                    {t(`highlights.${highlight}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <section
            aria-label={t("visuals.ariaLabel")}
            className="landing-reveal landing-reveal-delay-2 hero-drift relative mx-auto min-h-[500px] w-full max-w-[620px] min-w-0 sm:min-h-[580px]"
          >
            <div className="absolute top-[8%] left-[13%] aspect-[4/5] w-[61%] rotate-[-4deg] overflow-hidden rounded-[2rem] border-8 border-canvas-soft shadow-[0_24px_50px_rgba(61,45,43,0.18)] sm:left-[16%] sm:w-[58%]">
              <Image
                src={HERO_IMAGES.main.src}
                alt={t(HERO_IMAGES.main.altKey)}
                fill
                priority
                loading="eager"
                sizes="(min-width: 1024px) 34vw, (min-width: 640px) 48vw, 70vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/45 via-transparent to-transparent" />
              <p className="absolute right-5 bottom-5 left-5 font-display text-sm font-bold text-on-primary sm:text-base">
                {t("visuals.mainCaption")}
              </p>
            </div>

            <div className="absolute top-[2%] right-[4%] aspect-square w-[27%] rotate-[7deg] overflow-hidden rounded-3xl border-4 border-canvas-soft shadow-[0_18px_34px_rgba(61,45,43,0.16)]">
              <Image
                src={HERO_IMAGES.market.src}
                alt={t(HERO_IMAGES.market.altKey)}
                fill
                sizes="(min-width: 1024px) 16vw, 26vw"
                className="object-cover"
              />
            </div>

            <div className="absolute right-[2%] bottom-[14%] aspect-[4/3] w-[34%] rotate-[5deg] overflow-hidden rounded-3xl border-4 border-canvas-soft shadow-[0_18px_34px_rgba(61,45,43,0.16)]">
              <Image
                src={HERO_IMAGES.tea.src}
                alt={t(HERO_IMAGES.tea.altKey)}
                fill
                sizes="(min-width: 1024px) 20vw, 32vw"
                className="object-cover"
              />
            </div>

            <article className="absolute bottom-[5%] left-0 w-[58%] -rotate-[3deg] rounded-2xl border border-line-soft bg-canvas-soft p-4 shadow-[0_16px_30px_rgba(61,45,43,0.14)] sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display font-bold text-primary">
                  S
                </span>
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold text-ink">
                    {t("reviews.traveler.author")}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-primary-strong">
                    {t("reviews.traveler.label")}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-5 text-muted">“{t("reviews.traveler.quote")}”</p>
            </article>

            <article className="absolute right-0 bottom-0 w-[56%] rotate-[3deg] rounded-2xl border border-line-soft bg-canvas-soft p-4 shadow-[0_16px_30px_rgba(61,45,43,0.14)] sm:p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-panel font-display font-bold text-primary">
                  J
                </span>
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold text-ink">
                    {t("reviews.buddy.author")}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-primary-strong">
                    {t("reviews.buddy.label")}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-5 text-muted">“{t("reviews.buddy.quote")}”</p>
            </article>
          </section>
        </PageContainer>
      </section>

      <section
        aria-labelledby="service-title"
        className="border-t border-line-soft bg-canvas-soft py-20 md:py-28"
      >
        <PageContainer className="grid gap-12 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:items-start lg:gap-20">
          <div className="max-w-xl">
            <p className="font-display text-xs font-bold tracking-[0.25em] text-primary uppercase">
              {t("service.eyebrow")}
            </p>
            <h2
              id="service-title"
              className="mt-4 max-w-md font-display text-3xl leading-tight font-extrabold tracking-[-0.04em] text-ink sm:text-4xl"
            >
              {t("service.title")}
            </h2>
            <p className="mt-5 text-base leading-7 text-muted">{t("service.description")}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {SERVICE_CARDS.map((card, index) => (
              <article
                key={card}
                className="rounded-2xl border border-line-soft bg-panel-raised p-6 sm:min-h-64"
              >
                <span className="font-display text-sm font-bold text-primary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-12 font-display text-lg font-bold text-ink">
                  {t(`service.cards.${card}.title`)}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {t(`service.cards.${card}.description`)}
                </p>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>

      <section
        aria-labelledby="reviews-title"
        className="border-t border-line-soft bg-primary-soft/45 py-20 md:py-28"
      >
        <PageContainer>
          <div className="max-w-2xl">
            <p className="font-display text-xs font-bold tracking-[0.25em] text-primary uppercase">
              {t("reviewsSection.eyebrow")}
            </p>
            <h2
              id="reviews-title"
              className="mt-4 font-display text-3xl leading-tight font-extrabold tracking-[-0.04em] text-ink sm:text-4xl"
            >
              {t("reviewsSection.title")}
            </h2>
            <p className="mt-5 text-base leading-7 text-muted">{t("reviewsSection.description")}</p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {REVIEW_KEYS.map((reviewKey) => (
              <article
                key={reviewKey}
                className="flex min-h-64 flex-col rounded-2xl border border-line-soft bg-canvas-soft p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft font-display font-bold text-primary">
                    {t(`reviews.${reviewKey}.initial`)}
                  </span>
                  <span className="text-xs font-semibold text-primary-strong">
                    {t(`reviews.${reviewKey}.label`)}
                  </span>
                </div>
                <blockquote className="mt-8 flex-1 font-display text-lg leading-7 font-semibold text-ink">
                  “{t(`reviews.${reviewKey}.quote`)}”
                </blockquote>
                <p className="mt-6 text-sm text-muted">{t(`reviews.${reviewKey}.author`)}</p>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>

      <section aria-labelledby="contact-title" className="bg-ink py-20 text-on-primary md:py-28">
        <PageContainer className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="font-display text-xs font-bold tracking-[0.25em] text-primary-soft uppercase">
              {t("contact.eyebrow")}
            </p>
            <h2
              id="contact-title"
              className="mt-4 font-display text-3xl leading-tight font-extrabold tracking-[-0.04em] sm:text-5xl"
            >
              {t("contact.title")}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/70">
              {t("contact.description")}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-3 sm:flex-row sm:items-center">
            <a
              href={`mailto:${CONTACT_DETAILS.email}`}
              className="inline-flex min-h-12 items-center rounded-full bg-primary px-6 font-display text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover"
            >
              {t("contact.emailLabel")}
            </a>
            <a
              href={CONTACT_DETAILS.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center rounded-full border border-white/30 px-6 font-display text-sm font-bold text-on-primary transition-colors hover:border-white hover:bg-white/10"
            >
              {t("contact.instagramLabel")} · {CONTACT_DETAILS.instagramLabel}
            </a>
          </div>
        </PageContainer>
      </section>

      <footer className="mt-auto border-t border-line-soft bg-canvas-soft py-7 text-sm text-muted">
        <PageContainer>
          <span className="font-display font-bold text-primary-strong">HanBuddy</span>
          <span className="mx-2 text-line-strong">·</span>
          <span>{t("footerTagline")}</span>
        </PageContainer>
      </footer>
    </main>
  );
}
