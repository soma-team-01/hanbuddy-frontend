import { afterEach, describe, expect, it, vi } from "vitest";
import { getCancellationTranslation } from "./cancellation-translation";

afterEach(() => vi.unstubAllGlobals());
describe("cancellation translation client", () => {
  it.each([
    ["application", "applications"],
    ["schedule", "activity-schedules"],
  ] as const)("only GETs %s with no body and no-store", async (kind, path) => {
    const result = {
      originalText: "reason",
      displayText: "reason",
      status: "UNAVAILABLE",
      sourceLanguage: "UNKNOWN",
      targetLanguage: "KO",
    };
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ isSuccess: true, result })));
    vi.stubGlobal("fetch", fetch);
    expect(await getCancellationTranslation(kind, 42, "KO")).toEqual({
      status: "success",
      translation: result,
    });
    expect(fetch).toHaveBeenCalledWith(`/api/${path}/42/cancellation-translation?language=KO`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: expect.any(AbortSignal),
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
