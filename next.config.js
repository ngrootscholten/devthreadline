/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude packages directory from Next.js build
  typescript: {
    ignoreBuildErrors: false,
  },
  // Don't transpile packages - they're separate packages
  transpilePackages: [],
}

module.exports = nextConfig

