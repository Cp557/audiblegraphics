import { type NextRequest } from 'next/server'
import { updateSession } from './src/lib/supabase/middleware'

// Helper to fix "ReferenceError: __dirname is not defined" in Edge Runtime
// This error can occur if a dependency (like fluent-ffmpeg) is accidentally bundled
// or if a library uses __dirname which isn't available in ESM.
if (typeof __dirname === 'undefined') {
  (globalThis as any).__dirname = '';
}

export async function middleware(request: NextRequest) {
  return await updateSession(request)
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
