import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL("https://lh3.googleusercontent.com/**"),
      // 백엔드가 프로필 이미지를 S3 공개 URL(https://{bucket}.s3.{region}.amazonaws.com/profiles/...)로 내려준다
      {
        protocol: "https",
        hostname: "*.s3.ap-northeast-2.amazonaws.com",
        pathname: "/profiles/**",
      },
    ],
  },
};

export default nextConfig;
