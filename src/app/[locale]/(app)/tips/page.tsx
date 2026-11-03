import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageContainer } from "@/components/layout/PageContainer";
import { JsonLd } from "@/components/seo/JsonLd";
import { TIPS_COPY } from "@/components/tips/tips-copy";
import { breadcrumbJsonLd, type BreadcrumbItem } from "@/lib/seo/json-ld";
import { publicPageMetadata, unavailableMetadata } from "@/lib/seo/metadata";
import { listTips } from "@/lib/server/tips-content";
import { formatTipDate, tipPath, tipsIndexPath, TIPS_LOCALE } from "@/lib/tips/tip";

interface TipsIndexPageProps {
  readonly params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: TipsIndexPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== TIPS_LOCALE) return {};

  const metadata = publicPageMetadata({
    locale: TIPS_LOCALE,
    path: tipsIndexPath(),
    title: TIPS_COPY.indexTitle,
    description: TIPS_COPY.indexDescription,
    locales: [TIPS_LOCALE],
  });
  // 글이 하나도 없는 목록은 내용이 없는 문서라 색인하지 않는다(사이트맵에서도 뺀다).
  return (await listTips()).length > 0 ? metadata : { ...metadata, ...unavailableMetadata };
}

export default async function TipsIndexPage({ params }: TipsIndexPageProps) {
  const { locale } = await params;
  if (locale !== TIPS_LOCALE) notFound();

  const [tips, navT] = await Promise.all([
    listTips(),
    getTranslations({ locale: TIPS_LOCALE, namespace: "Navigation" }),
  ]);
  const breadcrumbs: BreadcrumbItem[] = [
    { name: navT("home"), path: "" },
    { name: TIPS_COPY.breadcrumbTips, path: tipsIndexPath() },
  ];

  return (
    <main className="flex w-full flex-1 flex-col bg-canvas text-ink">
      <JsonLd data={breadcrumbJsonLd(TIPS_LOCALE, breadcrumbs)} />
      <PageContainer className="pt-2 pb-16 md:pt-4 md:pb-20">
        <Breadcrumbs items={breadcrumbs} label={navT("breadcrumb")} />
        <div className="mx-auto mt-8 max-w-[760px]">
          <h1 className="font-display text-[2rem] leading-[1.1] font-extrabold tracking-[-0.035em] sm:text-5xl">
            {TIPS_COPY.indexTitle}
          </h1>
          <p className="mt-4 text-base leading-7 text-muted">{TIPS_COPY.indexDescription}</p>

          {tips.length > 0 ? (
            <ul className="mt-10 flex flex-col gap-4">
              {tips.map((tip) => (
                <li key={tip.slug}>
                  <article className="rounded-2xl border border-line-soft bg-canvas-soft p-5 transition-colors hover:border-line-strong md:p-6">
                    <h2 className="font-display text-xl font-bold tracking-[-0.02em]">
                      <Link
                        href={`/${TIPS_LOCALE}${tipPath(tip.slug)}`}
                        className="hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
                      >
                        {tip.title}
                      </Link>
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted md:text-base">
                      {tip.description}
                    </p>
                    <p className="mt-3 text-xs text-muted">
                      {TIPS_COPY.updated}{" "}
                      <time dateTime={tip.updatedAt}>{formatTipDate(tip.updatedAt)}</time>
                    </p>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-10 rounded-2xl border border-line-soft bg-canvas-soft p-6 text-muted">
              {TIPS_COPY.indexEmpty}{" "}
              <Link
                href={`/${TIPS_LOCALE}/explore`}
                className="font-semibold text-primary underline underline-offset-4"
              >
                {TIPS_COPY.exploreExperiences}
              </Link>
            </p>
          )}
        </div>
      </PageContainer>
    </main>
  );
}
