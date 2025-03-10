"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  const [supabase] = useState(() => createClient())

  // Handle sign in with email
  const handleSignIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setAuthError(null);
      
      // Use signInWithPassword method
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        setAuthError(error.message);
      } else {
        console.log('Sign in successful:', data.user?.id);
        router.push('/');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setAuthError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle sign up with email
  const handleSignUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      setAuthError(null);
      
      // Use signUp method with emailRedirectTo option
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' 
            ? `${window.location.origin}/auth/callback` 
            : undefined,
        },
      });
      
      if (error) {
        console.error('Sign up error:', error);
        setAuthError(error.message);
      } else if (data?.user) {
        console.log('Sign up successful:', data.user.id);
        setAuthMessage('Check your email for the confirmation link.');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      setAuthError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // State for auth message and loading
  const [authError, setAuthError] = useState<string | null>(error);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    // Skip if window is not defined (server-side rendering)
    if (typeof window === 'undefined') return;
    
    const checkUser = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('Current session on login page:', session)
        
        if (error) {
          console.error('Error getting session:', error)
          setAuthError(error.message)
          return
        }
        
        if (session) {
          console.log('User already logged in, redirecting to home')
          router.push('/')
        }
      } catch (error) {
        console.error('Error checking user session:', error)
        setAuthError(error instanceof Error ? error.message : 'Unknown error')
      }
    }
    
    checkUser()
  }, [router, supabase])

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">{isSignUp ? 'Sign Up' : 'Login'}</CardTitle>
          <CardDescription className="text-center">
            {isSignUp ? 'Create a new account' : 'Login to your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {authError}
            </div>
          )}
          {authMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {authMessage}
            </div>
          )}
          
          <form onSubmit={(e) => {
            e.preventDefault();
            if (isSignUp) {
              handleSignUp(email, password);
            } else {
              handleSignIn(email, password);
            }
          }}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                Email
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                Password
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center justify-between mb-4">
              <button
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
              </button>
              <button
                className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
