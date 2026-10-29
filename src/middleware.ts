import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
const PUBLIC = ['/login', '/api/sito']
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/sito')) return NextResponse.next()   // contenuti pubblici dei siti: nessuna sessione
  let res = NextResponse.next({ request: req })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const isPublic = PUBLIC.some((p) => req.nextUrl.pathname.startsWith(p))
  if (!url || !key) return isPublic ? res : NextResponse.redirect(new URL('/login', req.url))
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => { list.forEach(({ name, value }) => req.cookies.set(name, value)); res = NextResponse.next({ request: req }); list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)) },
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && !isPublic) return NextResponse.redirect(new URL('/login', req.url))
  return res
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|ico)$).*)'] }
