"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, CheckCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS, ROLE_DESCRIPTIONS, type TeamRole } from "@/lib/constants/roles";
import { acceptTeamInvitation } from "@/app/actions/members";
import type { PendingInviteForUser } from "@/app/actions/members";

export function AcceptInviteListClient({ invites }: { invites: PendingInviteForUser[] }) {
  const router = useRouter();
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [pending,  startTransition] = useTransition();

  function handleAccept(invite: PendingInviteForUser) {
    startTransition(async () => {
      const res = await acceptTeamInvitation(invite.token);
      if (res.error) {
        setErrors((prev) => ({ ...prev, [invite.id]: res.error! }));
      } else {
        setAccepted((prev) => new Set([...prev, invite.id]));
        // If only one invite, redirect immediately to the team
        if (invites.length === 1) {
          setTimeout(() => router.push(`/teams/${res.teamId}`), 1200);
        }
      }
    });
  }

  const remaining = invites.filter((i) => !accepted.has(i.id));
  const allDone   = remaining.length === 0;

  if (allDone) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle className="h-12 w-12 text-emerald-500" />
        <h1 className="text-xl font-bold">You&apos;re all set!</h1>
        <p className="text-sm text-muted-foreground">
          {accepted.size > 1
            ? "You've joined all your teams."
            : "Redirecting to your team…"}
        </p>
        {accepted.size > 1 && (
          <Button onClick={() => router.push("/teams")}>Go to Teams</Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="rounded-full bg-primary/10 p-4">
          <Users className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {invites.length === 1 ? "You've been invited" : `${invites.length} team invitations`}
        </h1>
        <p className="text-sm text-muted-foreground">
          Accept your invitation{invites.length > 1 ? "s" : ""} below to get started.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {remaining.map((invite) => (
          <div
            key={invite.id}
            className="rounded-lg border border-border bg-muted/20 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{invite.teamName}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="secondary">{ROLE_LABELS[invite.role]}</Badge>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {ROLE_DESCRIPTIONS[invite.role]}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleAccept(invite)}
                disabled={pending}
                className="shrink-0"
              >
                Accept
              </Button>
            </div>
            {errors[invite.id] && (
              <p className="mt-2 text-sm text-destructive">{errors[invite.id]}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function NoInvitesClient() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Mail className="h-10 w-10 text-muted-foreground/40" />
      <h1 className="text-xl font-bold">No pending invitations</h1>
      <p className="text-sm text-muted-foreground">
        Your invitation may have expired or already been accepted.
        <br />
        Ask your team owner to send a new invite.
      </p>
      <Button variant="outline" onClick={() => router.push("/dashboard")}>
        Go to Dashboard
      </Button>
    </div>
  );
}
