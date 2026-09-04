import type { NextRequest } from "next/server";
import { badRequestResponse } from "@/app/api/_utils/authenticated-backend";

const ID_PATTERN = /^\d+$/;

export function getAdminResourceId(value: string | undefined, label: string) {
  return value && ID_PATTERN.test(value)
    ? { ok: true as const, id: value }
    : { ok: false as const, response: badRequestResponse(`올바른 ${label} ID가 필요합니다.`) };
}

export function getAllowedAdminQuery(request: NextRequest, allowedKeys: ReadonlySet<string>) {
  const params = new URLSearchParams();
  request.nextUrl.searchParams.forEach((value, key) => {
    const trimmed = value.trim();
    if (allowedKeys.has(key) && trimmed) params.set(key, trimmed);
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}
