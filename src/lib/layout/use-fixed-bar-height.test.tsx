import { render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FIXED_BAR_HEIGHT_VAR, useFixedBarHeight } from "./use-fixed-bar-height";

type ResizeCallback = (entries: ResizeObserverEntry[]) => void;
const observers: {
  callback: ResizeCallback;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}[] = [];

function Bar({ enabled = true, position = "fixed" }: { enabled?: boolean; position?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useFixedBarHeight(ref, enabled);
  return <div ref={ref} data-testid="bar" style={{ position: position as "fixed" }} />;
}

describe("useFixedBarHeight", () => {
  beforeEach(() => {
    observers.length = 0;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        disconnect = vi.fn();
        constructor(callback: ResizeCallback) {
          observers.push({ callback, observe: this.observe, disconnect: this.disconnect });
        }
      },
    );
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return 132;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.style.removeProperty(FIXED_BAR_HEIGHT_VAR);
    delete document.body.dataset.fixedBar;
  });

  it("exposes the bar height as a CSS variable and marks the body while mounted", () => {
    const { unmount } = render(<Bar />);

    expect(document.documentElement.style.getPropertyValue(FIXED_BAR_HEIGHT_VAR)).toBe("132px");
    expect(document.body.dataset.fixedBar).toBe("true");
    expect(observers[0]?.observe).toHaveBeenCalled();

    unmount();

    expect(document.documentElement.style.getPropertyValue(FIXED_BAR_HEIGHT_VAR)).toBe("");
    expect(document.body.dataset.fixedBar).toBeUndefined();
    expect(observers[0]?.disconnect).toHaveBeenCalled();
  });

  it("reports zero when the bar is not fixed (desktop static layout)", () => {
    render(<Bar position="static" />);

    expect(document.documentElement.style.getPropertyValue(FIXED_BAR_HEIGHT_VAR)).toBe("0px");
    expect(document.body.dataset.fixedBar).toBeUndefined();
  });

  it("does nothing when disabled", () => {
    render(<Bar enabled={false} />);

    expect(document.documentElement.style.getPropertyValue(FIXED_BAR_HEIGHT_VAR)).toBe("");
    expect(document.body.dataset.fixedBar).toBeUndefined();
    expect(observers).toHaveLength(0);
  });

  it("re-measures when the observer fires", () => {
    render(<Bar />);
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get() {
        return 230;
      },
    });

    observers[0]?.callback([]);

    expect(document.documentElement.style.getPropertyValue(FIXED_BAR_HEIGHT_VAR)).toBe("230px");
  });
});
