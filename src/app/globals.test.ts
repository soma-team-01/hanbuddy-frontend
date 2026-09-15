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

describe("global korean line breaking", () => {
  it("keeps Korean words intact at line breaks while still breaking unbreakable strings", () => {
    const rule = stylesheet.match(/\n:lang\(ko\)\s*\{([^}]*)\}/)?.[1];

    expect(rule).toContain("word-break: keep-all");
    expect(rule).toContain("overflow-wrap: anywhere");
    // 한국어 문서 안의 중국어 요소는 keep-all을 물려받지 않도록 되돌린다
    const chinese = stylesheet.match(/\n:lang\(zh\)\s*\{([^}]*)\}/)?.[1];
    expect(chinese).toContain("word-break: normal");
    expect(chinese).toContain("overflow-wrap: normal");
  });

  it("lets Japanese break by phrase and balances heading lines in every language", () => {
    const japanese = stylesheet.match(/\n:lang\(ja\)\s*\{([^}]*)\}/)?.[1];
    const headings = stylesheet.match(/\nh1,\s*h2,\s*h3\s*\{([^}]*)\}/)?.[1];

    // 미지원 브라우저용 폴백이 auto-phrase보다 먼저 와야 캐스케이드로 덮어씌워진다
    expect(japanese?.indexOf("word-break: normal")).toBeLessThan(
      japanese?.indexOf("word-break: auto-phrase") ?? -1,
    );
    expect(japanese).toContain("word-break: auto-phrase");
    expect(headings).toContain("text-wrap: balance");
  });
});

describe("landing hero media styles", () => {
  it("feathers contained hero photos into the blurred backdrop from md up", () => {
    const block = stylesheet.match(
      /@media \(min-width: 768px\)\s*\{\s*\.hero-media-contain\s*\{([^}]*)\}/,
    )?.[1];

    expect(block).toContain("object-position: center");
    expect(block).toMatch(/mask-image:\s*linear-gradient\(90deg/);
    expect(block).toContain("mask-composite: intersect");
    expect(stylesheet).toMatch(
      /\.hero-media-image\s*\{[^}]*object-position: var\(--hero-media-position, center\)/,
    );
  });
});
