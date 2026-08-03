import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const stylesheet = readFileSync(resolve("src/app/globals.css"), "utf8");

describe("global responsive brand foundation", () => {
  it("defines the exact landing warm-red semantic tokens", () => {
    expect(stylesheet).toContain("--color-canvas: #ffffff");
    expect(stylesheet).toContain("--color-canvas-soft: #ffffff");
    expect(stylesheet).toContain("--color-primary: #d13f32");
    expect(stylesheet).toContain("--color-primary-hover: #b9342b");
    expect(stylesheet).toContain("--color-primary-strong: #8f2f28");
    expect(stylesheet).toContain("--color-primary-soft: #fff0ec");
    expect(stylesheet).toContain("--color-ink: #261b18");
    expect(stylesheet).toContain("--color-muted: #675b56");
    expect(stylesheet).toContain("--color-line-strong: #d6c5bf");
    expect(stylesheet).toContain("--color-line-soft: #eee2dd");
    expect(stylesheet).toContain("--color-panel: #f8f3f0");
    expect(stylesheet).toContain("--color-panel-raised: #fcf8f6");
    expect(stylesheet).toContain("--color-on-primary: #ffffff");
    expect(stylesheet).toContain("--color-on-primary-strong: #ffffff");
  });

  it("retires the Figma presentation token declarations", () => {
    expect(stylesheet).not.toMatch(
      /--color-(?:cream|forest|forest-soft|sage|earth|chip|sand|line):/,
    );
  });

  it("maps Tailwind font roles to the approved font variables", () => {
    expect(stylesheet).toMatch(
      /--font-sans:\s*var\(--font-dm-sans\),\s*var\(--font-noto-sans-kr\),\s*system-ui,\s*sans-serif/,
    );
    expect(stylesheet).toMatch(
      /--font-display:\s*var\(--font-plus-jakarta-sans\),\s*var\(--font-noto-sans-kr\),\s*system-ui,\s*sans-serif/,
    );
  });
});

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
