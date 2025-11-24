import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Robust Polyfill for __dirname in both Node.js ESM and Edge runtimes
try {
  if (typeof __dirname === 'undefined') {
    // In Node.js ESM (e.g. next.config.js or API routes), we can use import.meta.url
    // But in Edge Runtime, 'url' module might be missing or limited.
    // We check for globalThis to be safe.
    const globalObj = typeof globalThis !== 'undefined' ? globalThis : 
                      typeof window !== 'undefined' ? window : 
                      typeof global !== 'undefined' ? global : {};
    
    // Start with empty string to prevent crashes
    (globalObj as any).__dirname = '';
    
    // Try to populate it properly if we are in a Node-like environment
    try {
       // We use dynamic import to avoid static analysis errors in Edge
       // const { fileURLToPath } = require('url'); // CommonJS
       // const { dirname } = require('path');      // CommonJS
       // (globalObj as any).__dirname = dirname(fileURLToPath(import.meta.url));
       
       // Actually, simplest fallback is just empty string for Vercel Edge
       // because real file system access is blocked anyway.
    } catch (e) {
      // Ignore errors if we can't derive real path
    }
  }
} catch (e) {
  // Safety net
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/sign-in'
    return NextResponse.redirect(url)
  }

  // Redirect to dashboard if already logged in and visiting sign-in page
  if (user && request.nextUrl.pathname === '/sign-in') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
