import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd } from "@/lib/seo/json-ld";
import { pageAlternates, sharePreview } from "@/lib/seo/metadata";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import { RecommendedExperiences } from "@/components/landing/RecommendedExperiences";
import { isActivitySearchDate } from "@/lib/activity-booking-window";
import { getPublicActivities } from "@/lib/server/public-activities";
import { LandingHeroMedia } from "@/components/landing/LandingHeroMedia";
import { ActivityDateFilter } from "@/components/activity/ActivityDateFilter";
import { MailIcon } from "@/components/ui/icons";
import { LandingAnalytics, LandingCtaLink } from "@/components/analytics/LandingAnalytics";
import { TrackedInquiryLink } from "@/components/analytics/TrackedInquiryLink";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { parseUserType } from "@/lib/auth/routes";

const HERO_MEDIA = [
  // 순서: 9/12 관중석 → 8/15 K리그 → 9/12 야간 단체컷 → 9/13 가이드 동행 단체컷 → 7/26 잠실
  // (유현님 확정 2026-09-29: 앉아서 찍은 9/12 관중석이 1번, 9/12는 두 장, 9/13은 가이드님 단체컷 한 장).
  // 장수를 바꾸면 globals.css의 hero-media-cycle 키프레임 비율도 같이 바꿔야 한다(5장 기준).
  // PC(md 이상)는 모두 4:3 원본을 흐린 배경 위에 같은 크기로 놓는다(contain). 풀블리드 cover는
  // 셀피의 얼굴이 화면을 가득 채워 부담스럽고, 사진마다 박스 크기가 달라지는 문제가 있었다.
  // position은 모바일 배경 사진에서 사람이 보이도록 잡는 초점이다.
  {
    src: "/images/landing/kbo-0912-jamsil-crowd.webp",
    altKey: "visuals.jamsilAlt",
    fit: "contain",
    position: "50% 40%",
  },
  {
    src: "/images/landing/kleague-0815-crew.webp",
    altKey: "visuals.kleagueAlt",
    fit: "contain",
    position: "32% 50%",
  },
  {
    src: "/images/landing/kbo-0912-group-night.webp",
    altKey: "visuals.jamsilGroupAlt",
    fit: "contain",
    position: "50% 50%",
  },
  {
    src: "/images/landing/kbo-0913-group-guide.webp",
    altKey: "visuals.jamsilSundayGuideAlt",
    fit: "contain",
    position: "45% 50%",
  },
  {
    src: "/images/landing/kbo-0726-group.webp",
    altKey: "visuals.kbo0726Alt",
    fit: "contain",
    position: "85% 50%",
  },
] as const;

const HERO_HIGHLIGHTS = ["localPerspective", "realConnection", "sharedMoments"] as const;
const BOOKING_STEPS = ["experience", "schedule", "payment"] as const;
const REVIEW_KEYS = ["cheerTogether", "localBuddy", "lookedAfter"] as const;

const CONTACT_DETAILS = {
  email: "contact@hanbuddy.kr",
  instagramLabel: "@hanbuddy_kr",
  instagramUrl: "https://www.instagram.com/hanbuddy_kr/",
} as const;

interface LandingPageProps {
  readonly params: Promise<{ locale: Locale }>;
  readonly searchParams?: Promise<{ date?: string | string[] }>;
}

export async function generateMetadata({ params }: LandingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Landing" });

  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
    ...sharePreview({
      locale,
      path: "",
      title: t("metadataTitle"),
      description: t("metadataDescription"),
    }),
    alternates: pageAlternates(locale, ""),
  };
}

export default async function LandingPage({ params, searchParams }: LandingPageProps) {
  const { locale } = await params;
  const query = await searchParams;
  const date = Array.isArray(query?.date) ? query.date.join(",") : query?.date;
  // 추천 활동도 서버에서 먼저 받아 첫 HTML에 카드로 넣는다. 실패하면 undefined로 두고 브라우저가 다시 불러온다.
  const validDate = !date || isActivitySearchDate(date);
  const [t, aboutT, cookieStore, initialActivities] = await Promise.all([
    getTranslations({ locale, namespace: "Landing" }),
    getTranslations({ locale, namespace: "About" }),
    cookies(),
    validDate ? getPublicActivities(locale, date || undefined).catch(() => undefined) : undefined,
  ]);

  // 후기 아래 About·FAQ 미리보기. About의 실제 숫자와 예약 전에 가장 많이 묻는 질문 세 개를 먼저 보여준다.
  const aboutStats = (["runs", "rating", "guests"] as const).map((key) => {
    // "4.9 / 5"처럼 만점 표기가 붙은 값은 앞 숫자만 크게, "/ 5"는 작게 붙여 좁은 칸에서도 한 줄로 둔다.
    const [lead, ...rest] = aboutT(`stats.items.${key}.value`).split(" / ");
    return {
      key,
      lead,
      scale: rest.length > 0 ? `/ ${rest.join(" / ")}` : null,
      label: aboutT(`stats.items.${key}.label`),
    };
  });
  const faqPreview = (["pay", "meet", "dietary"] as const).map((key) => ({
    key,
    question: aboutT(`faq.items.${key}.question`),
  }));
  // 로그인한 관광객에게는 로그인 유도 대신 탐색으로 보낸다 (layout.tsx와 같은 판별 규칙)
  const userType = parseUserType(cookieStore.get(AUTH_COOKIES.userType)?.value);
  const isTourist =
    userType === "TOURIST" && Boolean(cookieStore.get(AUTH_COOKIES.accessToken)?.value);

  return (
    <main className="flex w-full flex-1 flex-col bg-canvas text-ink">
      <JsonLd data={organizationJsonLd(locale, t("metadataDescription"))} />
      <LandingAnalytics locale={locale} />
      {/* 모바일도 사진 위에 제목·검색·소개를 함께 배치한다. */}
      <section
        data-landing-section="hero"
        data-landing-position="1"
        aria-label={t("visuals.ariaLabel")}
        className="relative isolate z-20 bg-ink text-on-primary md:min-h-[clamp(560px,72svh,760px)]"
      >
        <LandingHeroMedia
          images={HERO_MEDIA.map((image) => ({
            src: image.src,
            alt: t(image.altKey),
            fit: image.fit,
            position: image.position,
          }))}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(38,27,24,0.08)_0%,rgba(38,27,24,0.18)_20%,rgba(38,27,24,0.72)_48%,rgba(38,27,24,0.85)_100%)] md:hidden"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(38,27,24,0.88)_0%,rgba(38,27,24,0.68)_38%,rgba(38,27,24,0.22)_78%,rgba(38,27,24,0.4)_100%)] md:block"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden bg-gradient-to-t from-ink/65 via-transparent to-ink/20 md:block"
        />

        <PageContainer className="relative z-10 flex min-h-[500px] items-end pt-36 pb-7 md:min-h-[clamp(560px,72svh,760px)] md:py-14 lg:py-16">
          <div className="landing-reveal landing-reveal-delay-1 mx-auto w-full max-w-3xl min-w-0 text-center">
            <p className="mb-3 font-display text-xs font-bold tracking-[0.28em] text-primary-soft uppercase md:mb-6">
              {t("eyebrow")}
            </p>
            <h1 className="max-w-3xl font-display text-[1.75rem] leading-[1.1] font-extrabold tracking-[-0.06em] text-on-primary md:text-5xl md:leading-[1.04] lg:text-[clamp(3.25rem,5vw,5.25rem)]">
              {t("headline")}
            </h1>
            {/* 보조 문구는 슬로건의 둘째 줄처럼 붙이고, 설명 문단과는 간격과 굵기로 떼어 놓는다. */}
            <p className="mx-auto mt-3 max-w-2xl font-display text-sm font-bold text-on-primary md:mt-4 md:text-2xl md:leading-snug md:font-semibold md:tracking-[-0.02em]">
              {t("tagline")}
            </p>
            <p className="mx-auto mt-6 hidden max-w-xl text-base leading-7 text-white/75 md:block">
              {t("description")}
            </p>
            <div className="relative z-20 mt-5 flex justify-center text-left md:mt-7">
              <ActivityDateFilter key={date ?? ""} date={date} destination="/explore" />
            </div>

            <div className="mt-7 grid max-w-3xl grid-cols-3 gap-3 border-t border-white/25 pt-4 md:mt-12 md:gap-4 md:pt-6">
              {HERO_HIGHLIGHTS.map((highlight) => (
                <div key={highlight}>
                  <p className="font-display text-xs font-bold text-on-primary md:text-sm">
                    {t(`highlights.${highlight}.title`)}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-white/80 md:text-sm">
                    {t(`highlights.${highlight}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </PageContainer>
      </section>

      <RecommendedExperiences date={date} initialActivities={initialActivities} />

      <section
        data-landing-section="booking_steps"
        data-landing-position="3"
        aria-labelledby="booking-title"
        className="border-t border-line-soft bg-canvas-soft py-10 md:py-12"
      >
        <PageContainer>
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-display text-xs font-bold tracking-[0.25em] text-primary uppercase">
              {t("booking.eyebrow")}
            </p>
            <h2
              id="booking-title"
              className="mt-4 font-display text-2xl leading-tight font-extrabold tracking-[-0.04em] text-ink sm:text-3xl"
            >
              {t("booking.title")}
            </h2>
            <p className="mt-4 text-sm leading-6 text-muted sm:text-base">
              {t("booking.description")}
            </p>
          </div>

          <div className="mx-auto mt-7 grid max-w-5xl gap-3 md:grid-cols-3">
            {BOOKING_STEPS.map((step, index) => (
              <article
                key={step}
                className="flex items-center gap-4 rounded-[1.5rem] border border-line-soft bg-panel-raised px-5 py-5 sm:px-6 md:block"
              >
                <span className="shrink-0 font-display text-lg font-extrabold text-primary sm:text-xl">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div className="md:mt-3">
                  <h3 className="font-display text-base font-bold text-ink sm:text-lg">
                    {t(`booking.steps.${step}.title`)}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-muted sm:text-base">
                    {t(`booking.steps.${step}.description`)}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-7 text-center">
            <LandingCtaLink
              href={isTourist ? "/explore" : "/login"}
              ctaId="booking_start"
              sectionId="booking_steps"
              position={3}
              destinationType={isTourist ? "explore" : "login"}
              locale={locale}
              className="motion-press inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 font-display text-sm font-bold text-on-primary shadow-[0_10px_22px_rgba(209,63,50,0.2)] transition-colors hover:bg-primary-hover"
            >
              {isTourist ? t("exploreExperiences") : t("booking.cta")}
              <span aria-hidden className="ml-2 text-lg leading-none">
                →
              </span>
            </LandingCtaLink>
          </div>
        </PageContainer>
      </section>

      <section
        data-landing-section="guest_reviews"
        data-landing-position="4"
        aria-labelledby="reviews-title"
        className="bg-canvas-soft pt-20 pb-10 md:pt-28 md:pb-16"
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

      {/* About·FAQ 미리보기. 모바일은 위아래, 1024px부터 나란히. */}
      <div className="bg-canvas-soft pb-14 md:pb-20">
        <PageContainer className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-12">
          {/* About: 깊은 브랜드 레드 위에 실제 숫자 3개를 크게 */}
          <section
            aria-labelledby="learn-more-about"
            className="relative overflow-hidden rounded-[1.75rem] bg-primary-strong p-5 text-on-primary-strong shadow-[0_18px_40px_rgba(143,47,40,0.22)] md:p-8 lg:p-10"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-28 -right-24 size-64 rounded-full bg-primary opacity-45 md:size-80"
            />
            <div className="relative flex items-start justify-between gap-4">
              <h2
                id="learn-more-about"
                className="pt-1 font-display text-xl leading-snug font-extrabold tracking-[-0.03em] md:text-2xl lg:text-3xl"
              >
                {t("learnMore.about.title")}
              </h2>
              {/* 밝은 낮 사진 1장을 작게. 얼굴이 크게 나오지 않도록 4:3 썸네일로 둔다. */}
              <div className="relative aspect-[4/3] w-[76px] shrink-0 -rotate-3 overflow-hidden rounded-xl bg-panel ring-2 ring-on-primary-strong/90 md:w-32 lg:w-40">
                <Image
                  src="/images/landing/kbo-0726-group.webp"
                  alt={aboutT("timeline.items.july.imageAlt")}
                  fill
                  sizes="(min-width: 1024px) 160px, (min-width: 768px) 128px, 76px"
                  className="object-cover object-[70%_45%]"
                />
              </div>
            </div>

            <dl className="relative mt-5 grid grid-cols-3 divide-x divide-on-primary-strong/20 md:mt-8">
              {aboutStats.map((stat) => (
                // 화면에는 숫자를 위에 두되(flex-col-reverse), 마크업 순서는 dt → dd를 지킨다.
                <div
                  key={stat.key}
                  className="flex min-w-0 flex-col-reverse justify-end gap-1.5 px-3 first:pl-0 last:pr-0 md:px-5"
                >
                  <dt className="text-xs leading-4 text-on-primary-strong/80 md:text-sm md:leading-5">
                    {stat.label}
                  </dt>
                  <dd className="font-display text-[1.75rem] leading-none font-extrabold tracking-[-0.04em] whitespace-nowrap md:text-5xl">
                    {stat.lead}
                    {stat.scale ? (
                      <span className="ml-1 text-sm font-bold tracking-normal text-on-primary-strong/80 md:text-lg">
                        {stat.scale}
                      </span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>

            <Link
              href="/about"
              className="relative mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-canvas-soft px-5 font-display text-sm font-bold text-primary-strong transition-colors hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary-strong md:mt-8"
            >
              {t("learnMore.about.button")}
              <span aria-hidden>→</span>
            </Link>
          </section>

          {/* FAQ: 상자 없이 구분선 목록. 각 질문은 FAQ 페이지의 해당 답으로 바로 간다. */}
          <section aria-labelledby="learn-more-faq" className="flex flex-col lg:justify-center">
            <h2
              id="learn-more-faq"
              className="font-display text-xl leading-snug font-extrabold tracking-[-0.03em] text-ink md:text-2xl lg:text-3xl"
            >
              {t("learnMore.faq.title")}
            </h2>
            <ol className="mt-3 divide-y divide-line-soft border-y border-line-soft md:mt-5">
              {faqPreview.map((item, index) => (
                <li key={item.key}>
                  <Link
                    href={`/faq#faq-${item.key}`}
                    className="group flex min-h-[52px] items-center gap-3 py-2 text-ink transition-colors hover:text-primary-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong md:min-h-16 md:gap-4"
                  >
                    <span
                      aria-hidden
                      className="w-6 shrink-0 font-display text-xs font-extrabold tracking-[0.08em] text-primary tabular-nums"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 text-[0.95rem] leading-6 font-medium md:text-lg">
                      {item.question}
                    </span>
                    <span
                      aria-hidden
                      className="shrink-0 text-lg text-primary transition-transform group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
            <Link
              href="/faq"
              className="mt-2 inline-flex min-h-11 items-center gap-1.5 self-start font-display text-sm font-bold text-primary-strong transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong md:mt-4"
            >
              {t("learnMore.faq.button")}
              <span aria-hidden>→</span>
            </Link>
          </section>
        </PageContainer>
      </div>

      <section
        data-landing-section="contact"
        data-landing-position="5"
        aria-labelledby="contact-title"
        className="bg-canvas-soft pt-8 pb-4 md:pt-12 md:pb-5"
      >
        <PageContainer>
          <div className="rounded-[2rem] border border-line-soft bg-canvas-soft px-6 py-12 text-center shadow-[0_16px_36px_rgba(61,45,43,0.05)] sm:px-12 md:py-14">
            <p className="font-display text-xs font-bold tracking-[0.25em] text-primary uppercase">
              {t("contact.eyebrow")}
            </p>
            <h2
              id="contact-title"
              className="mt-4 font-display text-2xl leading-tight font-extrabold tracking-[-0.04em] text-ink sm:text-4xl"
            >
              {t("contact.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
              {t("contact.description")}
            </p>
            <TrackedInquiryLink
              channel="email"
              placement="landing_contact"
              locale={locale}
              href={`mailto:${CONTACT_DETAILS.email}`}
              className="motion-press mt-7 inline-flex min-h-12 items-center gap-3 rounded-full bg-primary px-6 font-display text-sm font-bold text-on-primary shadow-[0_12px_24px_rgba(209,63,50,0.2)] transition-colors hover:bg-primary-hover"
            >
              <MailIcon className="size-5" />
              {t("contact.emailLabel")}
            </TrackedInquiryLink>
            <p className="mt-4 text-sm text-muted">{t("contact.responseNote")}</p>
          </div>
        </PageContainer>
      </section>
    </main>
  );
}
