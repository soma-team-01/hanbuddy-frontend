import type { AnalyticsBrowserPort } from "./controller";
import { pageFields, safePage, type AnalyticsEvent, type AnalyticsFields } from "./events";

type MetaQueue = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  push?: MetaQueue;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
};
type MetaWindow = Window & { fbq?: MetaQueue; _fbq?: MetaQueue };
const META_PAGE_PATHS = new Set([
  "/",
  "/explore",
  "/onboarding",
  "/buddy/onboarding",
  "/applications",
  "/activities/detail",
  "/activities/booking",
]);

function isMetaPage(fields: AnalyticsFields, origin: string) {
  try {
    const url = new URL(fields.page_location);
    return (
      url.origin === origin &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      META_PAGE_PATHS.has(url.pathname)
    );
  } catch {
    return false;
  }
}

function isCurrentMetaPage(target: Window, fields: AnalyticsFields, origin: string) {
  if (target.location.origin !== origin || !isMetaPage(fields, origin)) return false;
  const livePage = safePage(target.location.pathname);
  return Boolean(livePage && pageFields(livePage, origin).page_location === fields.page_location);
}

const metaEvent = (name: AnalyticsEvent, fields: AnalyticsFields): [string, object?] | null => {
  if (name === "page_view") return ["PageView"];
  if (name === "sign_up") return ["CompleteRegistration"];
  if (name === "inquiry_click") return ["Contact"];
  if (name !== "view_item" && name !== "begin_checkout") return null;
  const contentIds = fields.items?.map((item) => item.item_id).filter(Boolean);
  if (!contentIds?.length) return null;
  return [
    name === "view_item" ? "ViewContent" : "InitiateCheckout",
    { content_ids: contentIds, content_type: "product" },
  ];
};

/** Inert Meta Pixel transport. It is constructed freely but starts only after verified consent. */
export function createMetaBrowser(
  target: Window,
  document: Document,
  initialPixelId: string | null = null,
): AnalyticsBrowserPort {
  const meta = target as MetaWindow;
  let pixelId = initialPixelId;
  let pixelOrigin = "";
  let ready = false;
  let generation = 0;
  let script: HTMLScriptElement | null = null;
  let cancelLoad: (() => void) | null = null;

  const command = (...args: unknown[]) => meta.fbq?.(...args);
  const clearCookies = () => {
    const names = document.cookie
      .split(";")
      .map((part) => part.trim().split("=")[0])
      .filter((name) => name === "_fbp" || name === "_fbc");
    const host = target.location.hostname;
    const parts = host?.split(".") ?? [];
    const domains = ["", ...parts.map((_, index) => `; Domain=${parts.slice(index).join(".")}`)];
    for (const name of names)
      for (const domain of domains)
        document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${domain}`;
  };

  return {
    async start(policy, page) {
      if (!policy.pixelId || !isCurrentMetaPage(target, page, policy.origin))
        throw new Error("Analytics origin disabled");
      pixelId = policy.pixelId;
      pixelOrigin = policy.origin;
      const epoch = ++generation;
      if (!meta.fbq) {
        const queue = function (...args: unknown[]) {
          if (queue.callMethod) queue.callMethod(...args);
          else queue.queue!.push(args);
        } as MetaQueue;
        queue.push = queue;
        queue.queue = [];
        queue.loaded = true;
        queue.version = "2.0";
        meta.fbq = queue;
        meta._fbq ??= queue;
      }
      command("consent", "grant");
      command("init", pixelId);
      await new Promise<void>((resolve, reject) => {
        const fail = () => {
          clearTimeout(timer);
          reject(new Error("Analytics unavailable"));
        };
        const timer = setTimeout(fail, 10000);
        cancelLoad = fail;
        script = document.createElement("script");
        script.dataset.hanbuddyMetaPixel = "true";
        script.async = true;
        script.referrerPolicy = "no-referrer";
        script.src = "https://connect.facebook.net/en_US/fbevents.js";
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
    send(name, fields) {
      if (!ready || !isCurrentMetaPage(target, fields, pixelOrigin)) return;
      const mapped = metaEvent(name, fields);
      if (!mapped) return;
      const [event, params] = mapped;
      if (params) command("track", event, params);
      else command("track", event);
    },
    async identifiers() {
      throw new Error("Analytics unavailable");
    },
    stop(resetIdentity = false) {
      generation++;
      ready = false;
      cancelLoad?.();
      cancelLoad = null;
      if (script) {
        script.onload = null;
        script.onerror = null;
        script.remove();
        script = null;
      }
      if (meta.fbq?.queue) meta.fbq.queue.length = 0;
      command("consent", "revoke");
      if (resetIdentity) clearCookies();
    },
  };
}
