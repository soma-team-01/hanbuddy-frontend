export type FunnelEvent = "view_item" | "booking_cta_click" | "begin_checkout";
export type AnalyticsEvent = "page_view" | FunnelEvent;
export interface SafePage {
  key: string;
  path: string;
  title: string;
  activityId?: number;
}

/** Never copy pathname segments, titles, query strings or referrers into Google fields. */
export function safePage(pathname: string): SafePage | null {
  const match = /^\/(en|ko|ja|zh-Hans|zh-Hant)(\/.*)?$/.exec(pathname);
  if (!match) return null;
  const path = match[2] || "/";
  const pages: Record<string, [string, string]> = {
    "/": ["/", "HanBuddy"],
    "/explore": ["/explore", "Explore"],
    "/login": ["/login", "Login"],
    "/applications": ["/applications", "Applications"],
  };
  if (Object.hasOwn(pages, path))
    return { key: pathname, path: pages[path][0], title: pages[path][1] };
  const activity = /^\/activities\/([1-9]\d*)(\/book)?$/.exec(path);
  if (!activity || !Number.isSafeInteger(Number(activity[1]))) return null;
  return {
    key: pathname,
    path: activity[2] ? "/activities/booking" : "/activities/detail",
    title: activity[2] ? "Booking" : "Activity",
    activityId: Number(activity[1]),
  };
}

export function pageFields(page: SafePage, origin: string) {
  return { page_location: origin + page.path, page_referrer: "", page_title: page.title };
}

export function eventFields(name: FunnelEvent, page: SafePage, activityId: number, origin: string) {
  if (!Number.isSafeInteger(activityId) || activityId <= 0) return null;
  if (
    (name === "view_item" || name === "booking_cta_click") &&
    (page.path !== "/activities/detail" || page.activityId !== activityId)
  )
    return null;
  if (
    name === "begin_checkout" &&
    !(
      (page.path === "/activities/booking" && page.activityId === activityId) ||
      page.path === "/applications"
    )
  )
    return null;
  if (!["view_item", "booking_cta_click", "begin_checkout"].includes(name)) return null;
  return { ...pageFields(page, origin), items: [{ item_id: String(activityId) }] };
}
