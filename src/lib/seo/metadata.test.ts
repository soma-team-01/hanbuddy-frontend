import { describe, expect, it } from "vitest";
import { DEFAULT_SHARE_IMAGE, publicPageMetadata, sharePreview } from "./metadata";

describe("sharePreview", () => {
  it("falls back to the 1200x630 brand image so every shared link shows a photo", () => {
    const preview = sharePreview({
      locale: "ko",
      path: "/about",
      title: "HanBuddy 소개",
      description: "  서울  직관의 밤을\n함께 만드는 팀  ",
    });

    expect(DEFAULT_SHARE_IMAGE).toMatchObject({
      url: "https://hanbuddy.kr/images/og/hanbuddy-share.jpg",
      width: 1200,
      height: 630,
    });
    expect(preview.openGraph).toMatchObject({
      type: "website",
      siteName: "HanBuddy",
      title: "HanBuddy 소개",
      description: "서울 직관의 밤을 함께 만드는 팀",
      url: "https://hanbuddy.kr/ko/about",
      locale: "ko_KR",
      images: [DEFAULT_SHARE_IMAGE],
    });
    expect(preview.twitter).toMatchObject({
      card: "summary_large_image",
      images: [DEFAULT_SHARE_IMAGE.url],
    });
  });

  it("prefers the page image when one is given", () => {
    const preview = sharePreview({
      locale: "en",
      path: "/activities/2",
      title: "KBO night",
      description: "Baseball",
      image: "https://cdn.example.com/activity.jpg",
    });

    expect(preview.openGraph?.images).toEqual(["https://cdn.example.com/activity.jpg"]);
    expect(preview.twitter?.images).toEqual(["https://cdn.example.com/activity.jpg"]);
  });

  it.each(["javascript:alert(1)", "http://[bad", "http://cdn.example.com/activity.jpg", ""])(
    "ignores the unusable image %j and keeps the brand image",
    (image) => {
      const preview = sharePreview({
        locale: "en",
        path: "/explore",
        title: "Explore",
        description: "Find a game night",
        image,
      });

      expect(preview.openGraph?.images).toEqual([DEFAULT_SHARE_IMAGE]);
    },
  );
});

describe("publicPageMetadata", () => {
  it("adds the brand suffix and a share image to public pages without their own photo", () => {
    const metadata = publicPageMetadata({
      locale: "en",
      path: "/explore",
      title: " Explore ",
      description: "Find a game night",
    });

    expect(metadata.title).toBe("Explore | HanBuddy");
    expect(metadata.alternates?.canonical).toBe("https://hanbuddy.kr/en/explore");
    // 탐색·활동 페이지도 HTML에서 언어별 대체 주소를 선언한다(예전에는 응답 헤더에만 있었다).
    expect(metadata.alternates?.languages).toEqual({
      en: "https://hanbuddy.kr/en/explore",
      ko: "https://hanbuddy.kr/ko/explore",
      ja: "https://hanbuddy.kr/ja/explore",
      "zh-Hans": "https://hanbuddy.kr/zh-Hans/explore",
      "zh-Hant": "https://hanbuddy.kr/zh-Hant/explore",
      "x-default": "https://hanbuddy.kr/en/explore",
    });
    expect(metadata.openGraph).toMatchObject({
      title: "Explore | HanBuddy",
      images: [DEFAULT_SHARE_IMAGE],
    });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });
});
