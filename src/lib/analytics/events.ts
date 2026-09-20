export type FunnelEvent = "view_item" | "booking_cta_click" | "begin_checkout";
export type MeasurementEvent =
  | FunnelEvent
  | "view_item_list"
  | "select_item"
  | "sign_up"
  | "section_view"
  | "landing_cta_click"
  | "inquiry_click";
export type AnalyticsEvent = "page_view" | MeasurementEvent;
export type AnalyticsItemId = number | string;

export interface SafePage {
  key: string;
  path: string;
  title: string;
  locale: string;
  activityId?: number;
}

export interface AnalyticsFields {
  page_location: string;
  page_referrer: "";
  page_title: string;
  items?: { item_id: string; index?: number }[];
  item_list_id?: string;
  item_list_name?: string;
  method?: "google";
  section_id?: string;
  position?: number;
  page_type?: "landing";
  locale?: string;
  cta_id?: string;
  destination_type?: string;
  channel?: string;
  placement?: string;
}

export const EXPLORE_LIST = {
  itemListId: "explore_activities",
  itemListName: "Explore activities",
} as const;

const LOCALES = ["en", "ko", "ja", "zh-Hans", "zh-Hant"] as const;
const SECTION_POSITIONS = {
  hero: 1,
  recommended_experiences: 2,
  booking_steps: 3,
  guest_reviews: 4,
  contact: 5,
} as const;
const CTA_CONTRACTS = {
  hero_explore: { sectionId: "hero", position: 1, destinations: ["explore"] },
  booking_start: { sectionId: "booking_steps", position: 3, destinations: ["explore", "login"] },
} as const;
const INQUIRY_CHANNELS = ["email", "whatsapp", "facebook", "kakao", "instagram"] as const;
const INQUIRY_PLACEMENTS = ["landing_contact", "site_footer", "payment_inquiry"] as const;

/** Never copy pathname segments, titles, query strings or referrers into provider fields. */
export function safePage(pathname: string): SafePage | null {
  const match = /^\/(en|ko|ja|zh-Hans|zh-Hant)(\/.*)?$/.exec(pathname);
  if (!match) return null;
  const locale = match[1];
  const path = match[2] || "/";
  const pages: Record<string, [string, string]> = {
    "/": ["/", "HanBuddy"],
    "/explore": ["/explore", "Explore"],
    "/login": ["/login", "Login"],
    "/onboarding": ["/onboarding", "Signup"],
    "/buddy/onboarding": ["/buddy/onboarding", "Buddy signup"],
    "/applications": ["/applications", "Applications"],
  };
  if (Object.hasOwn(pages, path))
    return { key: pathname, path: pages[path][0], title: pages[path][1], locale };
  const activity = /^\/activities\/([1-9]\d*)(\/book)?$/.exec(path);
  if (!activity || !Number.isSafeInteger(Number(activity[1]))) return null;
  return {
    key: pathname,
    path: activity[2] ? "/activities/booking" : "/activities/detail",
    title: activity[2] ? "Booking" : "Activity",
    locale,
    activityId: Number(activity[1]),
  };
}

export function pageFields(page: SafePage, origin: string): AnalyticsFields {
  return { page_location: origin + page.path, page_referrer: "", page_title: page.title };
}

const positiveId = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const safeItemId = (value: unknown): value is AnalyticsItemId =>
  positiveId(value) || (typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value));
const exactList = (input: Record<string, unknown>) =>
  input.itemListId === EXPLORE_LIST.itemListId && input.itemListName === EXPLORE_LIST.itemListName;
const validLocale = (value: unknown, page: SafePage): value is string =>
  typeof value === "string" &&
  (LOCALES as readonly string[]).includes(value) &&
  value === page.locale;

function funnelFields(
  name: FunnelEvent,
  page: SafePage,
  input: number | Record<string, unknown>,
  base: AnalyticsFields,
): AnalyticsFields | null {
  if (!positiveId(input)) return null;
  if (name === "begin_checkout") {
    const eligible =
      (page.path === "/activities/booking" && page.activityId === input) ||
      page.path === "/applications";
    return eligible ? { ...base, items: [{ item_id: String(input) }] } : null;
  }
  const eligible = page.path === "/activities/detail" && page.activityId === input;
  return eligible ? { ...base, items: [{ item_id: String(input) }] } : null;
}

function listFields(
  page: SafePage,
  input: Record<string, unknown>,
  base: AnalyticsFields,
): AnalyticsFields | null {
  if (page.path !== "/explore" || !exactList(input) || !Array.isArray(input.itemIds)) return null;
  if (!input.itemIds.every(safeItemId)) return null;
  return {
    ...base,
    item_list_id: EXPLORE_LIST.itemListId,
    item_list_name: EXPLORE_LIST.itemListName,
    items: input.itemIds.map((itemId, index) => ({ item_id: String(itemId), index: index + 1 })),
  };
}

function selectionFields(
  page: SafePage,
  input: Record<string, unknown>,
  base: AnalyticsFields,
): AnalyticsFields | null {
  if (
    page.path !== "/explore" ||
    !exactList(input) ||
    !safeItemId(input.itemId) ||
    !positiveId(input.index)
  )
    return null;
  return {
    ...base,
    item_list_id: EXPLORE_LIST.itemListId,
    item_list_name: EXPLORE_LIST.itemListName,
    items: [{ item_id: String(input.itemId), index: input.index }],
  };
}

function signupFields(
  page: SafePage,
  input: Record<string, unknown>,
  base: AnalyticsFields,
): AnalyticsFields | null {
  return page.path.endsWith("/onboarding") && input.method === "google"
    ? { ...base, method: "google" }
    : null;
}

function sectionFields(
  page: SafePage,
  input: Record<string, unknown>,
  base: AnalyticsFields,
): AnalyticsFields | null {
  const expected = SECTION_POSITIONS[input.sectionId as keyof typeof SECTION_POSITIONS];
  if (
    page.path !== "/" ||
    expected === undefined ||
    input.position !== expected ||
    input.pageType !== "landing" ||
    !validLocale(input.locale, page)
  )
    return null;
  return {
    ...base,
    section_id: input.sectionId as string,
    position: expected,
    page_type: "landing",
    locale: input.locale,
  };
}

function landingCtaFields(
  page: SafePage,
  input: Record<string, unknown>,
  base: AnalyticsFields,
): AnalyticsFields | null {
  const contract = CTA_CONTRACTS[input.ctaId as keyof typeof CTA_CONTRACTS];
  if (
    page.path !== "/" ||
    !contract ||
    input.sectionId !== contract.sectionId ||
    input.position !== contract.position ||
    !(contract.destinations as readonly unknown[]).includes(input.destinationType) ||
    !validLocale(input.locale, page)
  )
    return null;
  return {
    ...base,
    cta_id: input.ctaId as string,
    section_id: contract.sectionId,
    position: contract.position,
    destination_type: input.destinationType as string,
    locale: input.locale,
  };
}

function inquiryFields(
  page: SafePage,
  input: Record<string, unknown>,
  base: AnalyticsFields,
): AnalyticsFields | null {
  if (
    !(INQUIRY_CHANNELS as readonly unknown[]).includes(input.channel) ||
    !(INQUIRY_PLACEMENTS as readonly unknown[]).includes(input.placement) ||
    !validLocale(input.locale, page)
  )
    return null;
  return {
    ...base,
    channel: input.channel as string,
    placement: input.placement as string,
    locale: input.locale,
  };
}

export function eventFields(
  name: MeasurementEvent,
  page: SafePage,
  input: number | Record<string, unknown>,
  origin: string,
): AnalyticsFields | null {
  const base = pageFields(page, origin);
  if (name === "view_item" || name === "booking_cta_click" || name === "begin_checkout") {
    return funnelFields(name, page, input, base);
  }
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;

  switch (name) {
    case "view_item_list":
      return listFields(page, input, base);
    case "select_item":
      return selectionFields(page, input, base);
    case "sign_up":
      return signupFields(page, input, base);
    case "section_view":
      return sectionFields(page, input, base);
    case "landing_cta_click":
      return landingCtaFields(page, input, base);
    case "inquiry_click":
      return inquiryFields(page, input, base);
  }
}
