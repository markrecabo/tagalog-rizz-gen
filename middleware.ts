import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Only protect favorites API routes
  if (request.nextUrl.pathname.startsWith('/api/favorites')) {
    // Get the auth cookie directly from the request headers
    const authCookie = request.cookies.get('sb-klxnaepilagamdtectrh-auth-token')
    
    if (!authCookie) {
      console.log('Middleware: No auth cookie found, redirecting to login')
      return NextResponse.redirect(new URL('/login', request.url))
    }
    
    // Allow the request to continue
    return NextResponse.next()
  }
  
  // For all other routes, continue
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/favorites/:path*'
  ],
}
