import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  STATIC_IMAGE_DIRS,
  STATIC_IMAGE_WIDTHS,
  staticImageLoader,
  variantPath,
} from "./static-image-loader";

describe("staticImageLoader", () => {
  // 운영에서 /_next/image의 로컬 사진 요청이 특정 너비에서 응답 없이 멈춘 적이 있어(2026-10-22, 11-04),
  // 로컬 사진은 미리 만든 너비별 파일을 바로 쓴다.
  it.each([
    [390, "/images/landing/w640/a.webp"],
    [640, "/images/landing/w640/a.webp"],
    [750, "/images/landing/w828/a.webp"],
    [828, "/images/landing/w828/a.webp"],
    [1080, "/images/landing/w1200/a.webp"],
    [1920, "/images/landing/a.webp"],
    [3840, "/images/landing/a.webp"],
  ])("너비 %i는 %s", (width, expected) => {
    expect(staticImageLoader({ src: "/images/landing/a.webp", width })).toBe(expected);
  });

  it("jpg 원본의 너비별 파일은 webp다", () => {
    expect(staticImageLoader({ src: "/images/buddy/hosting-hero.jpg", width: 828 })).toBe(
      "/images/buddy/w828/hosting-hero.webp",
    );
  });

  it("최적화 경로를 거치지 않는다", () => {
    for (const width of [640, 750, 828, 1080, 1200, 1920, 2048, 3840]) {
      expect(staticImageLoader({ src: "/images/landing/a.webp", width })).not.toContain(
        "/_next/image",
      );
    }
  });
});

describe("미리 만든 너비별 파일", () => {
  it.each(STATIC_IMAGE_DIRS)("%s의 모든 사진에 너비별 파일이 있다", (dir) => {
    const root = join(process.cwd(), "public", dir);
    const photos = readdirSync(root).filter((f) => /\.(webp|jpe?g|png)$/i.test(f));
    expect(photos.length).toBeGreaterThan(0);
    const missing = photos.flatMap((f) =>
      STATIC_IMAGE_WIDTHS.map((w) => variantPath(`/${dir}/${f}`, w)).filter(
        (p) => !existsSync(join(process.cwd(), "public", p)),
      ),
    );
    // 새 사진을 넣었다면 `node scripts/generate-static-image-variants.mjs`를 실행한다.
    expect(missing).toEqual([]);
  });
});
