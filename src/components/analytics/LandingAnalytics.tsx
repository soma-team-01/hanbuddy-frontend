"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { useMeasurementEvents } from "./AnalyticsProvider";

export function LandingAnalytics({ locale }: Readonly<{ locale: Locale }>) {
  const { trackSection } = useMeasurementEvents();
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();
    const observed = new WeakSet<Element>();
    const sections = new Set<Element>();
    const updateVisibility = (section: Element, visible: boolean) => {
      const sectionId = (section as HTMLElement).dataset.landingSection;
      const position = Number((section as HTMLElement).dataset.landingPosition);
      if (
        !sectionId ||
        !Number.isSafeInteger(position) ||
        position <= 0 ||
        seen.current.has(sectionId)
      )
        return;
      const current = timers.get(section);
      if (!visible) {
        if (current) clearTimeout(current);
        timers.delete(section);
        return;
      }
      if (current) return;
      timers.set(
        section,
        setTimeout(() => {
          timers.delete(section);
          if (trackSection({ sectionId, position, locale })) seen.current.add(sectionId);
        }, 1000),
      );
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const viewportHeight = entry.rootBounds?.height ?? window.innerHeight;
          const tall = entry.boundingClientRect.height > viewportHeight;
          const visible =
            entry.isIntersecting &&
            (tall
              ? entry.intersectionRect.height >= viewportHeight * 0.5
              : entry.intersectionRatio >= 0.5);
          updateVisibility(entry.target, visible);
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    const observeSection = (section: Element) => {
      if (observed.has(section)) return;
      observed.add(section);
      sections.add(section);
      observer.observe(section);
    };
    const checkGeometry = () => {
      const viewportHeight = window.innerHeight;
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        const visibleHeight = Math.max(
          0,
          Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0),
        );
        updateVisibility(
          section,
          rect.height > 0 &&
            (rect.height > viewportHeight
              ? visibleHeight >= viewportHeight * 0.5
              : visibleHeight >= rect.height * 0.5),
        );
      });
    };
    const observeTree = (node: Node) => {
      if (!(node instanceof Element)) return;
      if (node.matches("[data-landing-section][data-landing-position]")) observeSection(node);
      node
        .querySelectorAll("[data-landing-section][data-landing-position]")
        .forEach(observeSection);
    };
    document
      .querySelectorAll("[data-landing-section][data-landing-position]")
      .forEach(observeSection);
    const mutations =
      typeof MutationObserver === "undefined"
        ? null
        : new MutationObserver((records) => {
            records.forEach((record) => record.addedNodes.forEach(observeTree));
          });
    mutations?.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", checkGeometry, { passive: true });
    window.addEventListener("resize", checkGeometry);
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      mutations?.disconnect();
      observer.disconnect();
      window.removeEventListener("scroll", checkGeometry);
      window.removeEventListener("resize", checkGeometry);
    };
  }, [locale, trackSection]);

  return null;
}

type LandingCtaLinkProps = ComponentProps<typeof Link> & {
  ctaId: string;
  sectionId: string;
  position: number;
  destinationType: string;
  locale: Locale;
};

export function LandingCtaLink({
  ctaId,
  sectionId,
  position,
  destinationType,
  locale,
  onClick,
  ...props
}: LandingCtaLinkProps) {
  const { trackLandingCta } = useMeasurementEvents();
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackLandingCta({ ctaId, sectionId, position, destinationType, locale });
        onClick?.(event);
      }}
    />
  );
}
