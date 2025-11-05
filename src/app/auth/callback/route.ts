import { ensureAim90Profile } from '@/lib/supabase/aim90'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error('Failed to retrieve user after email confirmation', {
          error: userError,
        })
        return NextResponse.redirect(`${origin}/sign-in?error=aim90_setup_failed`)
      }

      if (!user.email_confirmed_at) {
        console.error('Email confirmation missing for user during aim90 setup', {
          userId: user.id,
        })
        return NextResponse.redirect(`${origin}/sign-in?error=aim90_setup_failed`)
      }

      try {
        await ensureAim90Profile(supabase, user.id)
      } catch (aim90Error) {
        console.error('Failed to ensure aim90 profile for user', {
          userId: user.id,
          error: aim90Error,
        })
        return NextResponse.redirect(`${origin}/sign-in?error=aim90_setup_failed`)
      }

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
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/sign-in?error=Could not authenticate user`)
}

