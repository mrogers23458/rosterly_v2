import { NextResponse } from "next/server";

// Lightweight connectivity probe used by the PWA offline detector.
// Must remain unauthenticated and uncached so it always reflects real network state.
export function GET() {
  return new NextResponse("ok", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store",
    },
  });
}
