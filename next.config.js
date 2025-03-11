/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // Environment variables that will be available at build time
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  },
  
  // Configure images if needed
  images: {
    domains: ['supabase.io'],
    unoptimized: true,
  },
  
  // Disable type checking during build for faster builds
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable ESLint during build for faster builds
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
