import { APP_ORIGIN } from "@/lib/site";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { Avatar } from "@/components/ui/Avatar";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

// 실제 회차 사진(9/5 고척, 9/12 잠실, 8/15 K리그). 메인·로그인과 같은 파일을 재사용한다.
const HERO_COLLAGE = [
  { src: "/images/landing/kbo-0905-dome-friends.webp", altKey: "hero.collageAlt1" },
  { src: "/images/landing/kbo-0912-mascot-crew.webp", altKey: "hero.collageAlt2" },
  { src: "/images/landing/kleague-0815-crew.webp", altKey: "hero.collageAlt3" },
] as const;

const HOW_STEPS = ["plan", "confirm", "improve"] as const;
const STAT_KEYS = ["runs", "rating", "stadiums"] as const;
const TIMELINE_KEYS = ["june", "july", "august", "september"] as const;

const TEAM_MEMBERS = [
  { key: "minhyung", linkedin: "https://www.linkedin.com/in/minbros/" },
  { key: "yoohyun", linkedin: "https://www.linkedin.com/in/yoohyun-kim-6655ba409/" },
  { key: "junyoung", linkedin: "https://kr.linkedin.com/in/이준영-undefined-a63590398" },
] as const;

interface AboutPageProps {
  readonly params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    alternates: {
      canonical: `${APP_ORIGIN}/${locale}/about`,
      languages: {
        en: `${APP_ORIGIN}/en/about`,
        ko: `${APP_ORIGIN}/ko/about`,
        ja: `${APP_ORIGIN}/ja/about`,
        "zh-Hans": `${APP_ORIGIN}/zh-Hans/about`,
        "zh-Hant": `${APP_ORIGIN}/zh-Hant/about`,
      },
    },
  };
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });

  return (
    <main className="flex w-full flex-1 flex-col bg-canvas text-ink">
      <section aria-labelledby="about-hero-title" className="bg-canvas py-12 md:py-16 lg:py-20">
        <PageContainer className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-center lg:gap-16">
          <div className="max-w-2xl">
            <p className="font-display text-xs font-bold tracking-[0.28em] text-primary uppercase">
              {t("hero.eyebrow")}
            </p>
            <h1
              id="about-hero-title"
              className="mt-5 font-display text-4xl leading-[1.08] font-extrabold tracking-[-0.05em] text-ink sm:text-5xl lg:text-[clamp(3rem,4.5vw,4.5rem)]"
            >
              {t("hero.title")}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted sm:text-lg sm:leading-8">
              {t("hero.description")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/explore"
                className="motion-press inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 font-display text-sm font-bold text-on-primary shadow-[0_12px_26px_rgba(209,63,50,0.28)] transition-colors hover:bg-primary-hover"
              >
                {t("hero.primaryCta")}
                <span aria-hidden className="ml-3 text-lg leading-none">
                  →
                </span>
              </Link>
              <a
                href="#about-team"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-line-strong bg-canvas-soft px-7 font-display text-sm font-bold text-ink transition-colors hover:border-primary hover:text-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
              >
                {t("hero.secondaryCta")}
              </a>
            </div>
          </div>

          <ul className="grid grid-cols-3 gap-3 sm:gap-4" aria-label={t("timeline.eyebrow")}>
            {HERO_COLLAGE.map((photo, index) => (
              <li
                key={photo.src}
                className={`relative overflow-hidden rounded-[1.25rem] border border-line-soft bg-panel shadow-[0_14px_35px_rgba(61,45,43,0.08)] ${
                  index === 1 ? "aspect-[3/4] sm:-translate-y-4" : "aspect-[3/4] sm:translate-y-4"
                }`}
              >
                <Image
                  src={photo.src}
                  alt={t(photo.altKey)}
                  fill
                  priority={index === 0}
                  sizes="(min-width: 1024px) 150px, 30vw"
                  className="object-cover"
                />
              </li>
            ))}
          </ul>
        </PageContainer>
      </section>

      <section
        aria-labelledby="about-origin-title"
        className="border-t border-line-soft bg-canvas-soft py-14 md:py-20"
      >
        <PageContainer className="grid gap-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className="font-display text-xs font-bold tracking-[0.25em] text-primary uppercase">
              {t("origin.eyebrow")}
            </p>
            <h2
              id="about-origin-title"
              className="mt-4 font-display text-3xl leading-tight font-extrabold tracking-[-0.04em] text-ink sm:text-4xl"
            >
              {t("origin.title")}
            </h2>
          </div>
          <div className="space-y-5 text-base leading-7 text-muted sm:text-lg sm:leading-8">
            <p>
              {t("origin.body1")}{" "}
              <strong className="font-bold text-ink">{t("origin.body1Strong")}</strong>
            </p>
            <p>
              {t("origin.body2")}{" "}
              <strong className="font-bold text-ink">{t("origin.body2Strong")}</strong>
            </p>
          </div>
        </PageContainer>
      </section>

      <section
        aria-labelledby="about-how-title"
        className="border-t border-line-soft bg-canvas py-14 md:py-20"
      >
        <PageContainer>
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-display text-xs font-bold tracking-[0.25em] text-primary uppercase">
              {t("how.eyebrow")}
            </p>
            <h2
              id="about-how-title"
              className="mt-4 font-display text-3xl leading-tight font-extrabold tracking-[-0.04em] text-ink sm:text-4xl"
            >
              {t("how.title")}
            </h2>
          </div>
          <ol className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
            {HOW_STEPS.map((step, index) => (
              <li
                key={step}
                className="flex gap-4 rounded-[1.5rem] border border-line-soft bg-panel-raised px-5 py-5 sm:px-6 md:block"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-base font-extrabold text-on-primary">
                  {index + 1}
                </span>
                <div className="md:mt-4">
                  <h3 className="font-display text-lg font-bold text-ink">
                    {t(`how.steps.${step}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted sm:text-base sm:leading-7">
                    {t(`how.steps.${step}.description`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </PageContainer>
      </section>

      <section
        aria-labelledby="about-stats-title"
        className="border-t border-line-soft bg-primary-soft py-14 md:py-20"
      >
        <PageContainer>
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-display text-xs font-bold tracking-[0.25em] text-primary uppercase">
              {t("stats.eyebrow")}
            </p>
            <h2
              id="about-stats-title"
              className="mt-4 font-display text-3xl leading-tight font-extrabold tracking-[-0.04em] text-ink sm:text-4xl"
            >
              {t("stats.title")}
            </h2>
          </div>
          <dl className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
            {STAT_KEYS.map((stat) => (
              <div
                key={stat}
                className="rounded-[1.5rem] border border-line-soft bg-canvas-soft px-6 py-7 text-center"
              >
                <dd className="font-display text-4xl leading-none font-extrabold tracking-[-0.04em] text-primary-strong sm:text-5xl">
                  {t(`stats.items.${stat}.value`)}
                </dd>
                <dt className="mt-3 text-sm leading-6 text-muted">
                  {t(`stats.items.${stat}.label`)}
                </dt>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-center text-xs leading-5 text-muted sm:text-sm">
            {t("stats.note")}
          </p>
        </PageContainer>
      </section>

      <section
        aria-labelledby="about-timeline-title"
        className="bg-ink py-14 text-on-primary md:py-20"
      >
        <PageContainer>
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-display text-xs font-bold tracking-[0.25em] text-primary-soft uppercase">
              {t("timeline.eyebrow")}
            </p>
            <h2
              id="about-timeline-title"
              className="mt-4 font-display text-3xl leading-tight font-extrabold tracking-[-0.04em] sm:text-4xl"
            >
              {t("timeline.title")}
            </h2>
          </div>
          <ol className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-2 lg:grid-cols-4">
            {TIMELINE_KEYS.map((item) => (
              <li
                key={item}
                className="rounded-[1.5rem] border border-white/15 bg-white/5 px-5 py-6 sm:px-6"
              >
                <p className="font-display text-xs font-bold tracking-[0.2em] text-primary-soft uppercase">
                  {t(`timeline.items.${item}.date`)}
                </p>
                <h3 className="mt-3 font-display text-lg leading-snug font-bold">
                  {t(`timeline.items.${item}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  {t(`timeline.items.${item}.description`)}
                </p>
              </li>
            ))}
          </ol>
        </PageContainer>
      </section>

      <section
        id="about-team"
        aria-labelledby="about-team-title"
        className="scroll-mt-24 border-t border-line-soft bg-canvas-soft py-14 md:py-20"
      >
        <PageContainer>
          <div className="max-w-3xl">
            <p className="font-display text-xs font-bold tracking-[0.25em] text-primary uppercase">
              {t("team.eyebrow")}
            </p>
            <h2
              id="about-team-title"
              className="mt-4 font-display text-3xl leading-tight font-extrabold tracking-[-0.04em] text-ink sm:text-4xl"
            >
              {t("team.title")}
            </h2>
            <p className="mt-4 text-base leading-7 text-muted sm:text-lg sm:leading-8">
              {t("team.description")}
            </p>
          </div>
          <ul className="mt-10 grid gap-4 sm:grid-cols-3">
            {TEAM_MEMBERS.map((member) => {
              const name = t(`team.members.${member.key}.name`);

              return (
                <li
                  key={member.key}
                  className="flex items-center gap-4 rounded-[1.5rem] border border-line-soft bg-panel-raised px-5 py-5 sm:block sm:px-6 sm:py-6"
                >
                  <Avatar name={name} size={56} className="border-line-soft bg-primary-soft" />
                  <div className="min-w-0 sm:mt-4">
                    <p className="font-display text-lg font-bold text-ink">{name}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {t(`team.members.${member.key}.role`)}
                    </p>
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary transition-colors hover:text-primary-hover focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
                    >
                      {t("team.linkedin")}
                      <span aria-hidden>↗</span>
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-8 max-w-3xl rounded-[1.25rem] border border-line-soft bg-panel px-5 py-4 text-sm leading-6 text-muted">
            {t("team.backed")}
          </p>
        </PageContainer>
      </section>

      <section aria-labelledby="about-cta-title" className="bg-canvas-soft pt-4 pb-16 md:pb-20">
        <PageContainer>
          <div className="rounded-[2rem] border border-line-soft bg-canvas px-6 py-12 text-center shadow-[0_16px_36px_rgba(61,45,43,0.05)] sm:px-12 md:py-14">
            <h2
              id="about-cta-title"
              className="font-display text-2xl leading-tight font-extrabold tracking-[-0.04em] text-ink sm:text-4xl"
            >
              {t("cta.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
              {t("cta.description")}
            </p>
            <Link
              href="/explore"
              className="motion-press mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 font-display text-sm font-bold text-on-primary shadow-[0_12px_24px_rgba(209,63,50,0.2)] transition-colors hover:bg-primary-hover"
            >
              {t("cta.button")}
              <span aria-hidden className="ml-3 text-lg leading-none">
                →
              </span>
            </Link>
          </div>
        </PageContainer>
      </section>
    </main>
  );
}
