import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

export const createClient = () => {
  // Only create the client in the browser environment
  if (typeof window === 'undefined') {
    // Return a placeholder during server-side rendering
    return {} as ReturnType<typeof createBrowserClient<Database>>;
  }
  
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
