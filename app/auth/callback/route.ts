import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (!code) {
    console.error('No code parameter found in callback URL')
    return NextResponse.redirect(
      new URL('/login?error=No authentication code provided', origin)
    )
  }

  try {
    // Create a Supabase client specifically for this route handler
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    console.log('Auth callback received with code:', code.substring(0, 5) + '...')
    
    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError)
      
      // If the user was created but authentication failed, we should still redirect to home
      // This is a workaround for the PKCE issue
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.log('Session exists despite exchange error, redirecting to home')
        return NextResponse.redirect(new URL('/', origin))
      }
      
      return NextResponse.redirect(
        new URL(`/login?error=Authentication failed: ${exchangeError.message}`, origin)
      )
    }
    
    console.log('Code exchange successful, session created')
    
    // URL to redirect to after sign in process completes
    return NextResponse.redirect(new URL('/', origin))
  } catch (error) {
    console.error('Error in auth callback:', error)
    return NextResponse.redirect(
      new URL('/login?error=An unexpected error occurred', origin)
    )
  }
}
