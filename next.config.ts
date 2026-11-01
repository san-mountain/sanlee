import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["three"],
  // 연락처는 About 페이지 아래로 합쳤다
  async redirects() {
    return [
      { source: "/contact", destination: "/about#contact", permanent: true },
      // 게임 작품 주소를 작품 이름으로 바꿨다. 예전 주소(QR 포함)도 그대로 들어온다
      { source: "/explore", destination: "/deleteseoul", permanent: true },
      { source: "/explore.webmanifest", destination: "/deleteseoul.webmanifest", permanent: true },
    ];
  },
};

export default nextConfig;
