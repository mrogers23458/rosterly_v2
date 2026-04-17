"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, ROLE_DESCRIPTIONS, type TeamRole } from "@/lib/constants/roles";
import { acceptTeamInvitation } from "@/app/actions/members";

interface Props {
  token:    string;
  teamName: string;
  role:     TeamRole;
}

export function AcceptInviteClient({ token, teamName, role }: Props) {
  const router                    = useRouter();
  const [error, setError]         = useState("");
  const [accepted, setAccepted]   = useState(false);
  const [pending, startTransition] = useTransition();

  function handleAccept() {
    setError("");
    startTransition(async () => {
      const res = await acceptTeamInvitation(token);
      if (res.error) {
        setError(res.error);
      } else {
        setAccepted(true);
        setTimeout(() => router.push(`/teams/${res.teamId}`), 1800);
      }
    });
  }

  if (accepted) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle className="h-12 w-12 text-emerald-500" />
        <h1 className="text-xl font-bold">You&apos;re in!</h1>
        <p className="text-sm text-muted-foreground">Redirecting to your team…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="rounded-full bg-primary/10 p-4">
        <Users className="h-8 w-8 text-primary" />
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">You&apos;ve been invited</h1>
        <p className="mt-2 text-muted-foreground">
          Join <span className="font-semibold text-foreground">{teamName}</span> as{" "}
          <span className="font-semibold text-foreground">{ROLE_LABELS[role]}</span>.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button onClick={handleAccept} disabled={pending} size="lg" className="min-w-[160px]">
        {pending ? "Joining…" : "Accept & Join Team"}
      </Button>
    </div>
  );
}
