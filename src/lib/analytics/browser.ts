import type { AnalyticsBrowserPort } from "./controller";
import { validEventSourceUrl, validFbc, validFbp, validIdentifiers, validSessionId } from "./link";
import type { AnalyticsPolicy } from "./policy";
import { createMetaBrowser } from "./meta-browser";

type GoogleWindow = Window & { dataLayer?: IArguments[]; gtag?: (...args: unknown[]) => void };
const deniedAds = { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" };

/** Instantiation is inert. Only the consent controller may start this transport. */
export function createGoogleBrowser(
  target: Window,
  document: Document,
  measurementId: string | null = null,
): AnalyticsBrowserPort {
  const google = target as GoogleWindow;
  let id = measurementId;
  let ready = false;
  let generation = 0;
  let script: HTMLScriptElement | null = null;
  let cancelLoad: (() => void) | null = null;
  const pendingGets = new Set<() => void>();
  const setEnabled = (enabled: boolean) => {
    if (id) (target as unknown as Record<string, unknown>)[`ga-disable-${id}`] = !enabled;
  };
  return {
    async start(policy, page) {
      if (target.location.origin !== policy.origin) throw new Error("Analytics origin disabled");
      if (!policy.measurementId) throw new Error("Analytics unavailable");
      id = policy.measurementId;
      const epoch = ++generation;
      google.dataLayer ??= [];
      google.gtag ??= function () {
        // Match Google's documented gtag command envelope, not a plain array.
        // eslint-disable-next-line prefer-rest-params
        google.dataLayer!.push(arguments);
      };
      setEnabled(false);
      google.gtag("consent", "default", { analytics_storage: "denied", ...deniedAds });
      google.gtag("set", "ads_data_redaction", true);
      google.gtag("set", page);
      google.gtag("consent", "update", { analytics_storage: "granted", ...deniedAds });
      google.gtag("js", new Date());
      google.gtag("config", id, {
        ...page,
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
      setEnabled(true);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => fail(), 10000);
        const fail = () => {
          clearTimeout(timer);
          reject(new Error("Analytics unavailable"));
        };
        cancelLoad = fail;
        script = document.createElement("script");
        script.dataset.hanbuddyAnalytics = "true";
        script.async = true;
        script.referrerPolicy = "no-referrer";
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id!)}`;
        script.onload = () => {
          clearTimeout(timer);
          if (epoch !== generation) {
            fail();
            return;
          }
          cancelLoad = null;
          ready = true;
          resolve();
        };
        script.onerror = fail;
        document.head.appendChild(script);
      });
    },
    send(name, params) {
      if (!ready) return;
      google.gtag?.("set", {
        page_location: params.page_location,
        page_referrer: "",
        page_title: params.page_title,
      });
      google.gtag?.("event", name, params);
    },
    async identifiers() {
      if (!ready || !id) throw new Error("Analytics unavailable");
      const epoch = generation;
      const get = (field: string) =>
        new Promise<string>((resolve, reject) => {
          const cancel = () => {
            clearTimeout(timer);
            pendingGets.delete(cancel);
            reject(new Error("Analytics unavailable"));
          };
          const timer = setTimeout(cancel, 3000);
          pendingGets.add(cancel);
          google.gtag?.("get", id, field, (value: unknown) => {
            clearTimeout(timer);
            pendingGets.delete(cancel);
            if (
              !ready ||
              epoch !== generation ||
              (typeof value !== "string" && typeof value !== "number")
            ) {
              reject(new Error("Analytics unavailable"));
              return;
            }
            resolve(String(value));
          });
        });
      const [clientId, sessionId] = await Promise.all([
        get("client_id"),
        get("session_id").catch(() => undefined),
      ]);
      if (!ready || epoch !== generation) throw new Error("Analytics unavailable");
      const ids = { clientId, ...(sessionId && validSessionId(sessionId) ? { sessionId } : {}) };
      if (!validIdentifiers(ids)) throw new Error("Analytics unavailable");
      return ids;
    },
    stop(resetIdentity = false) {
      generation++;
      ready = false;
      setEnabled(false);
      cancelLoad?.();
      cancelLoad = null;
      pendingGets.forEach((cancel) => cancel());
      if (script) {
        script.onload = null;
        script.onerror = null;
        script.remove();
        script = null;
      }
      // Discard unprocessed consented events before notifying an already-loaded tag of denial.
      if (google.dataLayer) google.dataLayer.length = 0;
      google.gtag?.("consent", "update", { analytics_storage: "denied", ...deniedAds });
      if (!id || !resetIdentity) return;
      const names = document.cookie
        .split(";")
        .map((part) => part.trim().split("=")[0])
        .filter((name) => name === "_ga" || name === `_ga_${id!.slice(2)}`);
      const host = target.location.hostname;
      const parts = host?.split(".") ?? [];
      const domains = ["", ...parts.map((_, index) => `; Domain=${parts.slice(index).join(".")}`)];
      for (const name of names)
        for (const domain of domains)
          document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${domain}`;
    },
  };
}

/** Runs only configured providers; a load failure in one does not disable the other. */
export function createMeasurementBrowser(
  target: Window,
  document: Document,
  policy: AnalyticsPolicy,
): AnalyticsBrowserPort {
  const google = policy.measurementId
    ? createGoogleBrowser(target, document, policy.measurementId)
    : null;
  const meta = policy.pixelId ? createMetaBrowser(target, document, policy.pixelId) : null;
  let active: AnalyticsBrowserPort[] = [];
  let pageLocation = "";
  const readCookie = (name: string) =>
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1);
  return {
    async start(nextPolicy, page) {
      active = [];
      pageLocation = page.page_location;
      const configured = [google, meta].filter(
        (provider): provider is AnalyticsBrowserPort => provider !== null,
      );
      const results = await Promise.allSettled(
        configured.map(async (provider) => {
          await provider.start(nextPolicy, page);
          active.push(provider);
        }),
      );
      results.forEach((result, index) => {
        if (result.status === "rejected") configured[index].stop(false);
      });
      if (!active.length) throw new Error("Analytics unavailable");
    },
    send(name, fields) {
      if (validEventSourceUrl(fields.page_location, policy.origin)) {
        pageLocation = fields.page_location;
      }
      active.forEach((provider) => provider.send(name, fields));
    },
    async identifiers() {
      if (!google || !active.includes(google)) throw new Error("Analytics unavailable");
      const ids = await google.identifiers();
      if (!meta || !active.includes(meta)) return ids;
      const fbp = readCookie("_fbp");
      const fbc = readCookie("_fbc");
      const attribution = {
        ...(fbp && validFbp(fbp) ? { fbp } : {}),
        ...(fbc && validFbc(fbc) ? { fbc } : {}),
      };
      return Object.keys(attribution).length && validEventSourceUrl(pageLocation, policy.origin)
        ? { ...ids, ...attribution, eventSourceUrl: pageLocation }
        : ids;
    },
    stop(resetIdentity = false) {
      google?.stop(resetIdentity);
      meta?.stop(resetIdentity);
      active = [];
    },
  };
}
