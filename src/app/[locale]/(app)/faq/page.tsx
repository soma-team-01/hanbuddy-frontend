import { sharePreview } from "@/lib/seo/metadata";
import { APP_ORIGIN } from "@/lib/site";
import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import type { Locale } from "@/i18n/routing";
import { ClosingCta } from "../about/ClosingCta";
import { FAQ_GROUPS } from "./faq-keys";
import { OpenFromHash } from "./OpenFromHash";
import { type NavTopic, TopicChips, TopicRail } from "./TopicNav";

// FAQ는 10문항을 세 묶음으로 나눈다. 모바일은 헤더 아래 붙는 묶음 칩, 데스크톱은 왼쪽 목차로
// 원하는 질문까지 바로 간다. 답은 질문을 눌러야 열리지만(<details>) HTML에는 모두 들어 있어 검색엔진이 읽는다.

const PHOTO = "/images/landing";
const EYEBROW = "font-display text-xs font-bold tracking-[0.26em] uppercase";

// 묶음 머리의 작은 대표 사진. alt는 About 메시지 키.
const GROUP_PHOTOS = {
  hanbuddy: { src: `${PHOTO}/kbo-0913-group-guide.webp`, altKey: "host.photoAlt", position: "" },
  booking: { src: `${PHOTO}/kbo-0913-seats-five.webp`, altKey: "hero.collageAlt3", position: "" },
  day: {
    src: `${PHOTO}/football-0928-mural-group.webp`,
    altKey: "faq.meetPhotoAlt",
    position: "object-[50%_70%]",
  },
} as const;

// 표지 아래 작은 사진 띠. About의 회차 사진을 낮게 이어 붙여 같은 이야기임을 보여준다.
const STRIP = [
  { src: `${PHOTO}/kbo-0726-group.webp`, altKey: "timeline.items.july.imageAlt" },
  { src: `${PHOTO}/kbo-0912-group-night.webp`, altKey: "timeline.items.september.nights.sep12" },
  { src: `${PHOTO}/kleague-0815-crew.webp`, altKey: "timeline.items.august.imageAlt" },
] as const;

// 모바일은 전역 헤더(61px)+칩 바(61px) 아래, 데스크톱은 헤더(77px) 아래로 앵커가 떨어지게 한다.
const SCROLL_OFFSET = "scroll-mt-[136px] lg:scroll-mt-[112px]";

interface FaqPageProps {
  readonly params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: FaqPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });

  return {
    title: t("faq.metadataTitle"),
    description: t("faq.metadataDescription"),
    ...sharePreview({
      locale,
      path: "/faq",
      title: t("faq.metadataTitle"),
      description: t("faq.metadataDescription"),
    }),
    alternates: {
      canonical: `${APP_ORIGIN}/${locale}/faq`,
      languages: {
        en: `${APP_ORIGIN}/en/faq`,
        ko: `${APP_ORIGIN}/ko/faq`,
        ja: `${APP_ORIGIN}/ja/faq`,
        "zh-Hans": `${APP_ORIGIN}/zh-Hans/faq`,
        "zh-Hant": `${APP_ORIGIN}/zh-Hant/faq`,
      },
    },
  };
}

export default async function FaqPage({ params }: FaqPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });

  const topics: NavTopic[] = FAQ_GROUPS.map((group, index) => ({
    id: `faq-group-${group.key}`,
    number: String(index + 1).padStart(2, "0"),
    title: t(`faq.groups.${group.key}`),
    questions: group.questions.map((key) => ({ key, question: t(`faq.items.${key}.question`) })),
  }));

  return (
    <main className="flex w-full flex-1 flex-col bg-canvas text-ink">
      <OpenFromHash />
      <section aria-labelledby="faq-title">
        {/* 표지: About 표지와 같은 진한 바탕. 사진은 4:3 작은 액자 세 장으로 낮게 둔다. */}
        <div className="bg-ink text-on-primary">
          <PageContainer className="pt-10 pb-8 md:pt-14 md:pb-10 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-16 lg:pt-16 lg:pb-14">
            <div>
              <p className={`${EYEBROW} text-primary-soft`}>{t("faq.eyebrow")}</p>
              <h1
                id="faq-title"
                className="mt-3 max-w-[18ch] font-display text-[2rem] leading-[1.1] font-extrabold tracking-[-0.035em] sm:text-5xl lg:text-[3.25rem]"
              >
                {t("faq.title")}
              </h1>
            </div>
            <ul className="mt-7 grid grid-cols-3 gap-2 sm:gap-3 lg:mt-0 lg:w-[540px]">
              {STRIP.map((photo, index) => (
                <li
                  key={photo.src}
                  className={`relative aspect-[4/3] overflow-hidden rounded-xl ring-1 ring-white/15 md:rounded-2xl ${
                    index === 1 ? "translate-y-2 lg:translate-y-3" : ""
                  }`}
                >
                  <Image
                    src={photo.src}
                    alt={t(photo.altKey)}
                    fill
                    sizes="(min-width: 1024px) 180px, 33vw"
                    className="object-cover object-center"
                  />
                </li>
              ))}
            </ul>
          </PageContainer>
        </div>

        {/* 칩 바가 이 상자 끝(맺음 섹션 전)까지만 붙어 있도록 묶음 본문과 함께 감싼다. */}
        <div className="relative">
          <TopicChips topics={topics} label={t("faq.eyebrow")} />

          <PageContainer className="pt-10 pb-16 md:pt-12 md:pb-20 lg:grid lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-16 lg:pt-16">
            <aside className="hidden lg:sticky lg:top-[117px] lg:block lg:self-start">
              <TopicRail topics={topics} label={t("faq.eyebrow")} />
            </aside>

            <div className="space-y-14 md:space-y-16 lg:max-w-3xl">
              {FAQ_GROUPS.map((group, index) => {
                const photo = GROUP_PHOTOS[group.key];
                const id = `faq-group-${group.key}`;
                return (
                  <section
                    key={group.key}
                    id={id}
                    aria-labelledby={`${id}-title`}
                    className={SCROLL_OFFSET}
                  >
                    {/* 묶음 머리: 구장 구역 표지판처럼 큰 번호 + 제목, 오른쪽에 작은 대표 사진 */}
                    <header className="flex items-end gap-4 border-b-2 border-ink pb-4 md:gap-6">
                      <div className="min-w-0 flex-1">
                        <p
                          aria-hidden
                          className="font-display text-[2.75rem] leading-none font-extrabold tracking-[-0.05em] text-primary md:text-6xl"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </p>
                        <h2
                          id={`${id}-title`}
                          className="mt-2 font-display text-2xl leading-tight font-extrabold tracking-[-0.03em] text-ink md:text-3xl"
                        >
                          {t(`faq.groups.${group.key}`)}
                        </h2>
                      </div>
                      <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-2xl bg-panel sm:w-40 lg:w-48">
                        <Image
                          src={photo.src}
                          alt={t(photo.altKey)}
                          fill
                          sizes="(min-width: 1024px) 192px, (min-width: 640px) 160px, 112px"
                          className={`object-cover ${photo.position || "object-center"}`}
                        />
                      </div>
                    </header>

                    {/* 질문을 누르면 답이 열린다. 상자 없이 가는 구분선으로만 나눈다. */}
                    <div className="divide-y divide-line-soft">
                      {group.questions.map((key) => (
                        <details key={key} id={`faq-${key}`} className={`${SCROLL_OFFSET} group`}>
                          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong md:py-5 [&::-webkit-details-marker]:hidden">
                            <h3
                              id={`faq-${key}-question`}
                              className="font-display text-lg leading-snug font-bold text-ink transition-colors group-open:text-primary-strong md:text-xl"
                            >
                              {t(`faq.items.${key}.question`)}
                            </h3>
                            <span
                              aria-hidden
                              className="grid size-8 shrink-0 place-items-center rounded-full bg-panel text-primary transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                            >
                              <svg
                                viewBox="0 0 16 16"
                                className="size-3.5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              >
                                <path d="M8 3v10M3 8h10" />
                              </svg>
                            </span>
                          </summary>
                          <p className="-mt-1 pr-12 pb-5 text-base leading-7 text-muted md:pb-6">
                            {t(`faq.items.${key}.answer`)}
                          </p>
                        </details>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </PageContainer>
        </div>
      </section>

      <ClosingCta
        title={t("cta.title")}
        description={t("cta.description")}
        button={t("cta.button")}
      />
    </main>
  );
}
