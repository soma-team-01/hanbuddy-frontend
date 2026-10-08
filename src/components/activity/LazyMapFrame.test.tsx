import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LazyMapFrame } from "./LazyMapFrame";

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

function stubIntersectionObserver() {
  const observers: { callback: ObserverCallback; options?: IntersectionObserverInit }[] = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: ObserverCallback, options?: IntersectionObserverInit) {
        observers.push({ callback, options });
      }
      observe() {}
      disconnect() {}
    },
  );
  return observers;
}

afterEach(() => vi.unstubAllGlobals());

describe("LazyMapFrame", () => {
  it("holds the map space and only loads Google Maps when it comes near the screen", () => {
    const observers = stubIntersectionObserver();
    render(
      <LazyMapFrame src="https://maps.example/embed" title="Map of Jamsil" className="h-[204px]" />,
    );

    expect(screen.queryByTitle("Map of Jamsil")).not.toBeInTheDocument();
    expect(screen.getByTestId("map-placeholder")).toHaveClass("h-[204px]");
    expect(observers[0].options).toEqual({ rootMargin: "200px" });

    act(() => observers[0].callback([{ isIntersecting: true }]));

    expect(screen.getByTitle("Map of Jamsil")).toHaveAttribute("src", "https://maps.example/embed");
    expect(screen.queryByTestId("map-placeholder")).not.toBeInTheDocument();
  });

  it("loads the map right away in browsers without IntersectionObserver", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<LazyMapFrame src="https://maps.example/embed" title="Map" className="h-[204px]" />);

    expect(await screen.findByTitle("Map")).toBeInTheDocument();
  });
});
