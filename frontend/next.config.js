/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost', '172.20.102.83'],
    unoptimized: true
  },
}

module.exports = nextConfig
