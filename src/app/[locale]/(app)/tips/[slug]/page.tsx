import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { PageContainer } from "@/components/layout/PageContainer";
import { JsonLd } from "@/components/seo/JsonLd";
import { TipMarkdown } from "@/components/tips/TipMarkdown";
import { TIPS_COPY } from "@/components/tips/tips-copy";
import { articleJsonLd, breadcrumbJsonLd, type BreadcrumbItem } from "@/lib/seo/json-ld";
import { publicPageMetadata } from "@/lib/seo/metadata";
import { getRelatedActivities } from "@/lib/server/tips-activities";
import { getTip, listTips } from "@/lib/server/tips-content";
import { formatTipDate, tipPath, tipsIndexPath, TIPS_LOCALE } from "@/lib/tips/tip";

interface TipPageProps {
  readonly params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  return (await listTips()).map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: TipPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const tip = locale === TIPS_LOCALE ? await getTip(slug) : null;
  if (!tip) return {};

  const metadata = publicPageMetadata({
    locale: TIPS_LOCALE,
    path: tipPath(slug),
    title: tip.title,
    description: tip.description,
    locales: [TIPS_LOCALE],
  });
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      publishedTime: tip.publishedAt,
      modifiedTime: tip.updatedAt,
    },
  };
}

export default async function TipPage({ params }: TipPageProps) {
  const { locale, slug } = await params;
  if (locale !== TIPS_LOCALE) notFound();
  const tip = await getTip(slug);
  if (!tip) notFound();

  const [navT, related] = await Promise.all([
    getTranslations({ locale: TIPS_LOCALE, namespace: "Navigation" }),
    getRelatedActivities(tip.relatedActivityIds),
  ]);
  const breadcrumbs: BreadcrumbItem[] = [
    { name: navT("home"), path: "" },
    { name: TIPS_COPY.breadcrumbTips, path: tipsIndexPath() },
    { name: tip.title, path: tipPath(slug) },
  ];

  return (
    <main className="flex w-full flex-1 flex-col bg-canvas text-ink">
      <JsonLd
        data={articleJsonLd(TIPS_LOCALE, {
          path: tipPath(slug),
          title: tip.title,
          description: tip.description,
          publishedAt: tip.publishedAt,
          updatedAt: tip.updatedAt,
        })}
      />
      <JsonLd data={breadcrumbJsonLd(TIPS_LOCALE, breadcrumbs)} />
      <PageContainer className="pt-2 pb-16 md:pt-4 md:pb-20">
        <Breadcrumbs items={breadcrumbs} label={navT("breadcrumb")} />
        <article className="mx-auto mt-8 max-w-[760px]">
          <header>
            <h1 className="font-display text-[2rem] leading-[1.1] font-extrabold tracking-[-0.035em] sm:text-4xl md:text-5xl">
              {tip.title}
            </h1>
            <p className="mt-4 text-base leading-7 text-muted">{tip.description}</p>
            <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span>
                {TIPS_COPY.published}{" "}
                <time dateTime={tip.publishedAt}>{formatTipDate(tip.publishedAt)}</time>
              </span>
              {tip.updatedAt !== tip.publishedAt ? (
                <span>
                  {TIPS_COPY.updated}{" "}
                  <time dateTime={tip.updatedAt}>{formatTipDate(tip.updatedAt)}</time>
                </span>
              ) : null}
            </p>
          </header>
          <div className="mt-8 border-t border-line-soft pt-2">
            <TipMarkdown source={tip.body} />
          </div>
        </article>

        {related.length > 0 ? (
          <section
            aria-labelledby="related-experiences-title"
            className="mx-auto mt-12 max-w-[760px] rounded-2xl bg-panel p-5 md:p-6"
          >
            <h2
              id="related-experiences-title"
              className="font-display text-xl font-bold tracking-[-0.02em]"
            >
              {TIPS_COPY.relatedHeading}
            </h2>
            <ul className="mt-4 flex flex-col gap-2">
              {related.map((activity) => (
                <li key={activity.id}>
                  <Link
                    href={`/${TIPS_LOCALE}/activities/${activity.id}`}
                    className="block rounded-xl border border-line-soft bg-canvas-soft px-4 py-3 transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
                  >
                    <span className="font-semibold text-ink">
                      {activity.title ?? TIPS_COPY.relatedFallback}
                    </span>
                    {activity.meetingPointName ? (
                      <span className="mt-0.5 block text-sm text-muted">
                        {activity.meetingPointName}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mx-auto mt-10 max-w-[760px]">
          <Link
            href={`/${TIPS_LOCALE}${tipsIndexPath()}`}
            className="inline-flex min-h-11 items-center font-semibold text-primary underline decoration-primary/35 underline-offset-4 hover:text-primary-hover"
          >
            {TIPS_COPY.allTips}
          </Link>
        </p>
      </PageContainer>
    </main>
  );
}
