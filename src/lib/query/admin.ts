import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import {
  getAdminAuditLogs,
  getAdminBuddies,
  getAdminBuddy,
  getAdminBuddyPerformance,
  getAdminUser,
  getAdminUserHistory,
  getAdminUsers,
  getBuddyApplicationForAdmin,
  getBuddyApplicationsForAdmin,
} from "@/lib/api/admin";
import type { AdminBuddyFilters, AdminUserFilters, AdminUserHistoryType } from "@/types/admin";
import { unwrapApiResult } from "./result";

export const adminKeys = {
  all: ["admin"] as const,
  applications: ["admin", "buddy-applications"] as const,
  application: (userId: number | string) =>
    ["admin", "buddy-applications", String(userId)] as const,
  users: (filters: AdminUserFilters) => ["admin", "users", filters] as const,
  user: (userId: number | string) => ["admin", "users", String(userId)] as const,
  userHistory: (userId: number | string, type: AdminUserHistoryType, page: number) =>
    ["admin", "users", String(userId), type, page] as const,
  buddies: (filters: AdminBuddyFilters) => ["admin", "buddies", filters] as const,
  buddy: (buddyId: number | string) => ["admin", "buddies", String(buddyId)] as const,
  buddyPerformance: (buddyId: number | string) =>
    ["admin", "buddies", String(buddyId), "performance"] as const,
  auditLogs: (targetId: number | string, page: number) =>
    ["admin", "audit-logs", "USER", String(targetId), page] as const,
};

export function adminBuddyApplicationsQueryOptions() {
  return queryOptions({
    queryKey: adminKeys.applications,
    queryFn: async () => unwrapApiResult(await getBuddyApplicationsForAdmin(), "applications"),
  });
}

export function adminBuddyApplicationQueryOptions(userId: number | string) {
  return queryOptions({
    queryKey: adminKeys.application(userId),
    queryFn: async () => unwrapApiResult(await getBuddyApplicationForAdmin(userId), "application"),
  });
}

export function adminUsersQueryOptions(filters: AdminUserFilters) {
  return queryOptions({
    queryKey: adminKeys.users(filters),
    queryFn: async () => unwrapApiResult(await getAdminUsers(filters), "users"),
    placeholderData: keepPreviousData,
  });
}

export function adminUserQueryOptions(userId: number | string) {
  return queryOptions({
    queryKey: adminKeys.user(userId),
    queryFn: async () => unwrapApiResult(await getAdminUser(userId), "user"),
  });
}

export function adminUserHistoryQueryOptions(
  userId: number | string,
  type: AdminUserHistoryType,
  page: number,
) {
  return queryOptions({
    queryKey: adminKeys.userHistory(userId, type, page),
    queryFn: async () => unwrapApiResult(await getAdminUserHistory(userId, type, page), "history"),
  });
}

export function adminBuddiesQueryOptions(filters: AdminBuddyFilters) {
  return queryOptions({
    queryKey: adminKeys.buddies(filters),
    queryFn: async () => unwrapApiResult(await getAdminBuddies(filters), "buddies"),
    placeholderData: keepPreviousData,
  });
}

export function adminBuddyQueryOptions(buddyId: number | string) {
  return queryOptions({
    queryKey: adminKeys.buddy(buddyId),
    queryFn: async () => unwrapApiResult(await getAdminBuddy(buddyId), "buddy"),
  });
}

export function adminBuddyPerformanceQueryOptions(buddyId: number | string) {
  return queryOptions({
    queryKey: adminKeys.buddyPerformance(buddyId),
    queryFn: async () => unwrapApiResult(await getAdminBuddyPerformance(buddyId), "performance"),
  });
}

export function adminAuditLogsQueryOptions(targetId: number | string, page = 0) {
  return queryOptions({
    queryKey: adminKeys.auditLogs(targetId, page),
    queryFn: async () => unwrapApiResult(await getAdminAuditLogs(targetId, page), "auditLogs"),
    placeholderData: keepPreviousData,
  });
}
