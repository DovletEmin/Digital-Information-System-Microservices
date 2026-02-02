/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  env: {
    API_GATEWAY_URL: process.env.API_GATEWAY_URL || 'http://localhost:3000',
  },
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig
