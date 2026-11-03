import type { ImageLoaderProps } from "next/image";

// 운영에서 /_next/image의 로컬 사진 요청이 특정 너비(750·828·1920 등)에서 응답 없이 멈추고,
// 프로세스가 재시작될 때까지 그 너비에서는 사진이 뜨지 않은 적이 있다(2026-10-22, 11-04).
// 로컬 사진은 최적화 경로를 거치지 않고 미리 만든 너비별 webp를 바로 쓴다.
// 사진을 추가하면 `node scripts/generate-static-image-variants.mjs`로 너비별 파일을 만든다.
export const STATIC_IMAGE_DIRS = ["images/landing", "images/buddy"] as const;
export const STATIC_IMAGE_WIDTHS = [640, 828, 1200] as const;

export function variantPath(src: string, width: number): string {
  const slash = src.lastIndexOf("/");
  const name = src.slice(slash + 1).replace(/\.[^.]+$/, "");
  return `${src.slice(0, slash)}/w${width}/${name}.webp`;
}

export function staticImageLoader({ src, width }: Pick<ImageLoaderProps, "src" | "width">): string {
  const variant = STATIC_IMAGE_WIDTHS.find((w) => w >= width);
  // 가장 큰 너비보다 넓은 화면은 원본(최대 1600px)을 그대로 쓴다.
  return variant ? variantPath(src, variant) : src;
}
