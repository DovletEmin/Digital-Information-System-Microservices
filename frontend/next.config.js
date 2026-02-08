/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost', '172.20.102.83'],
    unoptimized: true
  },
  webpack: (config, { isServer }) => {
    // Ignore canvas module for client-side builds (required by react-pdf)
    if (!isServer) {
      config.resolve.alias.canvas = false;
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig
