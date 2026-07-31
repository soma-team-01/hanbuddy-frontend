import type { ReactNode } from "react";
import { BuddySidebar } from "./BuddySidebar";

export function BuddyShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="flex min-h-0 flex-1">
      <BuddySidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
