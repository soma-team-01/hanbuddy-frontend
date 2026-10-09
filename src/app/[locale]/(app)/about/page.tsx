import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbJsonLd, type BreadcrumbItem } from "@/lib/seo/json-ld";
import { pageAlternates, sharePreview } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import styles from "./about.module.css";
import { ClosingCta } from "./ClosingCta";
import { SeptemberAlbum } from "./SeptemberAlbum";

// About은 6월 첫 회차부터 겨울 계획까지 실제 회차 사진을 세로로 넘기며 읽는 이야기다.
// 회차 사이는 야구공 실밥 모양의 세로선(styles.stitch)이 잇는다. 사진은 원본에 가까운 4:3으로 담아 좌우를 덜 자른다.

const PHOTO = "/images/landing";

const HOW_STEPS = ["plan", "confirm", "improve"] as const;
const STAT_KEYS = ["runs", "rating", "guests"] as const;

const RUNS = [
  { key: "july", src: `${PHOTO}/kbo-0726-group.webp` },
  { key: "august", src: `${PHOTO}/kleague-0815-crew.webp` },
] as const;

const TEAM_MEMBERS = [
  { key: "minhyung", linkedin: "https://www.linkedin.com/in/minbros/" },
  { key: "yoohyun", linkedin: "https://www.linkedin.com/in/yoohyun-kim-6655ba409/" },
  { key: "junyoung", linkedin: "https://kr.linkedin.com/in/이준영-undefined-a63590398" },
] as const;

const EYEBROW = "font-display text-xs font-bold tracking-[0.26em] uppercase";
const H2 =
  "font-display text-[1.875rem] leading-[1.12] font-extrabold tracking-[-0.03em] text-ink sm:text-4xl lg:text-[2.75rem]";
// 회차 사진 상자. 모바일은 실밥 선 오른쪽 글 열 안에, 데스크톱은 2열의 한쪽에 놓인다.
const RUN_PHOTO =
  "relative mt-4 ml-9 aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-panel md:max-w-[560px] md:rounded-[1.5rem] lg:mt-0 lg:ml-0 lg:max-w-none";
const RUN_PHOTO_SIZES = "(min-width: 1024px) 540px, (min-width: 768px) 640px, 85vw";

const renderNowrap = (chunks: ReactNode) => <span className="whitespace-nowrap">{chunks}</span>;

interface AboutPageProps {
  readonly params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    ...sharePreview({
      locale,
      path: "/about",
      title: t("metadataTitle"),
      description: t("metadataDescription"),
    }),
    alternates: pageAlternates(locale, "/about"),
  };
}

// 실밥 선 위의 날짜 핀. 모바일은 날짜 줄 왼쪽, 데스크톱은 가운데 선 위에 놓인다.
function Pin({ hollow = false, className = "" }: { hollow?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={`block size-3.5 rounded-full ring-[5px] ring-canvas ${
        hollow ? "border-2 border-dashed border-primary bg-canvas" : "bg-primary"
      } ${className}`}
    />
  );
}

function DateLabel({ children, hollow = false }: { children: React.ReactNode; hollow?: boolean }) {
  return (
    <p
      className={`relative flex min-h-6 items-center pl-9 font-display text-xs font-bold tracking-[0.22em] uppercase lg:pl-0 ${
        hollow ? "text-muted" : "text-primary"
      }`}
    >
      <Pin hollow={hollow} className="absolute top-1/2 left-[7px] -translate-y-1/2 lg:hidden" />
      {children}
    </p>
  );
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  const [t, navT] = await Promise.all([
    getTranslations({ locale, namespace: "About" }),
    getTranslations({ locale, namespace: "Navigation" }),
  ]);
  const breadcrumbs: BreadcrumbItem[] = [
    { name: navT("home"), path: "" },
    { name: navT("about"), path: "/about" },
  ];

  // 9월 다섯 번의 밤. 큰 사진이 자동으로 바뀌고 아래 썸네일이 지금 사진을 표시한다.
  const septemberNights = [
    {
      label: "09.05",
      src: `${PHOTO}/kbo-0905-dome-friends.webp`,
      alt: t("timeline.items.september.imageAlt"),
    },
    {
      label: "09.12",
      src: `${PHOTO}/kbo-0912-group-night.webp`,
      alt: t("timeline.items.september.nights.sep12"),
    },
    {
      label: "09.13",
      src: `${PHOTO}/kbo-0913-seats-five.webp`,
      alt: t("hero.collageAlt3"),
    },
    {
      label: "09.18",
      src: `${PHOTO}/kbo-0918-field-group.webp`,
      alt: t("timeline.items.september.nights.sep18"),
      position: "object-[50%_72%]",
    },
    {
      label: "09.28",
      src: `${PHOTO}/football-0928-seats-guide.webp`,
      alt: t("timeline.items.september.nights.sep28"),
    },
  ];

  return (
    <main className="flex w-full flex-1 flex-col bg-canvas text-ink">
      <JsonLd data={breadcrumbJsonLd(locale, breadcrumbs)} />
      {/* 표지: 9/28 국가대표전 밤, 문정수 가이드님과 게스트들. 데스크톱은 얼굴이 화면을 채우지 않게 3:4 액자에 담는다. */}
      <section
        aria-labelledby="about-hero-title"
        className="relative isolate overflow-hidden bg-ink text-on-primary"
      >
        <div aria-hidden className="absolute inset-0 -z-10 hidden lg:block">
          <Image
            src={`${PHOTO}/football-0928-stadium-wide.webp`}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-[50%_60%] opacity-40"
          />
          <div className="absolute inset-0 bg-linear-to-r from-ink via-ink/85 to-ink/45" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-ink to-transparent" />
        </div>

        {/* 모바일은 사진 위 얇은 띠, 데스크톱은 표지 위 여백 안에 놓여 표지 높이를 바꾸지 않는다. */}
        <div className="relative z-20 mx-auto w-full max-w-[1200px] px-4 py-1.5 md:px-6 lg:absolute lg:inset-x-0 lg:top-5 lg:px-8 lg:py-0">
          <Breadcrumbs items={breadcrumbs} label={navT("breadcrumb")} tone="dark" />
        </div>

        <div className="mx-auto grid max-w-[1200px] lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-center lg:gap-x-16 lg:px-8 lg:pt-20 lg:pb-14">
          <div className="relative h-[min(50svh,26rem)] min-h-[19rem] md:h-[min(54svh,32rem)] lg:col-start-2 lg:row-start-1 lg:aspect-[3/4] lg:h-auto lg:min-h-0 lg:overflow-hidden lg:rounded-[2rem] lg:shadow-[0_30px_80px_rgba(0,0,0,0.45)] lg:ring-1 lg:ring-white/15">
            <Image
              src={`${PHOTO}/football-0928-night-group.webp`}
              alt={t("hero.photoAlt")}
              fill
              loading="eager"
              fetchPriority="high"
              sizes="(min-width: 1024px) 400px, 100vw"
              className="object-cover object-[50%_66%]"
            />
            <div className="absolute inset-x-0 -bottom-px h-[60%] bg-linear-to-t from-ink from-10% via-ink/75 to-transparent lg:hidden" />
          </div>

          <div className="relative z-10 -mt-28 px-4 md:-mt-36 md:px-6 lg:col-start-1 lg:row-start-1 lg:mt-0 lg:px-0">
            <p className={`${EYEBROW} text-primary-soft`}>{t("hero.eyebrow")}</p>
            <h1
              id="about-hero-title"
              className="mt-3 max-w-[14ch] font-display text-[2.25rem] leading-[1.06] font-extrabold tracking-[-0.03em] sm:text-5xl lg:text-[clamp(3.25rem,5vw,4.5rem)]"
            >
              {t("hero.title")}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8">
              {t("hero.description")}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/explore"
                className="motion-press inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 font-display text-sm font-bold text-on-primary shadow-[0_14px_30px_rgba(209,63,50,0.4)] transition-colors hover:bg-primary-hover"
              >
                {t("hero.primaryCta")}
                <span aria-hidden className="ml-3 text-lg leading-none">
                  →
                </span>
              </Link>
              <a
                href="#about-team"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 px-7 font-display text-sm font-bold text-on-primary transition-colors hover:border-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-soft"
              >
                {t("hero.secondaryCta")}
              </a>
            </div>
          </div>

          {/* 숫자는 표지 바로 아래 "증거" 띠로 붙인다. */}
          <section
            aria-labelledby="about-stats-title"
            className="mx-4 mt-10 border-t border-white/15 pt-6 pb-10 md:mx-6 lg:col-span-2 lg:row-start-2 lg:mx-0 lg:mt-16 lg:grid lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-12 lg:pb-0"
          >
            <div>
              <p className={`${EYEBROW} text-primary-soft`}>{t("stats.eyebrow")}</p>
              <h2
                id="about-stats-title"
                className="mt-3 font-display text-lg leading-snug font-bold text-on-primary sm:text-xl"
              >
                {t("stats.title")}
              </h2>
            </div>
            <div>
              <dl className="mt-6 grid grid-cols-3 divide-x divide-white/15 lg:mt-0">
                {STAT_KEYS.map((stat) => (
                  // dl 안에서는 이름(dt)이 값(dd)보다 먼저 와야 한다. 화면에서는 값을 위에 크게 보여준다.
                  <div
                    key={stat}
                    className="flex flex-col-reverse justify-end px-3 first:pl-0 last:pr-0 sm:px-6"
                  >
                    <dt className="mt-2 text-xs leading-5 text-white/70 sm:text-sm">
                      {t(`stats.items.${stat}.label`)}
                    </dt>
                    <dd className="font-display text-[1.65rem] leading-none font-extrabold tracking-[-0.04em] whitespace-nowrap text-on-primary sm:text-4xl lg:text-5xl">
                      {t(`stats.items.${stat}.value`)}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-5 text-[0.7rem] leading-5 text-white/60 sm:text-xs">
                {t("stats.note")}
              </p>
            </div>
          </section>
        </div>
      </section>

      {/* 이야기: 시작한 이유(6월)부터 겨울 계획까지 실밥 선 하나로 잇는다. */}
      <PageContainer className="pt-14 pb-16 md:pt-20 md:pb-24">
        <div className="relative">
          <span
            aria-hidden
            className={`absolute top-2 bottom-0 left-[9px] w-2.5 lg:left-1/2 lg:-translate-x-1/2 ${styles.stitch}`}
          />

          {/* 1장: 시작한 이유 + 첫 회차 사진 */}
          <section aria-labelledby="about-origin-title" className="relative">
            <div className="lg:grid lg:grid-cols-2 lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-x-24">
              <div className="pl-9 lg:col-start-2 lg:row-start-2 lg:pl-0">
                <p className={`${EYEBROW} text-primary`}>{t("origin.eyebrow")}</p>
                <h2 id="about-origin-title" className={`mt-4 ${H2}`}>
                  {t("origin.title")}
                </h2>
              </div>

              <figure
                className={`relative mt-9 lg:col-start-1 lg:row-span-4 lg:row-start-1 lg:mt-0 ${styles.reveal}`}
              >
                <DateLabel>{t("timeline.items.june.date")}</DateLabel>
                {/* 세로 사진이라 위쪽의 다른 관중은 잘라내고 팀원 넷이 보이는 아래쪽을 쓴다. */}
                <div className={`${RUN_PHOTO} lg:mt-4`}>
                  <Image
                    src={`${PHOTO}/1차-1.webp`}
                    alt={t("timeline.items.june.imageAlt")}
                    fill
                    sizes={RUN_PHOTO_SIZES}
                    className="object-cover object-[50%_49%]"
                  />
                </div>
                <figcaption className="mt-4 pl-9 lg:pl-0">
                  <h3 className="font-display text-lg leading-snug font-bold text-ink">
                    {t("timeline.items.june.title")}
                  </h3>
                  <p className="mt-1.5 text-base leading-7 text-muted">
                    {t("timeline.items.june.description")}
                  </p>
                </figcaption>
              </figure>

              <div
                className={`mt-8 space-y-5 pl-9 text-base leading-7 text-muted sm:text-lg sm:leading-8 lg:col-start-2 lg:row-start-3 lg:mt-8 lg:pl-0 ${styles.reveal}`}
              >
                {/* 모바일에서 5줄 안쪽으로 읽히게 한 문단으로 둔다. */}
                <p>
                  {t("origin.body1")}{" "}
                  <strong className="font-bold text-ink">{t("origin.body1Strong")}</strong>{" "}
                  {t("origin.body2")}{" "}
                  <strong className="font-bold text-ink">{t("origin.body2Strong")}</strong>
                </p>
              </div>
            </div>
            <Pin className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block" />
          </section>

          {/* 2장~: 회차 기록 */}
          <section aria-labelledby="about-timeline-title" className="relative mt-16 md:mt-24">
            <div className="pl-9 lg:mx-auto lg:max-w-2xl lg:bg-canvas lg:py-8 lg:pl-0 lg:text-center">
              <p className={`${EYEBROW} text-primary`}>{t("timeline.eyebrow")}</p>
              <h2 id="about-timeline-title" className={`mt-4 ${H2}`}>
                {t("timeline.title")}
              </h2>
            </div>

            <ol className="mt-12 space-y-12 md:mt-16 md:space-y-16 lg:space-y-24">
              {RUNS.map((run, index) => {
                const photoLeft = index % 2 === 1;
                return (
                  <li
                    key={run.key}
                    className="relative grid lg:grid-cols-2 lg:items-center lg:gap-x-24"
                  >
                    <Pin className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block" />
                    <figure
                      className={`order-2 lg:order-none lg:row-start-1 ${
                        photoLeft ? "lg:col-start-1" : "lg:col-start-2"
                      } ${styles.reveal}`}
                    >
                      <div className={RUN_PHOTO}>
                        <Image
                          src={run.src}
                          alt={t(`timeline.items.${run.key}.imageAlt`)}
                          fill
                          sizes={RUN_PHOTO_SIZES}
                          className="object-cover object-center"
                        />
                      </div>
                    </figure>
                    <div
                      className={`contents lg:row-start-1 lg:flex lg:flex-col ${
                        photoLeft ? "lg:col-start-2" : "lg:col-start-1 lg:items-end lg:text-right"
                      }`}
                    >
                      <div className="order-1 lg:order-none">
                        <DateLabel>{t(`timeline.items.${run.key}.date`)}</DateLabel>
                      </div>
                      <div
                        className={`order-3 mt-4 max-w-md pl-9 lg:mt-4 lg:pl-0 ${styles.reveal}`}
                      >
                        <h3 className="font-display text-xl leading-tight font-extrabold tracking-[-0.03em] text-ink lg:text-3xl">
                          {t(`timeline.items.${run.key}.title`)}
                        </h3>
                        <p className="mt-2 text-base leading-7 text-muted">
                          {t(`timeline.items.${run.key}.description`)}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}

              {/* 9월: 다섯 번의 밤. 사진이 자동으로 넘어가는 앨범으로 한 자리에 모은다. */}
              <li className="relative grid lg:grid-cols-2 lg:items-center lg:gap-x-24">
                <Pin className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block" />
                <div className="contents lg:col-start-1 lg:row-start-1 lg:flex lg:flex-col lg:items-end lg:text-right">
                  <div className="order-1 lg:order-none">
                    <DateLabel>{t("timeline.items.september.date")}</DateLabel>
                  </div>
                  <div className={`order-3 mt-4 max-w-md pl-9 lg:mt-4 lg:pl-0 ${styles.reveal}`}>
                    <h3 className="font-display text-xl leading-tight font-extrabold tracking-[-0.03em] text-ink lg:text-3xl">
                      {t("timeline.items.september.title")}
                    </h3>
                    <p className="mt-2 text-base leading-7 text-muted">
                      {t("timeline.items.september.description")}
                    </p>
                  </div>
                </div>
                <div
                  className={`order-2 mt-4 ml-9 md:max-w-[560px] lg:order-none lg:col-start-2 lg:row-start-1 lg:mt-0 lg:ml-0 lg:max-w-none ${styles.reveal}`}
                >
                  <SeptemberAlbum
                    label={t("timeline.items.september.title")}
                    photos={septemberNights}
                  />
                </div>
              </li>

              {/* 겨울: 아직 오지 않은 장. 사진 대신 빈 점선 액자. */}
              <li className="relative lg:flex lg:flex-col lg:items-center lg:text-center">
                <div className="lg:relative lg:z-10 lg:bg-canvas lg:px-4 lg:py-2">
                  <DateLabel hollow>{t("timeline.next.date")}</DateLabel>
                  <Pin hollow className="mx-auto mt-3 hidden lg:block" />
                </div>
                <div
                  className={`mt-4 ml-9 rounded-[1.5rem] border-2 border-dashed border-line-strong bg-canvas px-5 py-7 sm:px-8 lg:mt-6 lg:ml-0 lg:w-full lg:max-w-2xl lg:py-12 ${styles.reveal}`}
                >
                  <h3 className="font-display text-xl leading-tight font-extrabold tracking-[-0.03em] text-ink lg:text-2xl">
                    {t("timeline.next.title")}
                  </h3>
                  <p className="mt-2 text-base leading-7 text-muted">
                    {t.rich("timeline.next.description", {
                      nowrap: renderNowrap,
                    })}
                  </p>
                </div>
              </li>
            </ol>
          </section>
        </div>
      </PageContainer>

      {/* 진행 방식 */}
      <section
        aria-labelledby="about-how-title"
        className="border-t border-line-soft bg-panel py-14 md:py-20"
      >
        <PageContainer className="lg:grid lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className={`${EYEBROW} text-primary`}>{t("how.eyebrow")}</p>
            <h2 id="about-how-title" className={`mt-4 ${H2}`}>
              {t("how.title")}
            </h2>
          </div>
          <ol className="mt-9 grid gap-7 md:grid-cols-3 md:gap-6 lg:mt-0">
            {HOW_STEPS.map((step, index) => (
              <li key={step} className="border-t-2 border-ink pt-5">
                <span
                  aria-hidden
                  className="font-display text-sm font-extrabold tracking-[0.2em] text-primary"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-display text-lg leading-snug font-bold text-ink">
                  {t(`how.steps.${step}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted sm:text-base sm:leading-7 md:text-sm md:leading-6 lg:text-base lg:leading-7">
                  {t(`how.steps.${step}.description`)}
                </p>
              </li>
            ))}
          </ol>
        </PageContainer>
      </section>

      {/* 팀: 이니셜 없이 이름과 역할만, 크게. */}
      <section
        id="about-team"
        aria-labelledby="about-team-title"
        className="scroll-mt-24 bg-canvas py-14 md:py-20"
      >
        <PageContainer className="lg:grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:gap-16">
          <div>
            <p className={`${EYEBROW} text-primary`}>{t("team.eyebrow")}</p>
            <h2 id="about-team-title" className={`mt-4 ${H2}`}>
              {t.rich("team.title", {
                nowrap: renderNowrap,
              })}
            </h2>
            <p className="mt-5 text-base leading-7 text-muted sm:text-lg sm:leading-8">
              {t("team.description")}
            </p>
          </div>
          <div className="mt-9 lg:mt-2">
            <ul className="divide-y divide-line-soft border-y border-line-strong">
              {TEAM_MEMBERS.map((member) => (
                <li
                  key={member.key}
                  className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-5"
                >
                  <div className="min-w-0">
                    <p className="font-display text-2xl leading-tight font-extrabold tracking-[-0.035em] text-ink sm:text-3xl">
                      {t(`team.members.${member.key}.name`)}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted sm:text-base">
                      {t(`team.members.${member.key}.role`)}
                    </p>
                  </div>
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1 text-sm font-bold text-primary transition-colors hover:text-primary-hover focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
                  >
                    {t("team.linkedin")}
                    <span aria-hidden>↗</span>
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-6 border-l-2 border-primary pl-4 text-sm leading-6 text-muted">
              {t("team.backed")}
            </p>
          </div>
        </PageContainer>
      </section>

      {/* 버디 모집: 9/13에 처음 호스팅한 이한명 가이드님과 게스트들. */}
      <section aria-labelledby="about-host-title" className="bg-canvas pb-4">
        <PageContainer>
          <div className="overflow-hidden rounded-[2rem] bg-primary-soft lg:grid lg:grid-cols-2">
            <div className="relative aspect-[4/3] lg:order-2 lg:aspect-auto lg:min-h-[24rem]">
              <Image
                src={`${PHOTO}/kbo-0913-group-guide.webp`}
                alt={t("host.photoAlt")}
                fill
                sizes="(min-width: 1024px) 570px, 100vw"
                className="object-cover object-center"
              />
            </div>
            <div className="px-6 py-9 sm:px-10 lg:flex lg:flex-col lg:justify-center lg:px-12 lg:py-14">
              <p className={`${EYEBROW} text-primary`}>{t("host.eyebrow")}</p>
              <h2
                id="about-host-title"
                className="mt-4 font-display text-[1.75rem] leading-[1.12] font-extrabold tracking-[-0.04em] text-ink sm:text-4xl"
              >
                {t("host.title")}
              </h2>
              <p className="mt-4 text-base leading-7 text-muted">{t("host.description")}</p>
              {/* 게스트용 빨간 버튼과 구분되게 호스트 모집은 진한 버튼으로 둔다. */}
              <Link
                href="/buddy"
                className="motion-press mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-7 font-display text-sm font-bold text-on-primary transition-colors hover:bg-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong sm:w-auto sm:self-start"
              >
                {t("host.button")}
                <span aria-hidden className="ml-3 text-lg leading-none">
                  →
                </span>
              </Link>
            </div>
          </div>
        </PageContainer>
      </section>

      <ClosingCta
        title={t("cta.title")}
        description={t("cta.description")}
        button={t("cta.button")}
        faqLinkLabel={t("faq.title")}
      />
    </main>
  );
}
