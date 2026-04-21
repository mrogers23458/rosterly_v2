"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center justify-center px-4 py-10 text-center sm:px-6">
      <WifiOff className="mb-4 h-10 w-10 text-muted-foreground/60" />
      <h1 className="text-2xl font-semibold tracking-tight">You are offline</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Rosterly can still open cached pages, but live team updates need a network connection.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => window.location.reload()}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Open dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
