import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const userAgent = request.headers.get('user-agent') || ''
  
  // Detect if user is on mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent)
  
  // Pass through all query parameters (Supabase adds token info)
  const params = searchParams.toString()
  
  if (isMobile) {
    // Redirect to deep link with all parameters
    return NextResponse.redirect(`aim90://reset?${params}`)
  }
  
  // If desktop, go to web reset password page
  return NextResponse.redirect(`${origin}/reset-password?${params}`)
}

