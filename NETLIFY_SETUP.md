# Netlify Deployment Setup

This document provides instructions for setting up environment variables in Netlify for the Tagalog Rizz Generator application.

## Required Environment Variables

The following environment variables need to be configured in Netlify:

### Supabase Configuration
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for server-side operations)

### OpenRouter API Configuration
- `OPENROUTER_API_KEY` - Your OpenRouter API key
- `NEXT_PUBLIC_APP_URL` - The URL of your deployed application

## How to Configure Environment Variables in Netlify

1. Log in to your Netlify account
2. Go to your site dashboard
3. Navigate to **Site settings** → **Build & deploy** → **Environment**
4. Click on **Edit variables**
5. Add each of the required environment variables with their corresponding values
6. Click **Save**

## Additional Configuration

The `netlify.toml` file in the project root contains the necessary configuration for:
- Build commands
- Publish directory
- Cache settings
- Next.js plugin

## Troubleshooting

If you encounter build errors related to missing environment variables:
1. Verify that all required variables are set in Netlify
2. Check for typos in variable names
3. Ensure that the values are correctly formatted (no extra spaces, quotes, etc.)
4. Trigger a new deployment after updating the environment variables

## Local Development

For local development, create a `.env.local` file in the project root with the same environment variables. This file should not be committed to the repository.
