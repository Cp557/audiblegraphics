import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const userAgent = request.headers.get('user-agent') || ''
  
  // Detect if user is on mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent)
  
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Ensure aim90_table row exists
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        await supabase.from('aim90_table').upsert(
          { user_id: user.id },
          { onConflict: 'user_id' }
        )
      }

      // If mobile device, redirect to deep link
      if (isMobile) {
        // For sign-up confirmation, go to app
        return NextResponse.redirect('aim90://auth/callback')
      }
      
      // If desktop, go to web dashboard
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
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/sign-in?error=Could not authenticate user`)
}

