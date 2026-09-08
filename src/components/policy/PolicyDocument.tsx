import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Locale } from "@/i18n/routing";
import { resolvePolicyDocumentHref } from "@/lib/policy-routes";

interface PolicyDocumentProps {
  readonly locale: Locale;
  readonly source: string;
  /** 모바일에서 표가 가로로 넘칠 때 보여 줄 안내 문구. 없으면 힌트를 그리지 않는다. */
  readonly tableScrollHint?: string;
}

function getHeadingId(children: React.ReactNode) {
  const text = Array.isArray(children) ? children.join("") : String(children);
  return text
    .trim()
    .toLowerCase()
    .replace(/[\[\]]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function PolicyDocument({ locale, source, tableScrollHint }: PolicyDocumentProps) {
  return (
    <article className="min-w-0 text-sm leading-6 text-ink md:text-[15px] md:leading-7">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="mt-8 font-display text-lg font-bold tracking-[-0.02em] text-ink first:mt-0 md:mt-10 md:text-xl">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              id={getHeadingId(children)}
              className="mt-7 scroll-mt-24 font-display text-base font-bold text-ink md:text-lg"
            >
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mt-3 text-ink/85">{children}</p>,
          ol: ({ children }) => (
            <ol className="mt-3 ml-5 list-decimal space-y-1.5 marker:font-semibold marker:text-primary-strong">
              {children}
            </ol>
          ),
          ul: ({ children }) => (
            <ul className="mt-3 ml-5 list-disc space-y-1.5 marker:text-primary">{children}</ul>
          ),
          li: ({ children }) => <li className="pl-1 text-ink/85">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="mt-4 rounded-r-xl border-l-4 border-primary bg-primary-soft px-4 py-1 text-ink/80">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="relative mt-4">
              {tableScrollHint ? (
                <p className="mb-1.5 text-xs text-muted md:hidden">{tableScrollHint}</p>
              ) : null}
              <div className="overflow-x-auto rounded-xl border border-line-soft">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm leading-6">
                  {children}
                </table>
              </div>
              {tableScrollHint ? (
                <span
                  aria-hidden="true"
                  data-testid="table-edge-fade"
                  className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-xl bg-gradient-to-l from-white to-transparent md:hidden"
                />
              ) : null}
            </div>
          ),
          thead: ({ children }) => <thead className="bg-panel text-ink">{children}</thead>,
          th: ({ children }) => (
            <th className="border-b border-line-soft px-3 py-2.5 font-semibold whitespace-normal">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-t border-line-soft px-3 py-2.5 align-top whitespace-normal text-ink/80 first:border-l-0">
              {children}
            </td>
          ),
          strong: ({ children }) => <strong className="font-bold text-ink">{children}</strong>,
          code: ({ children }) => (
            <code className="rounded bg-panel px-1.5 py-0.5 text-[0.9em] text-primary-strong">
              {children}
            </code>
          ),
          a: ({ href = "", children }) => {
            const resolvedHref = resolvePolicyDocumentHref(locale, href);
            if (resolvedHref.startsWith("mailto:")) {
              return <span className="font-normal text-ink">{children}</span>;
            }
            const external = /^https?:/.test(resolvedHref);
            return (
              <Link
                href={resolvedHref}
                className="font-semibold text-primary underline decoration-primary/35 underline-offset-4 hover:text-primary-hover"
                {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {children}
              </Link>
            );
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </article>
  );
}
