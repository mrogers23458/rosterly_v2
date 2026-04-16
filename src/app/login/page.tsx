import Link from "next/link";
import { Suspense } from "react";
import { RosterlyLogo } from "@/components/branding/rosterly-logo";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-muted">
      {/* Minimal top bar */}
      <header className="border-b border-border bg-white px-4 py-3 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <RosterlyLogo size={32} />
          <span className="text-base font-bold text-primary">Rosterly</span>
        </Link>
      </header>

      {/* Form card */}
      <div className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full max-w-sm rounded-lg border border-border bg-white p-6 shadow-sm sm:p-8">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
