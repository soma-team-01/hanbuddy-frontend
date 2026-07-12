import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(resolve("src/app/globals.css"), "utf8");

describe("global motion styles", () => {
  it("keeps press feedback independent from reveal transforms", () => {
    const pressRule = stylesheet.match(/\.motion-press\s*\{([^}]*)\}/)?.[1];
    const activeRules = [...stylesheet.matchAll(/\.motion-press:active\s*\{([^}]*)\}/g)].map(
      (match) => match[1],
    );

    expect(pressRule).toContain("scale var(--motion-duration-fast)");
    expect(activeRules[0]).toContain("scale: 0.985");
    expect(activeRules[0]).not.toContain("transform:");
    expect(activeRules[1]).toContain("scale: none");
  });
});
