import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Create a Supabase client creator function that accepts a token
const createSupabaseClient = (token?: string) => {
  const options = token 
    ? { 
        global: { 
          headers: { 
            Authorization: `Bearer ${token}` 
          } 
        } 
      } 
    : undefined;
  
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    options
  );
};

// GET: Get the current session status
export async function GET(request: Request) {
  try {
    // Extract the auth cookie from the request headers
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) {
      return NextResponse.json({ user: null }, { status: 200 })
    }
    
    // Parse cookies manually
    const cookies = parseCookies(cookieHeader)
    const authCookie = cookies['sb-klxnaepilagamdtectrh-auth-token']
    
    if (!authCookie) {
      return NextResponse.json({ user: null }, { status: 200 })
    }
    
    // Extract the JWT token from the cookie
    const token = extractTokenFromCookie(authCookie)
    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 })
    }
    
    // Create a Supabase client with the token
    const supabase = createSupabaseClient(token)
    
    // Get the user with the token
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.error('Session error:', error)
      return NextResponse.json({ user: null }, { status: 200 })
    }
    
    return NextResponse.json({ 
      user: {
        id: user.id,
        email: user.email
      } 
    })
  } catch (error) {
    console.error('Error in GET session:', error)
    return NextResponse.json({ user: null }, { status: 200 })
  }
}

// Helper function to parse cookies from header
function parseCookies(cookieHeader: string) {
  const cookies: Record<string, string> = {}
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=')
    if (name && value) {
      cookies[name] = decodeURIComponent(value)
    }
  })
  return cookies
}

// Helper function to extract token from cookie value
function extractTokenFromCookie(cookieValue: string) {
  try {
    // The cookie value is in the format "base64-{json}" - we need to extract the access_token
    if (cookieValue.startsWith('base64-')) {
      const base64Value = cookieValue.substring(7) // Remove "base64-" prefix
      const decodedValue = Buffer.from(base64Value, 'base64').toString()
      const parsedValue = JSON.parse(decodedValue)
      return parsedValue.access_token
    }
    return null
  } catch (error) {
    console.error('Error parsing auth cookie:', error)
    return null
  }
}
