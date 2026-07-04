import Link from "next/link";
import { ArrowLeftIcon, BellIcon } from "@/components/ui/icons";

interface TopAppBarProps {
  title?: string;
  /** 지정하면 왼쪽에 뒤로가기 버튼이 노출된다. */
  backHref?: string;
}

export function TopAppBar({ title = "HanBuddy", backHref }: TopAppBarProps) {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-line bg-cream px-4">
      {backHref ? (
        <Link
          href={backHref}
          aria-label="Go back"
          className="flex size-10 items-center justify-center rounded-full text-forest hover:bg-chip"
        >
          <ArrowLeftIcon className="size-5" />
        </Link>
      ) : (
        <span className="size-10" aria-hidden />
      )}
      <h1 className="font-display text-[28px] font-semibold tracking-tight text-forest">{title}</h1>
      <button
        type="button"
        aria-label="Notifications"
        className="flex size-10 items-center justify-center rounded-full text-forest hover:bg-chip"
      >
        <BellIcon className="size-5" />
      </button>
    </header>
  );
}
