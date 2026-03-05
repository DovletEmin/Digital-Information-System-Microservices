/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost', '172.23.84.117', '192.168.55.156'],
    unoptimized: true
  },
  webpack: (config, { isServer }) => {
    // Ensure any attempts to require native `canvas` are ignored by webpack
    // This prevents pdfjs-dist from trying to pull in the native canvas package
    config.resolve = config.resolve || {}
    config.resolve.fallback = Object.assign({}, config.resolve.fallback, {
      canvas: false,
    })
    return config
  },
}

module.exports = nextConfig
