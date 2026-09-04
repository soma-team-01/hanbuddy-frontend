import { SiteHeader } from "@/components/layout/SiteHeader";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      <SiteHeader role="admin" authenticated />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
