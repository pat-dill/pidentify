import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_PROXY || "http://server:8000"}/api/:path*`,
      },
    ];
  },

  images: {
    remotePatterns: [new URL("https://is1-ssl.mzstatic.com/image/thumb/**")],
  },

  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
