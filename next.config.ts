import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // 홈 디렉터리의 무관한 package-lock.json이 워크스페이스 루트로 잡히지 않도록 고정한다
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
  images: {
    remotePatterns: [
      new URL("https://lh3.googleusercontent.com/**"),
      // 백엔드가 프로필 이미지를 HanBuddy S3 공개 URL로 내려준다
      {
        protocol: "https",
        hostname: "hanbuddy-bucket-526958954481-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com",
        pathname: "/profiles/**",
        search: "",
      },
      {
        protocol: "https",
        hostname: "hanbuddy-bucket-526958954481-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com",
        pathname: "/activities/**",
        search: "",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
