import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "./env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  // Accumulate any cache-control headers emitted by @supabase/ssr v0.10+
  // (prevents Vercel/CDN from caching Set-Cookie headers and leaking sessions)
  let pendingCacheHeaders: Record<string, string> = {};

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabasePublishableKey();

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          // Persist auth cookies across browser restarts (7 days).
          // Without an explicit maxAge the browser treats them as session
          // cookies and deletes them the moment the tab is closed.
          supabaseResponse.cookies.set(name, value, {
            ...options,
            maxAge: options?.maxAge ?? 60 * 60 * 24 * 7,
          }),
        );
        // Collect cache headers from the library (Cache-Control, Expires, Pragma)
        if (cacheHeaders) {
          pendingCacheHeaders = { ...pendingCacheHeaders, ...cacheHeaders };
        }
      },
    },
  });

  // getClaims() validates the JWT locally and triggers a refresh if needed —
  // faster than getUser() (no extra network round-trip) and correct for middleware.
  const { data: { user } } = await supabase.auth.getUser();

  // Apply cache headers so Vercel/CDNs never cache session-bearing responses
  Object.entries(pendingCacheHeaders).forEach(([key, value]) =>
    supabaseResponse.headers.set(key, value),
  );
  // Belt-and-suspenders: always mark middleware responses as private
  if (!supabaseResponse.headers.has("Cache-Control")) {
    supabaseResponse.headers.set("Cache-Control", "private, no-store");
  }

  const path = request.nextUrl.pathname;

  const protectedPrefixes = [
    "/dashboard",
    "/teams",
    "/rosters",
    "/lineups",
    "/players",
    "/events",
    "/accept-invite",
  ];
  const isProtected = protectedPrefixes.some((prefix) => path.startsWith(prefix));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && (path === "/login" || path === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}
