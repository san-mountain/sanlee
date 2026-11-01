import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["three"],
  // 연락처는 About 페이지 아래로 합쳤다
  async redirects() {
    return [{ source: "/contact", destination: "/about#contact", permanent: true }];
  },
};

export default nextConfig;
