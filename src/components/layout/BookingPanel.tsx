export function BookingPanel({
  children,
  className = "",
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <aside
      data-testid="booking-panel"
      className={`rounded-2xl border border-primary/30 bg-canvas-soft p-5 max-lg:contents lg:sticky lg:top-24 lg:p-6 ${className}`}
    >
      {children}
    </aside>
  );
}
