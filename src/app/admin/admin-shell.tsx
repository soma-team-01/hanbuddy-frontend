import { AdminHeader } from "./admin-header";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      <AdminHeader />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
