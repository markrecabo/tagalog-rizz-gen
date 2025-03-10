import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'

export function createClient() {
  return createRouteHandlerClient<Database>({
    cookies,
  })
}
