import type { Metadata } from "next";
import { expect } from "vitest";

/** Assert production URLs independently of the application's origin and locale configuration. */
export function expectLocalizedMetadata(
  metadata: Metadata,
  title: string,
  canonicalPath: string,
  routePath: string,
) {
  expect(metadata.title).toEqual(title);
  expect(metadata.alternates?.canonical).toEqual(`https://hanbuddy.kr${canonicalPath}`);
  expect(metadata.alternates?.languages).toEqual({
    ...Object.fromEntries(
      ["en", "ko", "ja", "zh-Hans", "zh-Hant"].map((locale) => [
        locale,
        `https://hanbuddy.kr/${locale}${routePath}`,
      ]),
    ),
    // 언어를 못 정한 방문자는 리다이렉트되는 접두사 없는 주소가 아니라 영어 페이지로 보낸다.
    "x-default": `https://hanbuddy.kr/en${routePath}`,
  });
}
