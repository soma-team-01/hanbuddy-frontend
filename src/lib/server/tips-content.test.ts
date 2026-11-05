import path from "node:path";
import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import { getTip, listRelatedTips, listTips } from "./tips-content";

const FIXTURES = path.join(process.cwd(), "src/lib/tips/fixtures");

describe("tips content", () => {
  it("lists only <slug>.en.md files from a folder and derives the slug from the file name", async () => {
    const tips = await listTips(FIXTURES);

    expect(tips.map(({ slug }) => slug)).toEqual(["kbo-ticket-booking-fixture"]);
  });

  it("returns no articles when the folder does not exist", async () => {
    expect(await listTips(path.join(FIXTURES, "missing"))).toEqual([]);
  });

  it("finds an article by slug and returns null for unknown or unsafe slugs", async () => {
    expect((await getTip("kbo-ticket-booking-fixture", FIXTURES))?.title).toMatch(/KBO Tickets/);
    expect(await getTip("does-not-exist", FIXTURES)).toBeNull();
    expect(await getTip("../../package", FIXTURES)).toBeNull();
  });

  // 파이프라인이 올린 글이 계약을 어기면 이 테스트(CI)에서 먼저 실패한다.
  it("keeps every article committed under content/tips valid", async () => {
    const tips = await listTips();

    expect(new Set(tips.map(({ slug }) => slug)).size).toBe(tips.length);
  });

  it("lists tips related to an activity and leaves out the rest", async () => {
    expect((await listRelatedTips(2, 3, FIXTURES)).map(({ slug }) => slug)).toEqual([
      "kbo-ticket-booking-fixture",
    ]);
    expect(await listRelatedTips(999, 3, FIXTURES)).toEqual([]);
  });

  it("does not break the activity page when a tip file is invalid", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "tips-"));
    await writeFile(path.join(dir, "broken.en.md"), "no frontmatter");
    expect(await listRelatedTips(2, 3, dir)).toEqual([]);
  });
});
