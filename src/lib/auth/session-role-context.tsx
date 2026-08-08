"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SiteNavRole } from "./routes";

const SessionRoleContext = createContext<SiteNavRole | null>(null);

export function SessionRoleProvider({
  role,
  children,
}: Readonly<{ role?: SiteNavRole | null; children: ReactNode }>) {
  return <SessionRoleContext.Provider value={role ?? null}>{children}</SessionRoleContext.Provider>;
}

export function useSessionRole() {
  return useContext(SessionRoleContext);
}
