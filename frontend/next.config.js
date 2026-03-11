/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '', pathname: '/**' },
      { protocol: 'http', hostname: '172.23.84.117', port: '', pathname: '/**' },
      { protocol: 'http', hostname: '**', port: '', pathname: '/**' },
      { protocol: 'https', hostname: '**', port: '', pathname: '/**' },
    ],
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
