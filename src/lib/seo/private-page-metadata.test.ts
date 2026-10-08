import { readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { isNoindexPath } from "./indexing";

const LOCALE_ROOT = join(process.cwd(), "src/app/[locale]");

function pageFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name.startsWith("@") ? [] : pageFiles(path);
    return entry.name === "page.tsx" ? [path] : [];
  });
}

/** 폴더 경로를 실제 주소로 바꾼다. route group `(x)`는 빼고 동적 세그먼트는 예시 값으로 채운다. */
function routePath(page: string): string {
  const segments = relative(LOCALE_ROOT, dirname(page))
    .split(sep)
    .filter((segment) => segment && !/^\(.+\)$/.test(segment))
    .map((segment) => (/^\[.+\]$/.test(segment) ? "1" : segment));
  return `/en/${segments.join("/")}`.replace(/\/$/, "");
}

/** 페이지 자신 또는 [locale] 아래 조상 레이아웃이 비공개 메타데이터를 내보내는지. */
function hasPrivateMetadata(page: string): boolean {
  for (let dir = dirname(page); dir.startsWith(LOCALE_ROOT); dir = dirname(dir)) {
    for (const file of [join(dir, "layout.tsx"), ...(dir === dirname(page) ? [page] : [])]) {
      if (existsSync(file) && readFileSync(file, "utf8").includes("privatePageMetadata"))
        return true;
    }
  }
  return false;
}

describe("robots noindex meta on private screens", () => {
  const pages = pageFiles(LOCALE_ROOT).map((page) => ({ page, path: routePath(page) }));

  it("covers every screen the proxy marks noindex", () => {
    const privatePages = pages.filter(({ path }) => isNoindexPath(path));
    expect(privatePages.length).toBeGreaterThan(20);
    expect(
      privatePages.filter(({ page }) => !hasPrivateMetadata(page)).map(({ path }) => path),
    ).toEqual([]);
  });

  it("leaves public screens indexable", () => {
    const leaked = pages
      .filter(({ page, path }) => !isNoindexPath(path) && hasPrivateMetadata(page))
      .map(({ path }) => path);
    expect(leaked).toEqual([]);
    expect(pages.map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        "/en",
        "/en/about",
        "/en/faq",
        "/en/explore",
        "/en/activities/1",
        "/en/buddy",
      ]),
    );
  });
});
