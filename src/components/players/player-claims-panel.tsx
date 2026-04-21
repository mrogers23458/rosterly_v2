"use client";

import { Check, X, ShieldCheck, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { approvePlayerClaim, rejectPlayerClaim } from "@/app/actions/player-claims";
import { Button } from "@/components/ui/button";
import type { PlayerClaim } from "@/app/actions/player-claims";

type Props = {
  claims: PlayerClaim[];
};

export function PlayerClaimsPanel({ claims }: Props) {
  const router          = useRouter();
  const [isPending, start] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);
  const [errors, setErrors]     = useState<Record<string, string>>({});

  if (claims.length === 0) return null;

  function handleApprove(claimId: string) {
    setActionId(claimId);
    setErrors((e) => { const next = { ...e }; delete next[claimId]; return next; });
    start(async () => {
      const { error } = await approvePlayerClaim(claimId);
      if (error) setErrors((e) => ({ ...e, [claimId]: error }));
      else router.refresh();
      setActionId(null);
    });
  }

  function handleReject(claimId: string) {
    setActionId(claimId);
    setErrors((e) => { const next = { ...e }; delete next[claimId]; return next; });
    start(async () => {
      const { error } = await rejectPlayerClaim(claimId);
      if (error) setErrors((e) => ({ ...e, [claimId]: error }));
      else router.refresh();
      setActionId(null);
    });
  }

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <h2 className="text-base font-semibold">
          Pending player claims
          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {claims.length}
          </span>
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        {claims.map((claim) => {
          const playerName = [claim.player_first_name, claim.player_last_name]
            .filter(Boolean).join(" ") || "Unknown player";
          const claimantName = [claim.user_first_name, claim.user_last_name]
            .filter(Boolean).join(" ") || "Team member";
          const isActing = isPending && actionId === claim.id;

          return (
            <div
              key={claim.id}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-medium">
                    <span className="text-foreground">{claimantName}</span>
                    <span className="mx-1.5 text-muted-foreground">wants to claim</span>
                    <span className="text-foreground">{playerName}</span>
                  </p>
                  {claim.message && (
                    <p className="text-xs text-muted-foreground">&ldquo;{claim.message}&rdquo;</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(claim.created_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </p>
                  {errors[claim.id] && (
                    <p className="text-xs text-destructive">{errors[claim.id]}</p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                  disabled={isActing}
                  onClick={() => handleApprove(claim.id)}
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-destructive hover:bg-destructive/5 hover:text-destructive"
                  disabled={isActing}
                  onClick={() => handleReject(claim.id)}
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
