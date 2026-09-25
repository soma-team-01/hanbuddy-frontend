// 2026-09-14 이전 hanbuddy.kr 정적 랜딩(hanbuddy-landing)의 경로를 MVP 화면으로 넘긴다.
// 밋업·인스타·광고에 이미 뿌려진 링크가 404 대신 회차 상세나 홈에 닿게 하는 용도라
// 새 경로를 여기에 추가하지 않는다. 회차가 바뀌면 활동 id만 갱신한다.
const LEGACY_EVENT_ACTIVITY_PATHS: Record<string, string> = {
  "korea-football": "/activities/4",
  "kbo-jamsil": "/activities/2",
  "kbo-gocheok": "/activities/1",
};

const LEGACY_HOME_PATHS = new Set(["/apply", "/events", "/about"]);

type LegacyLandingTarget = { pathname: string; search: string };

export function resolveLegacyLandingPath(
  pathname: string,
  searchParams: URLSearchParams,
): LegacyLandingTarget | null {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const target = resolveTargetPathname(normalized, searchParams.get("event"));
  if (!target) return null;

  const forwarded = new URLSearchParams(searchParams);
  forwarded.delete("event");
  const query = forwarded.toString();
  return { pathname: target, search: query ? `?${query}` : "" };
}

function resolveTargetPathname(pathname: string, event: string | null): string | null {
  if (pathname === "/apply") {
    return (event && LEGACY_EVENT_ACTIVITY_PATHS[event]) || "/";
  }
  if (pathname.startsWith("/events/")) {
    return LEGACY_EVENT_ACTIVITY_PATHS[pathname.slice("/events/".length)] ?? "/";
  }
  return LEGACY_HOME_PATHS.has(pathname) ? "/" : null;
}
