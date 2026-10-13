import { describe, expect, it, vi } from "vitest";
import { createDashboardRequestQueue } from "./buddy-dashboard";

describe("dashboard request queue", () => {
  it("limits concurrent requests and continues after a failure", async () => {
    const run = createDashboardRequestQueue(2);
    const signal = new AbortController().signal;
    let active = 0;
    let peak = 0;
    const results = await Promise.allSettled(
      Array.from({ length: 16 }, (_, index) =>
        run(async () => {
          active++;
          peak = Math.max(peak, active);
          await new Promise((resolve) => setTimeout(resolve, 1));
          active--;
          if (index === 0) throw new Error("offline");
          return index;
        }, signal),
      ),
    );
    expect(peak).toBe(2);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(15);
  });

  it("does not start a queued request after its date was abandoned", async () => {
    const run = createDashboardRequestQueue(1);
    let finish!: () => void;
    const first = run(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
      new AbortController().signal,
    );
    const controller = new AbortController();
    const request = vi.fn(async () => "unused");
    const second = run(request, controller.signal);
    const rejected = expect(second).rejects.toMatchObject({ name: "AbortError" });
    controller.abort();
    finish();
    await first;
    await rejected;
    expect(request).not.toHaveBeenCalled();
  });
});
