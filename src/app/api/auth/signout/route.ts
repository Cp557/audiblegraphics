import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Sign out
  await supabase.auth.signOut()

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_DOMAIN || new URL(request.url).origin}/`,
    { status: 303 }
  )
}



