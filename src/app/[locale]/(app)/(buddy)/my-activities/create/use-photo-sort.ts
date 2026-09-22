"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

type Drag = { id: string; pointerId: number; x: number; y: number; active: boolean };
type Preview = { id: string; targetId: string | null; x: number; y: number };
type MoveAnnouncement = { position: number; count: number };
const ANNOUNCEMENT_DELAY_MS = 50;
const ANNOUNCEMENT_DURATION_MS = 3000;
const KEY_DIRECTIONS: Readonly<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowUp: -1,
  ArrowRight: 1,
  ArrowDown: 1,
};

function photoAt(grid: HTMLDivElement | null, x: number, y: number) {
  const target = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-photo-id]");
  return target && grid?.contains(target) ? (target.dataset.photoId ?? null) : null;
}

/** Touch scrolling stays native until a long press activates photo sorting. */
export function usePhotoSort(ids: string[], onReorder: (id: string, targetId: string) => void) {
  const gridRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announcementTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [announcement, setAnnouncement] = useState<MoveAnnouncement | null>(null);
  const isDragging = preview !== null;

  // The wizard scrolls its main panel, not the window. Keep scrolling while held
  // at its edge so photos beyond the current viewport remain reachable.
  useEffect(() => {
    if (!isDragging) return;
    const scrollTimer = setInterval(() => {
      const current = drag.current;
      const panel = gridRef.current?.closest("main");
      if (!current?.active || !panel) return;
      const { top, bottom } = panel.getBoundingClientRect();
      let delta = 0;
      if (current.y < top + 64) delta = -12;
      else if (current.y > bottom - 64) delta = 12;
      const previousTop = panel.scrollTop;
      panel.scrollTop += delta;
      if (panel.scrollTop !== previousTop) {
        setPreview({
          id: current.id,
          x: current.x,
          y: current.y,
          targetId: photoAt(gridRef.current, current.x, current.y),
        });
      }
    }, 30);
    return () => clearInterval(scrollTimer);
  }, [isDragging]);

  useEffect(() => {
    const grid = gridRef.current;
    const preventDragScroll = (event: TouchEvent) => {
      if (drag.current?.active && event.cancelable) event.preventDefault();
    };
    grid?.addEventListener("touchmove", preventDragScroll, { passive: false });
    return () => {
      grid?.removeEventListener("touchmove", preventDragScroll);
      if (timer.current) clearTimeout(timer.current);
      if (announcementTimer.current) clearTimeout(announcementTimer.current);
    };
  }, []);

  function cancel() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    drag.current = null;
    setPreview(null);
  }

  function targetAt(x: number, y: number) {
    return photoAt(gridRef.current, x, y);
  }

  function move(id: string, targetId: string) {
    if (id === targetId || !ids.includes(id) || !ids.includes(targetId)) return;
    onReorder(id, targetId);
    const nextAnnouncement = { position: ids.indexOf(targetId) + 1, count: ids.length };
    if (announcementTimer.current) clearTimeout(announcementTimer.current);
    // Empty the live region in a separate render so identical moves announce again.
    setAnnouncement(null);
    announcementTimer.current = setTimeout(() => {
      setAnnouncement(nextAnnouncement);
      announcementTimer.current = setTimeout(() => {
        setAnnouncement(null);
        announcementTimer.current = null;
      }, ANNOUNCEMENT_DURATION_MS);
    }, ANNOUNCEMENT_DELAY_MS);
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (event.button !== 0 || drag.current) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    const current: Drag = {
      id,
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      active: event.pointerType !== "touch",
    };
    drag.current = current;
    const activate = () => {
      current.active = true;
      setPreview({ id, targetId: id, x: current.x, y: current.y });
    };
    if (current.active) activate();
    else timer.current = setTimeout(activate, 300);
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (!current.active) {
      if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > 8) cancel();
      return;
    }
    const targetId = targetAt(event.clientX, event.clientY);
    current.x = event.clientX;
    current.y = event.clientY;
    setPreview({ id: current.id, targetId, x: event.clientX, y: event.clientY });
  }

  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const targetId = current.active ? targetAt(event.clientX, event.clientY) : null;
    if (targetId) move(current.id, targetId);
    cancel();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (event.key === "Escape") {
      cancel();
      return;
    }
    if (drag.current) return;
    const direction = KEY_DIRECTIONS[event.key];
    if (!direction) return;
    event.preventDefault();
    const targetId = ids[ids.indexOf(id) + direction];
    if (targetId) move(id, targetId);
  }

  return {
    gridRef,
    preview,
    announcement,
    cancel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onKeyDown,
  };
}
