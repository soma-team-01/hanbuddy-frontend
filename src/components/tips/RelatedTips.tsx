import Link from "next/link";
import { TIPS_COPY } from "@/components/tips/tips-copy";
import { PageContainer } from "@/components/layout/PageContainer";
import { TIPS_LOCALE, tipPath, type TipMeta } from "@/lib/tips/tip";

// 활동 상세 아래에 붙는 관련 정보 글 목록. 활동 → 글 내부 링크를 만들어 검색엔진이 글을 찾게 한다.
// 정보 글은 영어로만 있어 영어 활동 페이지에서만 그린다(부르는 쪽에서 언어를 거른다).
export function RelatedTips({
  tips,
}: Readonly<{ tips: readonly Pick<TipMeta, "slug" | "title" | "description">[] }>) {
  if (tips.length === 0) return null;
  return (
    <PageContainer className="pt-2">
      <section aria-labelledby="related-tips-heading" className="mx-auto max-w-[840px]">
        <h2 id="related-tips-heading" className="font-display text-lg font-bold text-ink">
          {TIPS_COPY.relatedTipsHeading}
        </h2>
        <ul className="mt-3 space-y-2">
          {tips.map((tip) => (
            <li key={tip.slug}>
              <Link
                href={`/${TIPS_LOCALE}${tipPath(tip.slug)}`}
                className="block rounded-xl border border-line-soft px-4 py-3 transition-colors hover:border-primary-soft"
              >
                <span className="block font-semibold text-ink">{tip.title}</span>
                <span className="mt-1 block text-sm text-muted">{tip.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageContainer>
  );
}
