/** @type {import('next').NextConfig} */
const nextConfig = {
  // face-api.js는 브라우저 전용 — Next.js 14에서는 experimental 하위에 위치
  experimental: {
    serverComponentsExternalPackages: ["face-api.js"],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // face-api.js가 참조하는 Node.js 전용 모듈을 브라우저 번들에서 제외
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
