import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { LandingAnalytics, LandingCtaLink } from "./LandingAnalytics";

const analytics = vi.hoisted(() => ({ trackSection: vi.fn(), trackLandingCta: vi.fn() }));
vi.mock("./AnalyticsProvider", () => ({ useMeasurementEvents: () => analytics }));

let callback: IntersectionObserverCallback;
let mutationCallback: MutationCallback;
const observe = vi.fn();
const disconnect = vi.fn();
const observeMutations = vi.fn();
const disconnectMutations = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  analytics.trackSection.mockReset();
  analytics.trackSection.mockReturnValue(true);
  analytics.trackLandingCta.mockReset();
  observe.mockReset();
  disconnect.mockReset();
  observeMutations.mockReset();
  disconnectMutations.mockReset();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(next: IntersectionObserverCallback) {
        callback = next;
      }
      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
      root = null;
      rootMargin = "0px";
      thresholds = [0, 0.5, 1];
    },
  );
  vi.stubGlobal(
    "MutationObserver",
    class {
      constructor(next: MutationCallback) {
        mutationCallback = next;
      }
      observe = observeMutations;
      disconnect = disconnectMutations;
      takeRecords = vi.fn(() => []);
    },
  );
});

it("observes a landing section replaced by an async rerender", () => {
  renderWithIntl(<LandingAnalytics locale="en" />);
  const replacement = document.createElement("section");
  replacement.dataset.landingSection = "recommended_experiences";
  replacement.dataset.landingPosition = "2";

  mutationCallback(
    [{ addedNodes: [replacement] } as unknown as MutationRecord],
    {} as MutationObserver,
  );

  expect(observe).toHaveBeenCalledWith(replacement);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function entry(
  target: Element,
  { ratio, height, intersectionHeight, viewportHeight = 800 }: Record<string, number>,
) {
  return {
    target,
    isIntersecting: true,
    intersectionRatio: ratio,
    boundingClientRect: { height },
    intersectionRect: { height: intersectionHeight },
    rootBounds: { height: viewportHeight },
  } as IntersectionObserverEntry;
}

it("requires one continuous second at the normal or tall-section threshold and never duplicates", () => {
  renderWithIntl(
    <>
      <LandingAnalytics locale="en" />
      <section data-landing-section="hero" data-landing-position="1" />
      <section data-landing-section="recommended_experiences" data-landing-position="2" />
    </>,
  );
  const [hero, recommended] = document.querySelectorAll("[data-landing-section]");
  expect(observe).toHaveBeenCalledTimes(2);

  act(() =>
    callback([entry(hero, { ratio: 0.5, height: 600, intersectionHeight: 300 })], {} as never),
  );
  act(() => vi.advanceTimersByTime(999));
  expect(analytics.trackSection).not.toHaveBeenCalled();
  act(() =>
    callback([entry(hero, { ratio: 0.49, height: 600, intersectionHeight: 294 })], {} as never),
  );
  act(() => vi.advanceTimersByTime(1000));
  expect(analytics.trackSection).not.toHaveBeenCalled();

  act(() =>
    callback([entry(hero, { ratio: 0.5, height: 600, intersectionHeight: 300 })], {} as never),
  );
  act(() => vi.advanceTimersByTime(1000));
  expect(analytics.trackSection).toHaveBeenCalledWith({
    sectionId: "hero",
    position: 1,
    locale: "en",
  });
  act(() =>
    callback([entry(hero, { ratio: 1, height: 600, intersectionHeight: 600 })], {} as never),
  );
  act(() => vi.advanceTimersByTime(2000));
  expect(analytics.trackSection).toHaveBeenCalledTimes(1);

  act(() =>
    callback(
      [
        entry(recommended, {
          ratio: 0.3,
          height: 1600,
          intersectionHeight: 400,
          viewportHeight: 800,
        }),
      ],
      {} as never,
    ),
  );
  act(() => vi.advanceTimersByTime(1000));
  expect(analytics.trackSection).toHaveBeenLastCalledWith({
    sectionId: "recommended_experiences",
    position: 2,
    locale: "en",
  });
});

it("rechecks tall-section viewport occupancy on scroll and resize without duplicates", () => {
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  renderWithIntl(
    <>
      <LandingAnalytics locale="en" />
      <section data-landing-section="recommended_experiences" data-landing-position="2" />
    </>,
  );
  const section = document.querySelector("[data-landing-section]") as HTMLElement;
  let top = 401;
  vi.spyOn(section, "getBoundingClientRect").mockImplementation(
    () =>
      ({
        top,
        bottom: top + 1600,
        height: 1600,
      }) as DOMRect,
  );

  fireEvent.scroll(window);
  act(() => vi.advanceTimersByTime(1000));
  expect(analytics.trackSection).not.toHaveBeenCalled();

  top = 400;
  fireEvent.scroll(window);
  act(() => vi.advanceTimersByTime(999));
  expect(analytics.trackSection).not.toHaveBeenCalled();
  top = 401;
  fireEvent.resize(window);
  act(() => vi.advanceTimersByTime(1000));
  expect(analytics.trackSection).not.toHaveBeenCalled();

  top = 400;
  fireEvent.scroll(window);
  act(() => vi.advanceTimersByTime(1000));
  expect(analytics.trackSection).toHaveBeenCalledTimes(1);
  expect(analytics.trackSection).toHaveBeenCalledWith({
    sectionId: "recommended_experiences",
    position: 2,
    locale: "en",
  });

  fireEvent.resize(window);
  fireEvent.scroll(window);
  act(() => vi.advanceTimersByTime(2000));
  expect(analytics.trackSection).toHaveBeenCalledTimes(1);
});

it("tracks only actual landing CTA activation with fixed categories", () => {
  renderWithIntl(
    <LandingCtaLink
      href="/explore"
      ctaId="hero_explore"
      sectionId="hero"
      position={1}
      destinationType="explore"
      locale="en"
    >
      Explore
    </LandingCtaLink>,
    { locale: "en" },
  );
  expect(analytics.trackLandingCta).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("link", { name: "Explore" }), { detail: 0 });
  expect(analytics.trackLandingCta).toHaveBeenCalledWith({
    ctaId: "hero_explore",
    sectionId: "hero",
    position: 1,
    destinationType: "explore",
    locale: "en",
  });
});
