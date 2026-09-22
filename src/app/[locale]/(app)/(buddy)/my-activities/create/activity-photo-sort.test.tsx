import { act, fireEvent, screen } from "@testing-library/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { PhotoStep } from "./activity-create-steps";
import { reorderPhotos, type PhotoDraft } from "./activity-create-wizard";

const photos: PhotoDraft[] = [
  { id: "a", previewUrl: "/a.jpg", file: null, existingKey: "a.jpg" },
  { id: "b", previewUrl: "/b.jpg", file: new File(["b"], "b.jpg") },
  { id: "c", previewUrl: "/c.jpg", file: null, existingKey: "c.jpg" },
];

function Harness() {
  const [items, setItems] = useState(photos);
  const t = useTranslations("CreateActivity");
  return (
    <PhotoStep
      photos={items}
      onAdd={vi.fn()}
      onRemove={(id) => setItems((current) => current.filter((item) => item.id !== id))}
      onCover={vi.fn()}
      onReorder={(id, target) => setItems((current) => reorderPhotos(current, id, target))}
      t={t}
    />
  );
}

function handle(index: number) {
  return screen.getByRole("button", { name: `Move photo ${index}` });
}

function pointAt(id: string) {
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: () => document.querySelector(`[data-photo-id="${id}"]`),
  });
}

describe("photo reordering", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(window, "scrollBy").mockImplementation(() => {});
  });
  afterEach(() => {
    delete (HTMLElement.prototype as Partial<HTMLElement>).setPointerCapture;
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete (document as Partial<Document>).elementFromPoint;
  });

  it("reorders without changing existing keys or uploaded File objects", () => {
    expect(reorderPhotos(photos, "c", "a")).toEqual([photos[2], photos[0], photos[1]]);
    expect(reorderPhotos(photos, "a", "c")).toEqual([photos[1], photos[2], photos[0]]);
    expect(reorderPhotos(photos, "b", "missing")).toBe(photos);
    expect(reorderPhotos(photos, "b", "b")).toBe(photos);
    expect(reorderPhotos(photos, "missing", "a")).toBe(photos);
  });

  it("commits mouse drag on drop and moves the cover with the first photo", () => {
    renderWithIntl(<Harness />);
    const source = handle(3);
    fireEvent.pointerDown(source, { pointerId: 1, pointerType: "mouse", button: 0 });
    pointAt("a");
    fireEvent.pointerMove(source, { pointerId: 1, clientX: 20, clientY: 200 });
    expect(screen.getByAltText("Experience photo 1")).toHaveAttribute("src", "/a.jpg");
    fireEvent.pointerUp(source, { pointerId: 1, clientX: 20, clientY: 200 });
    expect(screen.getByAltText("Experience photo 1")).toHaveAttribute("src", "/c.jpg");
    expect(screen.getByAltText("Experience photo 1").parentElement).toHaveTextContent(
      "Cover photo",
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove experience photo 2" }));
    expect(screen.getByAltText("Experience photo 2")).toHaveAttribute("src", "/b.jpg");
  });

  it("requires a long press for touch and cancels safely", () => {
    vi.useFakeTimers();
    renderWithIntl(<Harness />);
    const source = handle(3);
    pointAt("a");
    fireEvent.pointerDown(source, { pointerId: 1, pointerType: "touch", button: 0 });
    fireEvent.pointerUp(source, { pointerId: 1 });
    expect(screen.getByAltText("Experience photo 1")).toHaveAttribute("src", "/a.jpg");
    fireEvent.pointerDown(source, { pointerId: 2, pointerType: "touch", button: 0 });
    expect(fireEvent.touchMove(source)).toBe(true);
    act(() => vi.advanceTimersByTime(300));
    expect(fireEvent.touchMove(source)).toBe(false);
    fireEvent.pointerMove(source, { pointerId: 2, clientX: 20, clientY: 200 });
    fireEvent.pointerCancel(source, { pointerId: 2 });
    expect(screen.getByAltText("Experience photo 1")).toHaveAttribute("src", "/a.jpg");
    fireEvent.pointerDown(source, { pointerId: 3, pointerType: "touch", button: 0 });
    act(() => vi.advanceTimersByTime(300));
    fireEvent.pointerMove(source, { pointerId: 3, clientX: 20, clientY: 200 });
    fireEvent.pointerUp(source, { pointerId: 3, clientX: 20, clientY: 200 });
    expect(screen.getByAltText("Experience photo 1")).toHaveAttribute("src", "/c.jpg");
  });

  it("does not block a swipe begun before the long press", () => {
    vi.useFakeTimers();
    renderWithIntl(<Harness />);
    const source = handle(3);
    pointAt("a");
    fireEvent.pointerDown(source, {
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      clientX: 100,
      clientY: 200,
    });
    fireEvent.pointerMove(source, { pointerId: 1, clientX: 100, clientY: 170 });
    act(() => vi.advanceTimersByTime(300));
    expect(fireEvent.touchMove(source)).toBe(true);
    fireEvent.pointerUp(source, { pointerId: 1 });
    expect(screen.getByAltText("Experience photo 1")).toHaveAttribute("src", "/a.jpg");
  });

  it.each(["en", "ko", "ja", "zh-Hans", "zh-Hant"] as const)(
    "renders a whole-photo control without a visible handle in %s",
    (locale) => {
      renderWithIntl(<Harness />, { locale });
      const photoButton = document.querySelector<HTMLButtonElement>("[data-photo-id] button")!;
      expect(photoButton).toHaveClass("inset-0", "touch-auto");
      expect(photoButton.querySelector("svg")).toBeNull();
      expect(photoButton).toHaveAccessibleName();
      expect(photoButton).toHaveAccessibleDescription();
    },
  );

  it("supports keyboard ordering and boundaries while keeping focus", () => {
    vi.useFakeTimers();
    renderWithIntl(<Harness />);
    const source = handle(2);
    source.focus();
    fireEvent.keyDown(source, { key: "ArrowLeft" });
    expect(screen.getByAltText("Experience photo 1")).toHaveAttribute("src", "/b.jpg");
    expect(handle(1)).toHaveFocus();
    fireEvent.keyDown(source, { key: "ArrowLeft" });
    expect(screen.getByAltText("Experience photo 1")).toHaveAttribute("src", "/b.jpg");
    fireEvent.keyDown(source, { key: "ArrowRight" });
    expect(screen.getByAltText("Experience photo 2")).toHaveAttribute("src", "/b.jpg");
    act(() => vi.advanceTimersByTime(50));
    expect(screen.getByRole("status")).toHaveTextContent("Photo moved to position 2 of 3");
  });

  it("captures the count at movement time without replaying the announcement on deletion, then clears it", () => {
    vi.useFakeTimers();
    renderWithIntl(<Harness />);
    fireEvent.keyDown(handle(2), { key: "ArrowRight" });
    act(() => vi.advanceTimersByTime(50));
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Photo moved to position 3 of 3");
    fireEvent.click(screen.getByRole("button", { name: "Remove experience photo 1" }));
    expect(status).toHaveTextContent("Photo moved to position 3 of 3");
    act(() => vi.advanceTimersByTime(3000));
    expect(status).toBeEmptyDOMElement();
    fireEvent.click(screen.getByRole("button", { name: "Remove experience photo 1" }));
    expect(status).toBeEmptyDOMElement();
  });

  it("clears the live region before announcing another move to the same position", () => {
    vi.useFakeTimers();
    renderWithIntl(<Harness />);
    fireEvent.keyDown(handle(1), { key: "ArrowRight" });
    act(() => vi.advanceTimersByTime(50));
    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Photo moved to position 2 of 3");
    fireEvent.keyDown(handle(3), { key: "ArrowLeft" });
    expect(status).toBeEmptyDOMElement();
    act(() => vi.advanceTimersByTime(50));
    expect(status).toHaveTextContent("Photo moved to position 2 of 3");
  });

  it("announces only the latest rapid move and clears pending timers when unmounted", () => {
    vi.useFakeTimers();
    const view = renderWithIntl(<Harness />);
    const source = handle(1);
    fireEvent.keyDown(source, { key: "ArrowRight" });
    fireEvent.keyDown(source, { key: "ArrowRight" });
    act(() => vi.advanceTimersByTime(50));
    expect(screen.getByRole("status")).toHaveTextContent("Photo moved to position 3 of 3");
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("scrolls the wizard panel while a photo is held near its edge and stops after cancellation", () => {
    vi.useFakeTimers();
    renderWithIntl(
      <main>
        <Harness />
      </main>,
    );
    const panel = screen.getByRole("main");
    vi.spyOn(panel, "getBoundingClientRect").mockReturnValue({ top: 100, bottom: 500 } as DOMRect);
    const source = handle(3);
    pointAt("a");
    fireEvent.pointerDown(source, {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      clientX: 100,
      clientY: 200,
    });
    fireEvent.pointerMove(source, { pointerId: 1, clientX: 100, clientY: 480 });
    act(() => vi.advanceTimersByTime(90));
    expect(panel.scrollTop).toBe(36);
    fireEvent.pointerCancel(source, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(90));
    expect(panel.scrollTop).toBe(36);
  });

  it("cancels on Escape and ignores drops outside the grid", () => {
    renderWithIntl(<Harness />);
    const source = handle(3);
    fireEvent.pointerDown(source, { pointerId: 1, pointerType: "mouse", button: 0 });
    pointAt("a");
    fireEvent.pointerMove(source, { pointerId: 1 });
    fireEvent.keyDown(source, { key: "Escape" });
    fireEvent.pointerUp(source, { pointerId: 1 });
    expect(screen.getByAltText("Experience photo 1")).toHaveAttribute("src", "/a.jpg");
    fireEvent.pointerDown(source, { pointerId: 2, pointerType: "mouse", button: 0 });
    pointAt("missing");
    fireEvent.pointerUp(source, { pointerId: 2 });
    expect(screen.getByAltText("Experience photo 1")).toHaveAttribute("src", "/a.jpg");
  });
});
