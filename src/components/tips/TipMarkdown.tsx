import Link from "next/link";
import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { APP_ORIGIN } from "@/lib/site";

// 정책 문서(PolicyDocument)와 같은 react-markdown + remark-gfm 조합이다. 정책 문서는 ./ 링크 치환과
// 이메일 숨김처럼 정책에만 맞는 처리가 있어, 정보 글용 스타일은 따로 둔다.

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (node && typeof node === "object" && "props" in node) {
    return textOf((node as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

function headingId(children: ReactNode) {
  return textOf(children)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const HEADING_CLASS = "scroll-mt-24 font-display font-bold tracking-[-0.02em] text-ink";

// 렌더할 때마다 새 컴포넌트를 만들지 않도록 모듈 수준에 둔다.
const TIP_COMPONENTS: Components = {
  // 페이지 제목(h1)은 머리말의 title로 따로 그린다. 본문에 h1이 있어도 문서에 h1이 둘이 되지 않게 낮춘다.
  h1: ({ children }) => (
    <h2 id={headingId(children)} className={`${HEADING_CLASS} mt-10 text-2xl first:mt-0`}>
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h2 id={headingId(children)} className={`${HEADING_CLASS} mt-10 text-2xl first:mt-0`}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 id={headingId(children)} className={`${HEADING_CLASS} mt-8 text-xl`}>
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 id={headingId(children)} className={`${HEADING_CLASS} mt-6 text-lg`}>
      {children}
    </h4>
  ),
  p: ({ children }) => <p className="mt-4 text-ink/85">{children}</p>,
  ol: ({ children }) => (
    <ol className="mt-4 ml-6 list-decimal space-y-2 marker:font-semibold marker:text-primary-strong">
      {children}
    </ol>
  ),
  ul: ({ children }) => (
    <ul className="mt-4 ml-6 list-disc space-y-2 marker:text-primary">{children}</ul>
  ),
  li: ({ children }) => <li className="pl-1 text-ink/85">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mt-5 rounded-r-xl border-l-4 border-primary bg-primary-soft px-4 py-1 text-ink/80">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="mt-5 overflow-x-auto rounded-xl border border-line-soft">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm leading-6">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-panel text-ink">{children}</thead>,
  th: ({ children }) => (
    <th className="border-b border-line-soft px-3 py-2.5 font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-t border-line-soft px-3 py-2.5 align-top text-ink/80">{children}</td>
  ),
  strong: ({ children }) => <strong className="font-bold text-ink">{children}</strong>,
  code: ({ children }) => (
    <code className="rounded bg-panel px-1.5 py-0.5 text-[0.9em] text-primary-strong">
      {children}
    </code>
  ),
  hr: () => <hr className="my-8 border-line-soft" />,
  a: ({ href = "", children }) => {
    const external = /^https?:/.test(href) && !href.startsWith(APP_ORIGIN);
    return (
      <Link
        href={href}
        className="font-semibold text-primary underline decoration-primary/35 underline-offset-4 hover:text-primary-hover"
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </Link>
    );
  },
};

export function TipMarkdown({ source }: Readonly<{ source: string }>) {
  return (
    <div className="min-w-0 text-base leading-7 text-ink [&_img]:h-auto [&_img]:max-w-full">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={TIP_COMPONENTS}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
