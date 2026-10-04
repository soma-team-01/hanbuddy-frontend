import { PageContainer } from "@/components/layout/PageContainer";
import { Link } from "@/i18n/navigation";

interface ClosingCtaProps {
  readonly title: string;
  readonly description: string;
  readonly button: string;
  /** About에서는 예약 전 질문을 /faq로 보내는 링크를 함께 둔다. FAQ 페이지에서는 뺀다. */
  readonly faqLinkLabel?: string;
}

// About과 FAQ 페이지 끝에 공통으로 두는 "활동 둘러보기" 맺음 섹션.
export function ClosingCta({ title, description, button, faqLinkLabel }: ClosingCtaProps) {
  return (
    <section aria-labelledby="closing-cta-title" className="bg-canvas-soft pt-14 pb-16 md:pb-20">
      <PageContainer>
        <div className="rounded-[2rem] border border-line-soft bg-canvas px-6 py-12 text-center shadow-[0_16px_36px_rgba(61,45,43,0.05)] sm:px-12 md:py-14">
          <h2
            id="closing-cta-title"
            className="font-display text-2xl leading-tight font-extrabold tracking-[-0.04em] text-ink sm:text-4xl"
          >
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            {description}
          </p>
          <Link
            href="/explore"
            className="motion-press mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-7 font-display text-sm font-bold text-on-primary shadow-[0_12px_24px_rgba(209,63,50,0.2)] transition-colors hover:bg-primary-hover"
          >
            {button}
            <span aria-hidden className="ml-3 text-lg leading-none">
              →
            </span>
          </Link>
          {faqLinkLabel ? (
            <p className="mt-6">
              <Link
                href="/faq"
                className="group inline-flex min-h-11 items-center gap-2 text-sm font-bold text-primary-strong transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
              >
                <span className="underline decoration-line-strong underline-offset-4 group-hover:decoration-primary">
                  {faqLinkLabel}
                </span>
                <span aria-hidden>→</span>
              </Link>
            </p>
          ) : null}
        </div>
      </PageContainer>
    </section>
  );
}
