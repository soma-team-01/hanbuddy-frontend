import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// 모든 응답에 붙는 보안 헤더. Caddy는 TLS와 프록시만 맡고, 헤더는 앱이 운영·staging·로컬에서 똑같이 낸다.
// HSTS는 서브도메인을 묶지 않는다(includeSubDomains·preload는 되돌리기 어려워 서브도메인 https 확인 후 검토).
// Content-Security-Policy는 결제(PayPal·토스)·GA4·Meta Pixel·Google Maps·카카오 스크립트 허용 목록 검토 후 별도로 넣는다.
export const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
] as const;

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep local responsive QA unobstructed; compile/runtime error overlays still work.
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [...SECURITY_HEADERS] }];
  },
  // Resolve public activity existence before committing a document status for any UA.
  htmlLimitedBots: /.*/,
  outputFileTracingIncludes: {
    "/*": ["content/policies/*.md"],
  },
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
      // 채팅에 올린 사진
      {
        protocol: "https",
        hostname: "hanbuddy-bucket-526958954481-ap-northeast-2-an.s3.ap-northeast-2.amazonaws.com",
        pathname: "/chats/**",
        search: "",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
