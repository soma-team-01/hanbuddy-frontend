"use client";

import Image, { type ImageProps } from "next/image";

import { staticImageLoader } from "@/lib/images/static-image-loader";

/** public/images의 사진용 next/image. 최적화 경로(/_next/image) 대신 미리 만든 너비별 파일을 쓴다. */
export function StaticImage({ alt, ...props }: Omit<ImageProps, "loader">) {
  return <Image alt={alt} {...props} loader={staticImageLoader} />;
}
