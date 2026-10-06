import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ALBUM_INTERVAL_MS, SeptemberAlbum, type AlbumPhoto } from "./SeptemberAlbum";

const PHOTOS: AlbumPhoto[] = [
  { label: "09.05", src: "/images/landing/a.webp", alt: "Gocheok night" },
  { label: "09.12", src: "/images/landing/b.webp", alt: "Jamsil night" },
  { label: "09.13", src: "/images/landing/c.webp", alt: "Guide night" },
];

function stubReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: reduced && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

function shownPhoto() {
  return screen.getAllByRole("img").find((image) => image.closest("[data-active='true']"));
}

describe("SeptemberAlbum", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    stubReducedMotion(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows the first night and marks its thumbnail as current", () => {
    render(<SeptemberAlbum label="September nights" photos={PHOTOS} />);

    expect(shownPhoto()).toHaveAttribute("alt", "Gocheok night");
    expect(screen.getByRole("button", { name: "09.05" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "09.12" })).toHaveAttribute("aria-pressed", "false");
  });

  it("moves to the next night on its own and wraps around", () => {
    render(<SeptemberAlbum label="September nights" photos={PHOTOS} />);

    act(() => vi.advanceTimersByTime(ALBUM_INTERVAL_MS));
    expect(shownPhoto()).toHaveAttribute("alt", "Jamsil night");

    act(() => vi.advanceTimersByTime(ALBUM_INTERVAL_MS));
    act(() => vi.advanceTimersByTime(ALBUM_INTERVAL_MS));
    expect(shownPhoto()).toHaveAttribute("alt", "Gocheok night");
  });

  it("jumps to a tapped night and stops changing by itself", () => {
    render(<SeptemberAlbum label="September nights" photos={PHOTOS} />);

    fireEvent.click(screen.getByRole("button", { name: "09.13" }));
    expect(shownPhoto()).toHaveAttribute("alt", "Guide night");

    act(() => vi.advanceTimersByTime(ALBUM_INTERVAL_MS * 3));
    expect(shownPhoto()).toHaveAttribute("alt", "Guide night");
  });

  it("does not change by itself while the pointer or focus is on it", () => {
    render(<SeptemberAlbum label="September nights" photos={PHOTOS} />);

    fireEvent.pointerEnter(screen.getByRole("group", { name: "September nights" }));
    act(() => vi.advanceTimersByTime(ALBUM_INTERVAL_MS * 2));
    expect(shownPhoto()).toHaveAttribute("alt", "Gocheok night");

    fireEvent.pointerLeave(screen.getByRole("group", { name: "September nights" }));
    act(() => vi.advanceTimersByTime(ALBUM_INTERVAL_MS));
    expect(shownPhoto()).toHaveAttribute("alt", "Jamsil night");
  });

  it("stays on one photo when the visitor asks for less motion", () => {
    stubReducedMotion(true);
    render(<SeptemberAlbum label="September nights" photos={PHOTOS} />);

    act(() => vi.advanceTimersByTime(ALBUM_INTERVAL_MS * 3));
    expect(shownPhoto()).toHaveAttribute("alt", "Gocheok night");
  });
});
