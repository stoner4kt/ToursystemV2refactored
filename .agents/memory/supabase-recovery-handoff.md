---
name: Supabase recovery handoff
description: Constraint for password-reset links when Next.js exchanges Supabase PKCE codes server-side.
---

When a Next.js callback exchanges a Supabase recovery PKCE code with `createServerClient`, the browser-side Supabase client does not automatically receive that session. The reset page must receive or establish a client session before calling `updateUser`.

**Why:** The server cookie and the browser client's local session storage are separate. Checking only `getSession()` in the client can incorrectly show an invalid-link screen after a valid recovery email is opened.

**How to apply:** For a server callback flow, forward the returned recovery session in the URL fragment and call `supabase.auth.setSession()` on the reset page before rendering the password form. Keep the fragment out of server logs and clear it from browser history after establishing the session.