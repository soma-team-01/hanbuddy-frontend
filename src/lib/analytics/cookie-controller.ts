import type { AnalyticsBrowserPort } from "./controller";
import type { CookieConsent } from "./cookie-consent";
import {
  eventFields,
  EXPLORE_LIST,
  pageFields,
  safePage,
  type AnalyticsItemId,
  type FunnelEvent,
  type MeasurementEvent,
  type SafePage,
} from "./events";
import type { AnalyticsPolicy } from "./policy";

/** Browser events need verified browser consent, never an application or GA identifier lookup. */
export function createCookieAnalytics({
  policy,
  consent,
  browser,
}: {
  policy: AnalyticsPolicy;
  consent: CookieConsent;
  browser: AnalyticsBrowserPort;
}) {
  let page: SafePage | null = null,
    active = false,
    generation = 0,
    action = 0,
    revision = 0,
    pageSent = false;
  const seen = new Set<string>(),
    listeners = new Set<() => void>();
  const notify = () => {
    revision++;
    listeners.forEach((f) => f());
  };
  const stop = (reset = false) => {
    generation++;
    active = false;
    browser.stop(reset);
  };
  const allowed = () => active && consent.isGranted();
  const sendPage = () => {
    if (!allowed() || !page || pageSent) return;
    try {
      browser.send("page_view", pageFields(page, policy.origin));
      pageSent = true;
    } catch {
      stop();
    }
  };
  const unsubscribe = consent.subscribe(() => {
    if (!consent.isGranted()) stop(!consent.hasGrantCookie());
    notify();
  });
  async function start(epoch: number) {
    if (epoch !== generation || !consent.isGranted() || !page || active) return;
    const proof = consent.getProof();
    try {
      await browser.start(policy, pageFields(page, policy.origin));
      if (epoch !== generation || !consent.isGranted() || proof !== consent.getProof() || !page)
        return;
      active = true;
      sendPage();
      notify();
    } catch {
      if (epoch === generation) stop();
    }
  }
  function emit(
    name: MeasurementEvent,
    pathname: string,
    input: number | Record<string, unknown>,
    key: string,
    repeatable = false,
  ) {
    controller.visit(pathname);
    if (!allowed() || !page || (!repeatable && seen.has(key))) return false;
    const fields = eventFields(name, page, input, policy.origin);
    if (!fields) return false;
    try {
      browser.send(name, fields);
      if (!repeatable) seen.add(key);
      return true;
    } catch {
      stop();
      return false;
    }
  }
  const controller = {
    enabled: consent.enabled,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getRevision: () => revision,
    getSnapshot: () => consent.getSnapshot(),
    isWithdrawalPending: () => consent.isWithdrawalPending(),
    isActive: allowed,
    async accept() {
      const token = ++action;
      await consent.accept();
      if (token === action) await start(generation);
    },
    async restore() {
      const token = ++action;
      await consent.restore();
      if (token === action) await start(generation);
    },
    async reject() {
      action++;
      stop(true);
      await consent.reject();
    },
    visit(pathname: string) {
      const next = safePage(pathname);
      if (next?.key !== page?.key) {
        seen.clear();
        pageSent = false;
      }
      page = next;
      if (!page) {
        stop();
        return;
      }
      sendPage();
    },
    track(name: FunnelEvent, pathname: string, activityId: number) {
      return emit(
        name,
        pathname,
        activityId,
        `${name}:${activityId}`,
        name === "booking_cta_click",
      );
    },
    trackList(pathname: string, itemIds: AnalyticsItemId[], version: string) {
      return emit(
        "view_item_list",
        pathname,
        { ...EXPLORE_LIST, itemIds },
        `view_item_list:${version}`,
      );
    },
    trackSelection(pathname: string, itemId: AnalyticsItemId, index: number) {
      return emit(
        "select_item",
        pathname,
        { ...EXPLORE_LIST, itemId, index },
        `select_item:${itemId}:${index}`,
        true,
      );
    },
    trackSignup(pathname: string, method: "google") {
      const signupPage = safePage(pathname);
      const key = `sign_up:${method}`;
      if (!allowed() || !signupPage || seen.has(key)) return false;
      const fields = eventFields("sign_up", signupPage, { method }, policy.origin);
      if (!fields) return false;
      try {
        browser.send("sign_up", fields);
        seen.add(key);
        return true;
      } catch {
        stop();
        return false;
      }
    },
    trackSection(pathname: string, input: { sectionId: string; position: number; locale: string }) {
      return emit(
        "section_view",
        pathname,
        { ...input, pageType: "landing" },
        `section_view:${input.sectionId}`,
      );
    },
    trackLandingCta(
      pathname: string,
      input: {
        ctaId: string;
        sectionId: string;
        position: number;
        destinationType: string;
        locale: string;
      },
    ) {
      return emit("landing_cta_click", pathname, input, `landing_cta_click:${input.ctaId}`, true);
    },
    trackInquiry(pathname: string, input: { channel: string; placement: string; locale: string }) {
      return emit(
        "inquiry_click",
        pathname,
        input,
        `inquiry_click:${input.placement}:${input.channel}`,
        true,
      );
    },
    suspend: () => {
      action++;
      consent.invalidate();
      stop(false);
    },
    dispose() {
      action++;
      stop();
      unsubscribe();
      consent.dispose();
      listeners.clear();
    },
  };
  return controller;
}
