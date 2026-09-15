"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { getLocaleOrDefault } from "@/i18n/routing";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CONSENT_KEY, createAnalytics, type AnalyticsController } from "@/lib/analytics/controller";
import type { FunnelEvent } from "@/lib/analytics/events";
import type { AnalyticsPolicy } from "@/lib/analytics/policy";
import { createGoogleBrowser } from "@/lib/analytics/browser";
import type { ConsentLinkPort } from "@/lib/analytics/link";
import { consentCopy } from "./consent-copy";

const Context = createContext<{
  controller: AnalyticsController | null;
  pathname: string;
  revision: number;
}>({ controller: null, pathname: "", revision: 0 });
const noopSubscribe = () => () => {};
const zero = () => 0;

export function AnalyticsProvider({
  children,
  policy,
  controller: suppliedController = null,
  link = null,
}: Readonly<{
  children: ReactNode;
  policy: AnalyticsPolicy | null;
  controller?: AnalyticsController | null;
  link?: ConsentLinkPort | null;
}>) {
  // No backend consent binding exists yet. Never turn an env flag into a fabricated endpoint.
  // The binding will construct a controller with createGoogleBrowser once its contract is verified.
  const [localController, setLocalController] = useState<{
    controller: AnalyticsController;
    policy: AnalyticsPolicy;
    link: ConsentLinkPort;
    live: () => boolean;
  } | null>(null);
  useEffect(() => {
    if (suppliedController || !policy || !link) return;
    let mounted = true;
    const next = createAnalytics({
      policy,
      link,
      browser: createGoogleBrowser(window, document, policy.measurementId),
      storage: {
        getItem: (key) => window.localStorage.getItem(key),
        setItem: (key, value) => window.localStorage.setItem(key, value),
        removeItem: (key) => window.localStorage.removeItem(key),
      },
    });
    queueMicrotask(() => {
      if (mounted) setLocalController({ controller: next, policy, link, live: () => mounted });
    });
    return () => {
      mounted = false;
      next.suspend();
    };
  }, [suppliedController, policy, link]);
  const controller =
    suppliedController ??
    (policy &&
    link &&
    localController?.policy === policy &&
    localController.link === link &&
    localController.live()
      ? localController.controller
      : null);
  const pathname = usePathname();
  const revision = useSyncExternalStore(
    controller?.subscribe ?? noopSubscribe,
    controller?.getRevision ?? zero,
    zero,
  );
  useEffect(() => {
    if (!controller) return;
    controller.visit(pathname);
    void controller.restore();
  }, [controller, pathname]);
  useEffect(() => {
    if (!controller) return;
    const synchronize = (event: StorageEvent) => {
      if (event.key === CONSENT_KEY || event.key === null) void controller.restore();
    };
    const restore = () => {
      void controller.restore();
    };
    const suspend = () => controller.suspend();
    window.addEventListener("storage", synchronize);
    window.addEventListener("pageshow", restore);
    window.addEventListener("online", restore);
    window.addEventListener("pagehide", suspend);
    return () => {
      window.removeEventListener("storage", synchronize);
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("online", restore);
      window.removeEventListener("pagehide", suspend);
      controller.suspend();
    };
  }, [controller]);
  return (
    <Context.Provider value={{ controller, pathname, revision }}>
      {children}
      <ConsentControl />
    </Context.Provider>
  );
}

function ConsentControl() {
  const { controller, revision } = useContext(Context);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  const copy = consentCopy[getLocaleOrDefault(useLocale())];
  useEffect(() => {
    const show = (event: Event) => {
      trigger.current = (event as CustomEvent<HTMLElement>).detail;
      setOpen(true);
    };
    window.addEventListener("hanbuddy:analytics-settings", show);
    return () => window.removeEventListener("hanbuddy:analytics-settings", show);
  }, []);
  void revision;
  if (!controller?.enabled) return null;
  const visible = open || (!dismissed && controller.getSnapshot() === "unanswered");
  if (!visible) return null;
  const close = () => {
    setOpen(false);
    setDismissed(true);
    trigger.current?.focus();
  };
  return (
    <ConfirmDialog
      title={copy.title}
      description={copy.body}
      cancelLabel={copy.reject}
      confirmLabel={copy.accept}
      onClose={() => {
        void controller.reject();
        close();
      }}
      onConfirm={() => {
        void controller.accept();
        close();
      }}
    />
  );
}

export function AnalyticsSettings() {
  const { controller } = useContext(Context);
  const copy = consentCopy[getLocaleOrDefault(useLocale())];
  if (!controller?.enabled) return null;
  return (
    <button
      type="button"
      onClick={(event) =>
        window.dispatchEvent(
          new CustomEvent("hanbuddy:analytics-settings", { detail: event.currentTarget }),
        )
      }
      className="rounded-sm text-xs transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-strong"
    >
      {copy.settings}
    </button>
  );
}

export function useFunnelEvent() {
  const { controller, pathname } = useContext(Context);
  return useCallback(
    (name: FunnelEvent, activityId: number) =>
      controller?.track(name, pathname, activityId) ?? false,
    [controller, pathname],
  );
}

export function useAnalyticsView(
  name: "view_item" | "begin_checkout",
  activityId: number,
  usable: boolean,
) {
  const { revision } = useContext(Context);
  const event = useFunnelEvent();
  useEffect(() => {
    if (usable) event(name, activityId);
  }, [event, name, activityId, usable, revision]);
}

export function useAnalyticsEnabled() {
  return Boolean(useContext(Context).controller?.enabled);
}
