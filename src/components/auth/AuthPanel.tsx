import type { ReactNode } from "react";

/** Shared visual frame only; reset-password keeps its separate, analytics-free document. */
export function AuthPanel({
  title,
  description,
  children,
}: Readonly<{ title: string; description?: string; children: ReactNode }>) {
  return (
    <section className="relative z-10 mx-auto w-full max-w-[440px] bg-canvas-soft px-2 py-2 md:rounded-3xl md:border md:border-line-soft md:p-8">
      <header className="mb-7 text-center">
        <h1 className="font-display text-[26px] leading-snug font-bold tracking-tight text-balance text-ink md:text-[28px]">
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
