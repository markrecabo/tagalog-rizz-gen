import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export const createClient = () => {
  // Only create the client in the browser environment
  if (typeof window === 'undefined') {
    // Return a placeholder during server-side rendering
    return {} as ReturnType<typeof createBrowserClient<Database>>;
  }
  
  // Get environment variables with fallbacks for development
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  // Check if environment variables are available
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables are missing. Please check your configuration.');
    // Return a non-functional client that won't throw errors
    return {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        signInWithPassword: () => Promise.resolve({ data: { user: null }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        signUp: () => Promise.resolve({ data: { user: null }, error: null })
      },
      from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
      // Add other methods as needed with safe fallbacks
    } as unknown as ReturnType<typeof createBrowserClient<Database>>;
  }
  
  // Create the actual client if environment variables are available
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
