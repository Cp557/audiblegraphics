import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    // Structured, minimal logging to diagnose confirmation issues without leaking tokens
    try {
      console.log('[auth/callback] code present:', true, {
        codeLength: code.length,
        next,
        origin,
        env: process.env.NODE_ENV,
        forwardedHost: request.headers.get('x-forwarded-host') || undefined,
      })
    } catch {}

    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      try {
        console.log('[auth/callback] session exchange success')
      } catch {}
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }

    try {
      console.error('[auth/callback] session exchange failed', {
        errorMessage: error?.message,
        errorStatus: (error as any)?.status,
      })
    } catch {}
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/sign-in?error=Could not authenticate user`)
}

