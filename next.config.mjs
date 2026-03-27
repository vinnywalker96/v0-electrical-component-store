/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  // Compression and caching
  compress: true,
  poweredByHeader: false,
  // Bundle analysis (uncomment to analyze bundle size)
  // bundleAnalyzer: process.env.ANALYZE === 'true',
}

export default nextConfig
