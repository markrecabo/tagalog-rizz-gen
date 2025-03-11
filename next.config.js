/** @type {import('next').NextConfig} */
const nextConfig = {
  // Don't use static export as it breaks API routes and server components
  // output: 'export',
  
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
  },
  
  // Disable server actions for compatibility with Netlify
  experimental: {
    serverActions: false,
  },
}

module.exports = nextConfig
