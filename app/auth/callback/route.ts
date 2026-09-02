import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// DEPLOYMENT NOTE: verify this route is not returning 404 in production.
// If using `output: 'standalone'` in next.config.ts, ensure the full
// .next/standalone directory is being served — route handlers are
// excluded if only the static output is deployed.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/reset-password';

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const response = NextResponse.redirect(`${origin}${next}`);
      const secure = process.env.NODE_ENV === 'production';

      response.cookies.set('sb-access-token', data.session.access_token, {
        path: '/',
        maxAge: data.session.expires_in,
        httpOnly: false,
        sameSite: 'lax',
        secure,
      });
      response.cookies.set('sb-refresh-token', data.session.refresh_token, {
        path: '/',
        maxAge: 31536000,
        httpOnly: false,
        sameSite: 'lax',
        secure,
      });

      return response;
    }
  }

  return NextResponse.redirect(`${origin}/reset-password?error=invalid_link`);
}
