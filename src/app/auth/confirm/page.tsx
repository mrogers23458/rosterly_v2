import { Suspense } from "react";
import AuthConfirmClient from "./auth-confirm-client";

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-muted-foreground">Signing you in…</p>
        </div>
      }
    >
      <AuthConfirmClient />
    </Suspense>
  );
}
