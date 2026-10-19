import type { ReactNode } from "react";

/** Shared visual frame only; reset-password keeps its separate, analytics-free document. */
export function AuthPanel({
  title,
  eyebrow,
  description,
  children,
}: Readonly<{ title: string; eyebrow?: string; description?: string; children: ReactNode }>) {
  return (
    <section
      className={`relative z-10 mx-auto w-full max-w-[440px] bg-canvas-soft px-2 py-2 md:p-8 ${eyebrow ? "" : "md:rounded-3xl md:border md:border-line-soft"}`}
    >
      <header className="mb-7 text-center">
        {eyebrow && (
          <p className="mb-4 font-display text-[11px] font-bold tracking-[0.22em] text-primary uppercase">
            {eyebrow}
          </p>
        )}
        <h1
          className={`font-display text-balance text-ink ${eyebrow ? "text-[34px] leading-[1.15] font-extrabold tracking-[-0.04em] md:text-[38px]" : "text-[26px] leading-snug font-bold tracking-tight md:text-[28px]"}`}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-3 text-sm leading-6 text-pretty text-muted">{description}</p>
        )}
      </header>
      {children}
    </section>
  );
}
