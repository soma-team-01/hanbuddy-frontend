import { useTranslations } from "next-intl";

export function BookingPanel({
  children,
  className = "",
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  const t = useTranslations("Booking");
  return (
    <aside
      data-testid="booking-panel"
      className={`min-w-0 rounded-2xl border border-line-soft bg-canvas-soft p-4 lg:sticky lg:top-24 lg:border-primary/30 lg:p-6 ${className}`}
    >
      <h2 className="mb-4 text-sm font-semibold text-primary lg:hidden">
        {t("applicationSummary")}
      </h2>
      {children}
    </aside>
  );
}
