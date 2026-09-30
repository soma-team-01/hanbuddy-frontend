import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import sharp from "sharp";

describe("booking notification email logo", () => {
  it("preserves the public PNG path referenced by already-sent emails", async () => {
    const logo = readFileSync(join(process.cwd(), "public/assets/brand/logo-borderless.png"));
    expect(logo.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    const metadata = await sharp(logo).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBeGreaterThanOrEqual(64);
    expect(metadata.height).toBe(metadata.width);
    expect(metadata.hasAlpha).toBe(true);
  });
});
