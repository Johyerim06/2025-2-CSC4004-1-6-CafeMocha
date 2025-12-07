/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['figma.com'],
  },
  productionBrowserSourceMaps: false,
}

module.exports = nextConfig

