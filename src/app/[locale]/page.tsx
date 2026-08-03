import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { LandingHeroMedia } from "@/components/landing/LandingHeroMedia";
import { InstagramIcon, MailIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

const HERO_MEDIA = [
  {
    src: "/images/landing/hanriver-picnic.webp",
    altKey: "visuals.mainAlt",
  },
  {
    src: "/images/landing/2차-4.jpeg",
    altKey: "visuals.marketAlt",
  },
  {
    src: "/images/landing/kbo-0726-group.webp",
    altKey: "visuals.teaAlt",
  },
  {
    src: "/images/landing/hanriver-fountain.webp",
    altKey: "visuals.fountainAlt",
  },
] as const;

const HERO_HIGHLIGHTS = ["localPerspective", "realConnection", "sharedMoments"] as const;
const SERVICE_CARDS = ["traveler", "buddy", "together"] as const;
const REVIEW_KEYS = ["cheerTogether", "localBuddy", "lookedAfter"] as const;

const CONTACT_DETAILS = {
  email: "zeroone.soma@gmail.com",
  instagramLabel: "@hanbuddy_kr",
  instagramUrl: "https://www.instagram.com/hanbuddy_kr/",
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
      <section
        aria-label={t("visuals.ariaLabel")}
        className="relative isolate min-h-[calc(100svh-76px)] overflow-hidden bg-ink text-on-primary"
      >
        <LandingHeroMedia
          images={HERO_MEDIA.map((image) => ({
            src: image.src,
            alt: t(image.altKey),
          }))}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(38,27,24,0.88)_0%,rgba(38,27,24,0.68)_38%,rgba(38,27,24,0.22)_78%,rgba(38,27,24,0.4)_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/65 via-transparent to-ink/20"
        />

        <PageContainer className="relative z-10 flex min-h-[calc(100svh-76px)] items-end py-16 sm:py-20 lg:py-24">
          <div className="landing-reveal landing-reveal-delay-1 max-w-3xl min-w-0">
            <p className="mb-6 font-display text-xs font-bold tracking-[0.28em] text-primary-soft uppercase">
              {t("eyebrow")}
            </p>
            <h1 className="max-w-3xl font-display text-5xl leading-[1.02] font-extrabold tracking-[-0.06em] text-on-primary sm:text-6xl lg:text-[clamp(4rem,6vw,6.25rem)]">
              {t("headline")}
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
              {t("description")}
            </p>
            <Link
              href="/explore"
              className="motion-press mt-9 inline-flex min-h-14 items-center justify-center rounded-full bg-primary px-8 font-display text-base font-bold text-on-primary shadow-[0_14px_28px_rgba(209,63,50,0.36)] transition-colors hover:bg-primary-hover"
            >
              {t("exploreExperiences")}
              <span aria-hidden className="ml-3 text-lg leading-none">
                →
              </span>
            </Link>

            <div className="mt-12 grid max-w-3xl gap-5 border-t border-white/25 pt-6 sm:grid-cols-3 sm:gap-4">
              {HERO_HIGHLIGHTS.map((highlight) => (
                <div key={highlight}>
                  <p className="font-display text-sm font-bold text-primary-soft">
                    {t(`highlights.${highlight}.title`)}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-white/70">
                    {t(`highlights.${highlight}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
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
        className="border-t-4 border-primary/80 bg-canvas-soft py-20 md:py-28"
      >
        <PageContainer>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
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
              <p className="mt-5 text-base leading-7 text-muted">
                {t("reviewsSection.description")}
              </p>
            </div>
          </div>

          <div className="mt-10 space-y-4">
            {REVIEW_KEYS.map((reviewKey) => (
              <article
                key={reviewKey}
                className="space-y-6 rounded-[2rem] border border-line-soft bg-canvas-soft p-7 shadow-[0_14px_35px_rgba(61,45,43,0.06)] sm:p-8"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-x-2 text-sm leading-6">
                    <p className="font-display font-bold text-primary">
                      {t(`reviews.${reviewKey}.event`)}
                    </p>
                    <span aria-hidden className="text-primary/50">
                      ·
                    </span>
                    <p className="text-muted">{t(`reviews.${reviewKey}.meta`)}</p>
                  </div>

                  <span
                    role="img"
                    aria-label={t(`reviews.${reviewKey}.starLabel`)}
                    className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 font-display text-lg leading-none tracking-[0.12em] text-primary"
                  >
                    <span aria-hidden>★★★★★</span>
                  </span>
                </div>

                <blockquote className="w-full font-display text-lg leading-8 font-normal tracking-[-0.02em] text-ink sm:text-xl">
                  “{t(`reviews.${reviewKey}.quote`)}”
                </blockquote>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>

      <section aria-labelledby="contact-title" className="bg-canvas-soft py-20 md:py-28">
        <PageContainer>
          <div className="rounded-[2rem] border border-line-soft bg-canvas-soft px-6 py-14 text-center shadow-[0_18px_45px_rgba(61,45,43,0.06)] sm:px-12 md:py-16">
            <p className="font-display text-xs font-bold tracking-[0.25em] text-primary uppercase">
              {t("contact.eyebrow")}
            </p>
            <h2
              id="contact-title"
              className="mt-4 font-display text-3xl leading-tight font-extrabold tracking-[-0.04em] text-ink sm:text-5xl"
            >
              {t("contact.title")}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
              {t("contact.description")}
            </p>
            <a
              href={`mailto:${CONTACT_DETAILS.email}`}
              className="motion-press mt-8 inline-flex min-h-14 items-center gap-3 rounded-full bg-primary px-7 font-display text-base font-bold text-on-primary shadow-[0_14px_28px_rgba(209,63,50,0.22)] transition-colors hover:bg-primary-hover"
            >
              <MailIcon className="size-5" />
              {t("contact.emailLabel")}
            </a>
            <p className="mt-4 text-sm text-muted">{t("contact.responseNote")}</p>
          </div>
        </PageContainer>
      </section>

      <footer className="border-t border-line-soft bg-canvas-soft py-6 text-sm text-muted">
        <PageContainer className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="HanBuddy" className="flex items-center gap-2">
            <Image
              src="/images/brand/logo-borderless.webp"
              alt=""
              width={28}
              height={28}
              className="size-7"
            />
            <span className="font-display font-bold text-ink">HanBuddy</span>
          </Link>

          <div className="flex items-center gap-2">
            <a
              href={`mailto:${CONTACT_DETAILS.email}`}
              aria-label={t("contact.emailIconLabel")}
              className="flex size-11 items-center justify-center rounded-full border border-line-soft text-muted transition-colors hover:border-primary hover:text-primary"
            >
              <MailIcon className="size-5" />
            </a>
            <a
              href={CONTACT_DETAILS.instagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={t("contact.instagramIconLabel")}
              className="flex size-11 items-center justify-center rounded-full border border-line-soft text-muted transition-colors hover:border-primary hover:text-primary"
            >
              <InstagramIcon className="size-5" />
            </a>
          </div>
        </PageContainer>
      </footer>
    </main>
  );
}
