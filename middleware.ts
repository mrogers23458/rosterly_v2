import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Exclude static assets, images, the service worker, the web manifest, and the
    // ping endpoint from auth middleware. Hitting Supabase auth on these lightweight
    // requests adds latency and can cause false-offline detection in the PWA layer.
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|api/ping|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
