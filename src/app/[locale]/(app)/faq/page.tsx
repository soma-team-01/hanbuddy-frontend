import { sharePreview } from "@/lib/seo/metadata";
import { APP_ORIGIN } from "@/lib/site";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageContainer } from "@/components/layout/PageContainer";
import type { Locale } from "@/i18n/routing";
import { ClosingCta } from "../about/ClosingCta";
import { FAQ_KEYS } from "./faq-keys";

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

  return (
    <main className="flex w-full flex-1 flex-col bg-canvas text-ink">
      <section aria-labelledby="faq-title" className="py-12 md:py-16 lg:py-20">
        <PageContainer className="grid gap-8 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="font-display text-xs font-bold tracking-[0.25em] text-primary uppercase">
              {t("faq.eyebrow")}
            </p>
            <h1
              id="faq-title"
              className="mt-4 font-display text-3xl leading-tight font-extrabold tracking-[-0.04em] text-ink sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]"
            >
              {t("faq.title")}
            </h1>
            {/* 데스크톱에서만 질문 목록을 옆에 두고 바로 이동하게 한다. 모바일은 본문이 곧 목록이다. */}
            <nav aria-label={t("faq.eyebrow")} className="mt-8 hidden lg:block">
              <ol className="space-y-1 border-l border-line-soft">
                {FAQ_KEYS.map((key) => (
                  <li key={key}>
                    <a
                      href={`#faq-${key}`}
                      className="-ml-px flex min-h-9 items-center border-l-2 border-transparent py-1 pl-4 text-sm leading-5 text-muted transition-colors hover:border-primary hover:text-ink focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
                    >
                      {t(`faq.items.${key}.question`)}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          {/* 답을 접지 않고 모두 펼쳐 둔다. 사람과 검색엔진이 같은 글을 읽는다. */}
          <div className="border-t border-line-soft lg:max-w-3xl">
            {FAQ_KEYS.map((key) => (
              <section
                key={key}
                id={`faq-${key}`}
                aria-labelledby={`faq-${key}-question`}
                className="scroll-mt-28 border-b border-line-soft py-6 md:py-7"
              >
                <h2
                  id={`faq-${key}-question`}
                  className="font-display text-lg leading-snug font-bold text-ink md:text-xl"
                >
                  {t(`faq.items.${key}.question`)}
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
                  {t(`faq.items.${key}.answer`)}
                </p>
              </section>
            ))}
          </div>
        </PageContainer>
      </section>

      <ClosingCta
        title={t("cta.title")}
        description={t("cta.description")}
        button={t("cta.button")}
      />
    </main>
  );
}
