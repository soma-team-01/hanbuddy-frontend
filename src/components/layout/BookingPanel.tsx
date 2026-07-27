export function BookingPanel({
  children,
  className = "",
}: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <aside
      data-testid="booking-panel"
      className={`rounded-2xl border border-line-soft bg-panel p-5 shadow-sm lg:sticky lg:top-24 lg:p-6 ${className}`}
    >
      {children}
    </aside>
  );
}
