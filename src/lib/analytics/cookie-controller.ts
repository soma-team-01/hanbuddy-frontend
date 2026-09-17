import type { AnalyticsBrowserPort } from "./controller";
import type { CookieConsent } from "./cookie-consent";
import { eventFields, pageFields, safePage, type FunnelEvent, type SafePage } from "./events";
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
      this.visit(pathname);
      if (!allowed() || !page) return false;
      const fields = eventFields(name, page, activityId, policy.origin),
        key = `${name}:${activityId}`;
      if (!fields || (name !== "booking_cta_click" && seen.has(key))) return false;
      try {
        browser.send(name, fields);
        if (name !== "booking_cta_click") seen.add(key);
        return true;
      } catch {
        stop();
        return false;
      }
    },
    suspend: () => {
      action++;
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
