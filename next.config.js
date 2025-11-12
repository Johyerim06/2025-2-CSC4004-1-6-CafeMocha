/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['figma.com'],
  },
  // 개발 모드에서 소스맵 비활성화 (선택사항)
  productionBrowserSourceMaps: false,
}

module.exports = nextConfig

