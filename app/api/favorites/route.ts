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

// GET: Get all favorites for the current user
export async function GET(request: Request) {
  try {
    // Extract the auth cookie from the request headers
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) {
      return NextResponse.json({ error: 'Unauthorized - No cookie found' }, { status: 401 })
    }
    
    // Parse cookies manually
    const cookies = parseCookies(cookieHeader)
    const authCookie = cookies['sb-klxnaepilagamdtectrh-auth-token']
    
    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized - No auth cookie found' }, { status: 401 })
    }
    
    // Extract the JWT token from the cookie
    const token = extractTokenFromCookie(authCookie)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - Invalid auth cookie' }, { status: 401 })
    }
    
    // Create a Supabase client with the token
    const supabase = createSupabaseClient(token)
    
    // Get the user with the token
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('User error:', userError)
      return NextResponse.json({ error: 'Unauthorized - Invalid session' }, { status: 401 })
    }

    // Get favorites for the current user
    const { data: favorites, error } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error fetching favorites:', error)
      return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 })
    }
    
    return NextResponse.json(favorites)
  } catch (error) {
    console.error('Error in GET favorites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Save a new favorite
export async function POST(request: Request) {
  try {
    const { content, translation } = await request.json()
    
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }
    
    // Extract the auth cookie from the request headers
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) {
      return NextResponse.json({ error: 'Unauthorized - No cookie found' }, { status: 401 })
    }
    
    // Parse cookies manually
    const cookies = parseCookies(cookieHeader)
    const authCookie = cookies['sb-klxnaepilagamdtectrh-auth-token']
    
    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized - No auth cookie found' }, { status: 401 })
    }
    
    // Extract the JWT token from the cookie
    const token = extractTokenFromCookie(authCookie)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - Invalid auth cookie' }, { status: 401 })
    }
    
    // Create a Supabase client with the token
    const supabase = createSupabaseClient(token)
    
    // Get the user with the token
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('User error:', userError)
      return NextResponse.json({ error: 'Unauthorized - Invalid session' }, { status: 401 })
    }
    
    console.log('Saving favorite for user:', user.id)
    
    // Save the favorite
    const { data: favorite, error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        content: content,
        translation: translation || null
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error saving favorite:', error)
      return NextResponse.json({ error: 'Failed to save favorite' }, { status: 500 })
    }
    
    return NextResponse.json(favorite)
  } catch (error) {
    console.error('Error in POST favorite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Remove a favorite
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'Favorite ID is required' }, { status: 400 })
    }
    
    // Extract the auth cookie from the request headers
    const cookieHeader = request.headers.get('cookie')
    if (!cookieHeader) {
      return NextResponse.json({ error: 'Unauthorized - No cookie found' }, { status: 401 })
    }
    
    // Parse cookies manually
    const cookies = parseCookies(cookieHeader)
    const authCookie = cookies['sb-klxnaepilagamdtectrh-auth-token']
    
    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized - No auth cookie found' }, { status: 401 })
    }
    
    // Extract the JWT token from the cookie
    const token = extractTokenFromCookie(authCookie)
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized - Invalid auth cookie' }, { status: 401 })
    }
    
    // Create a Supabase client with the token
    const supabase = createSupabaseClient(token)
    
    // Get the user with the token
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('User error:', userError)
      return NextResponse.json({ error: 'Unauthorized - Invalid session' }, { status: 401 })
    }
    
    // Delete the favorite
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    
    if (error) {
      console.error('Error deleting favorite:', error)
      return NextResponse.json({ error: 'Failed to delete favorite' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE favorite:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
