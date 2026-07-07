import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
    ],
  },
};

export default nextConfig;
