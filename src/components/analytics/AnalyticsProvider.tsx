"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { getLocaleOrDefault } from "@/i18n/routing";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { AnalyticsController } from "@/lib/analytics/controller";
import { createCookieRuntime } from "@/lib/analytics/cookie-runtime";
import type { AnalyticsItemId, FunnelEvent } from "@/lib/analytics/events";
import type { AnalyticsPolicy } from "@/lib/analytics/policy";
import { consentCopy } from "./consent-copy";

type Controller = AnalyticsController & { isWithdrawalPending?: () => boolean };
type MeasurementMethods = {
  trackList(pathname: string, itemIds: AnalyticsItemId[], version: string): boolean;
  trackSelection(pathname: string, itemId: AnalyticsItemId, index: number): boolean;
  trackSignup(pathname: string, method: "google"): boolean;
  trackSection(
    pathname: string,
    input: { sectionId: string; position: number; locale: string },
  ): boolean;
  trackLandingCta(
    pathname: string,
    input: {
      ctaId: string;
      sectionId: string;
      position: number;
      destinationType: string;
      locale: string;
    },
  ): boolean;
  trackInquiry(
    pathname: string,
    input: { channel: string; placement: string; locale: string },
  ): boolean;
};
type ControllerWithMeasurement = Controller & Partial<MeasurementMethods>;
const Context = createContext<{
  controller: ControllerWithMeasurement | null;
  pathname: string;
  revision: number;
}>({ controller: null, pathname: "", revision: 0 });
const noopSubscribe = () => () => {};
const zero = () => 0;

export function AnalyticsProvider({
  children,
  policy,
  controller: suppliedController = null,
}: Readonly<{
  children: ReactNode;
  policy: AnalyticsPolicy | null;
  controller?: ControllerWithMeasurement | null;
}>) {
  const [localController, setLocalController] = useState<{
    controller: Controller;
    policy: AnalyticsPolicy;
    live: () => boolean;
  } | null>(null);
  useEffect(() => {
    if (suppliedController || !policy) return;
    let mounted = true;
    const runtime = createCookieRuntime(policy, window, document);
    queueMicrotask(() => {
      if (mounted)
        setLocalController({ controller: runtime.controller, policy, live: () => mounted });
    });
    return () => {
      mounted = false;
      runtime.dispose();
    };
  }, [suppliedController, policy]);
  const controller =
    suppliedController ??
    (policy && localController?.policy === policy && localController.live()
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
    const restore = () => {
      void controller.restore();
    };
    const suspend = () => controller.suspend();
    const visible = () => {
      if (document.visibilityState === "visible") restore();
    };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("pageshow", restore);
    window.addEventListener("online", restore);
    window.addEventListener("pagehide", suspend);
    return () => {
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("online", restore);
      window.removeEventListener("pagehide", suspend);
      controller.suspend();
    };
  }, [controller]);
  const contextValue = useMemo(
    () => ({ controller, pathname, revision }),
    [controller, pathname, revision],
  );
  return (
    <Context.Provider value={contextValue}>
      {children}
      <ConsentControl />
    </Context.Provider>
  );
}

function ConsentControl() {
  const { controller } = useContext(Context);
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
    <>
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
      {controller.isWithdrawalPending?.() && (
        <output className="block text-xs text-muted">{copy.pending}</output>
      )}
    </>
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

export function useMeasurementEvents() {
  const { controller, pathname, revision } = useContext(Context);
  return useMemo(
    () => ({
      consentRevision: revision,
      trackList: (itemIds: AnalyticsItemId[], version: string) =>
        controller?.trackList?.(pathname, itemIds, version) ?? false,
      trackSelection: (itemId: AnalyticsItemId, index: number) =>
        controller?.trackSelection?.(pathname, itemId, index) ?? false,
      trackSignup: (method: "google") => controller?.trackSignup?.(pathname, method) ?? false,
      trackSection: (input: { sectionId: string; position: number; locale: string }) =>
        controller?.trackSection?.(pathname, input) ?? false,
      trackLandingCta: (input: {
        ctaId: string;
        sectionId: string;
        position: number;
        destinationType: string;
        locale: string;
      }) => controller?.trackLandingCta?.(pathname, input) ?? false,
      trackInquiry: (input: { channel: string; placement: string; locale: string }) =>
        controller?.trackInquiry?.(pathname, input) ?? false,
    }),
    [controller, pathname, revision],
  );
}
