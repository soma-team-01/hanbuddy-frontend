import { ChevronRightIcon } from "@/components/ui/icons";
import { Link } from "@/i18n/navigation";
import type { BreadcrumbItem } from "@/lib/seo/json-ld";

const TONE_CLASS = {
  light: { list: "text-muted", link: "hover:text-primary", current: "text-ink" },
  dark: { list: "text-white/65", link: "hover:text-white", current: "text-white/90" },
} as const;

/**
 * 페이지 위치(메인 > About). 같은 항목으로 BreadcrumbList 구조화 데이터를 만들어,
 * 검색엔진이 화면에 보이는 경로와 구조화 데이터를 함께 확인할 수 있게 한다.
 */
export function Breadcrumbs({
  items,
  tone = "light",
  className = "",
}: Readonly<{
  items: readonly BreadcrumbItem[];
  tone?: keyof typeof TONE_CLASS;
  className?: string;
}>) {
  const style = TONE_CLASS[tone];
  return (
    <nav className={className}>
      <ol className={`flex min-w-0 items-center gap-1 text-xs font-medium ${style.list}`}>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li
              key={item.path}
              className={`flex items-center gap-1 ${last ? "min-w-0" : "shrink-0"}`}
            >
              {index > 0 ? (
                <ChevronRightIcon aria-hidden className="size-3.5 shrink-0 opacity-70" />
              ) : null}
              {last ? (
                <span aria-current="page" className={`truncate ${style.current}`}>
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.path || "/"}
                  className={`inline-flex min-h-8 items-center rounded-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong ${style.link}`}
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
