import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { BuddyGoogleAuthDialog } from "@/components/auth/BuddyGoogleAuthDialog";
import {
  CalendarDaysIcon,
  HeartHandshakeIcon,
  LightbulbIcon,
  MessageSquareIcon,
  SparklesIcon,
  UsersIcon,
} from "@/components/ui/icons";
import type { Locale } from "@/i18n/routing";

const APP_ORIGIN = "https://hanbuddy-frontend.vercel.app";

const BENEFITS = [
  { key: "share", Icon: LightbulbIcon },
  { key: "connect", Icon: HeartHandshakeIcon },
  { key: "schedule", Icon: CalendarDaysIcon },
] as const;

const EXPERIENCE_IDEAS = [
  {
    key: "baseball",
    image: "/images/landing/kbo-0726-group.webp",
    imageClassName: "object-[50%_38%]",
  },
  {
    key: "picnic",
    image: "/images/landing/hanriver-picnic.webp",
    imageClassName: "object-center",
  },
  {
    key: "food",
    image: "/images/buddy/market-food-experience.jpg",
    imageClassName: "object-center",
  },
] as const;

const STEPS = ["profile", "design", "publish", "host"] as const;
const SUPPORTS = [
  { key: "manage", Icon: CalendarDaysIcon },
  { key: "communicate", Icon: MessageSquareIcon },
  { key: "grow", Icon: SparklesIcon },
] as const;

interface BuddyHostingPageProps {
  readonly params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: BuddyHostingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BuddyHosting" });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    alternates: {
      canonical: `${APP_ORIGIN}/${locale}/buddy`,
      languages: {
        en: `${APP_ORIGIN}/en/buddy`,
        ko: `${APP_ORIGIN}/ko/buddy`,
        ja: `${APP_ORIGIN}/ja/buddy`,
        "zh-Hans": `${APP_ORIGIN}/zh-Hans/buddy`,
        "zh-Hant": `${APP_ORIGIN}/zh-Hant/buddy`,
      },
    },
  };
}

export default async function BuddyHostingPage({ params }: BuddyHostingPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BuddyHosting" });

  return (
    <main className="flex w-full flex-1 flex-col bg-canvas-soft text-ink">
      <section className="relative isolate min-h-[calc(100svh-76px)] overflow-hidden bg-ink text-white">
        <Image
          src="/images/buddy/hosting-hero.jpg"
          alt={t("hero.imageAlt")}
          fill
          priority
          sizes="(min-width: 1024px) 1px, 100vw"
          className="object-cover object-[68%_center] lg:hidden"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(25,16,14,0.92)_0%,rgba(38,27,24,0.72)_52%,rgba(38,27,24,0.26)_100%)] lg:hidden"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-ink/65 via-ink/10 to-ink/20 lg:hidden"
        />

        <div className="relative z-10 grid min-h-[calc(100svh-76px)] lg:grid-cols-2">
          <div className="mx-auto flex w-full max-w-[600px] items-center px-4 py-16 sm:py-20 md:px-6 lg:mr-0 lg:px-8">
            <div className="max-w-2xl">
              <p className="font-display text-xs font-bold tracking-[0.28em] text-[#ffb09f] uppercase">
                {t("hero.eyebrow")}
              </p>
              <h1 className="mt-5 max-w-xl font-display text-3xl leading-[1.08] font-extrabold tracking-[-0.05em] sm:text-4xl xl:text-5xl">
                {t("hero.title")}
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-6 text-white/[0.82] sm:text-base sm:leading-7">
                {t("hero.description")}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <BuddyGoogleAuthDialog />
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/45 px-7 font-display text-sm font-bold text-white transition-colors hover:border-white hover:bg-white/10"
                >
                  {t("hero.secondaryCta")}
                </a>
              </div>
            </div>
          </div>

          <div className="relative hidden min-h-[calc(100svh-76px)] lg:block">
            <Image
              src="/images/buddy/hosting-hero.jpg"
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 1px"
              className="object-cover object-[68%_center]"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-r from-ink via-ink/15 to-transparent"
            />
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-18" aria-labelledby="why-buddy-title">
        <PageContainer>
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-display text-xs font-bold tracking-[0.25em] text-primary uppercase">
              {t("benefits.eyebrow")}
            </p>
            <h2
              id="why-buddy-title"
              className="mt-4 font-display text-2xl leading-tight font-extrabold tracking-[-0.04em] sm:text-3xl"
            >
              {t("benefits.title")}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted">
              {t("benefits.description")}
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {BENEFITS.map(({ key, Icon }) => (
              <article
                key={key}
                className="rounded-[1.75rem] border border-line-soft bg-canvas p-7 shadow-[0_14px_34px_rgba(61,45,43,0.05)]"
              >
                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-5 font-display text-lg font-bold tracking-[-0.025em]">
                  {t(`benefits.items.${key}.title`)}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
                  {t(`benefits.items.${key}.description`)}
                </p>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="bg-panel py-14 sm:py-18" aria-labelledby="experience-ideas-title">
        <PageContainer>
          <div>
            <p className="font-display text-xs font-bold tracking-[0.25em] text-primary uppercase">
              {t("ideas.eyebrow")}
            </p>
            <h2
              id="experience-ideas-title"
              className="mt-4 font-display text-2xl leading-tight font-extrabold tracking-[-0.04em] sm:text-3xl lg:whitespace-nowrap"
            >
              {t("ideas.title")}
            </h2>
            <p className="mt-4 text-left text-sm leading-6 text-muted sm:text-base">
              {t("ideas.description")}
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {EXPERIENCE_IDEAS.map(({ key, image, imageClassName }) => (
              <article key={key} className="group overflow-hidden rounded-[1.75rem] bg-canvas">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={image}
                    alt={t(`ideas.items.${key}.imageAlt`)}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className={`object-cover transition-transform duration-500 group-hover:scale-[1.03] ${imageClassName}`}
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-display text-lg font-bold tracking-[-0.025em]">
                    {t(`ideas.items.${key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
                    {t(`ideas.items.${key}.description`)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>

      <section
        id="how-it-works"
        className="scroll-mt-24 py-14 sm:py-18"
        aria-labelledby="steps-title"
      >
        <PageContainer>
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-display text-xs font-bold tracking-[0.25em] text-primary uppercase">
              {t("steps.eyebrow")}
            </p>
            <h2
              id="steps-title"
              className="mt-4 font-display text-2xl leading-tight font-extrabold tracking-[-0.04em] sm:text-3xl"
            >
              {t("steps.title")}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted">
              {t("steps.description")}
            </p>
          </div>

          <ol className="mx-auto mt-10 grid max-w-5xl gap-3 md:grid-cols-2">
            {STEPS.map((step, index) => (
              <li
                key={step}
                className="flex gap-5 rounded-[1.5rem] border border-line-soft bg-canvas p-6 sm:p-7"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-extrabold text-white">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold tracking-[-0.025em]">
                    {t(`steps.items.${step}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted sm:text-base">
                    {t(`steps.items.${step}.description`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </PageContainer>
      </section>

      <section className="bg-ink py-14 text-white sm:py-18" aria-labelledby="support-title">
        <PageContainer className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="font-display text-xs font-bold tracking-[0.25em] text-[#ffb09f] uppercase">
              {t("support.eyebrow")}
            </p>
            <h2
              id="support-title"
              className="mt-4 font-display text-2xl leading-tight font-extrabold tracking-[-0.04em] sm:text-3xl"
            >
              {t("support.title")}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/[0.68]">
              {t("support.description")}
            </p>
          </div>
          <div className="grid gap-3">
            {SUPPORTS.map(({ key, Icon }) => (
              <article
                key={key}
                className="flex gap-4 rounded-[1.5rem] border border-white/[0.12] bg-white/[0.06] p-5 sm:p-6"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                  <Icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold">
                    {t(`support.items.${key}.title`)}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-white/[0.65]">
                    {t(`support.items.${key}.description`)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </PageContainer>
      </section>

      <section className="py-14 sm:py-18" aria-labelledby="buddy-cta-title">
        <PageContainer>
          <div className="relative isolate overflow-hidden rounded-[2rem] bg-primary px-6 py-14 text-center text-white sm:px-12 sm:py-16">
            <div
              aria-hidden
              className="absolute -top-24 -right-20 -z-10 size-72 rounded-full bg-white/10"
            />
            <div
              aria-hidden
              className="absolute -bottom-36 -left-12 -z-10 size-80 rounded-full bg-primary-strong/35"
            />
            <UsersIcon className="mx-auto size-8" />
            <h2
              id="buddy-cta-title"
              className="mx-auto mt-5 max-w-3xl font-display text-2xl leading-tight font-extrabold tracking-[-0.04em] sm:text-3xl"
            >
              {t("finalCta.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/[0.82]">
              {t("finalCta.description")}
            </p>
            <BuddyGoogleAuthDialog variant="inverse" />
          </div>
        </PageContainer>
      </section>
    </main>
  );
}
