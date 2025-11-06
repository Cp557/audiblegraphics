import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const userAgent = request.headers.get('user-agent') || ''
  
  // Detect if user is on mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent)
  
  if (!code) {
    return NextResponse.redirect(`${origin}/sign-in?error=Could not authenticate user`)
  }

  const params = searchParams.toString()

  if (isMobile) {
    const url = params ? `aim90://auth/callback?${params}` : 'aim90://auth/callback'
    return NextResponse.redirect(url)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  
  if (!error) {
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'
    
    if (isLocalEnv) {
      return NextResponse.redirect(`${origin}/dashboard`)
    } else if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}/dashboard`)
    } else {
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/sign-in?error=Could not authenticate user`)
}

