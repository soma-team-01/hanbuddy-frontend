import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadFilesInSequence } from "./download";

describe("downloadFilesInSequence", () => {
  let clicks: string[];

  beforeEach(() => {
    clicks = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push(this.getAttribute("href") ?? "");
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts one download per file, in order", async () => {
    await downloadFilesInSequence(["/a", "/b", "/c"], async () => undefined);

    expect(clicks).toEqual(["/a", "/b", "/c"]);
  });

  it("spaces downloads apart so the browser does not drop later files", async () => {
    const waits: number[] = [];

    await downloadFilesInSequence(["/a", "/b", "/c"], async (ms) => {
      waits.push(ms);
    });

    // 첫 장은 기다리지 않고, 이후 장마다 한 번씩 쉰다
    expect(waits).toHaveLength(2);
    expect(waits.every((ms) => ms > 0)).toBe(true);
  });

  it("leaves the page alone when there is nothing to download", async () => {
    await downloadFilesInSequence([], async () => undefined);

    expect(clicks).toEqual([]);
    expect(document.querySelectorAll("a")).toHaveLength(0);
  });
});
