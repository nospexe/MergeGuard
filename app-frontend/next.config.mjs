/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove standalone for Vercel deployment
  // output: "standalone",
  typescript: {
    // Allow build to complete even with type errors during development
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
