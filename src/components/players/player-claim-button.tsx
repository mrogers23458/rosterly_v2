"use client";

import { ShieldCheck, Clock, XCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitPlayerClaim } from "@/app/actions/player-claims";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { PlayerClaim } from "@/app/actions/player-claims";

type Props = {
  playerId:        string;
  teamId:          string;
  playerName:      string;
  existingClaim:   PlayerClaim | null;
  /** True when the player already has a different user as claimer */
  alreadyClaimed:  boolean;
};

export function PlayerClaimButton({
  playerId,
  teamId,
  playerName,
  existingClaim,
  alreadyClaimed,
}: Props) {
  const router                 = useRouter();
  const [open, setOpen]        = useState(false);
  const [message, setMessage]  = useState("");
  const [error, setError]      = useState<string | null>(null);
  const [isPending, start]     = useTransition();

  // Already claimed by someone else — just inform the user.
  if (alreadyClaimed) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <XCircle className="h-3.5 w-3.5 shrink-0" />
        This player has been claimed by another guardian.
      </div>
    );
  }

  // Show pending/approved/rejected state for the current user's existing claim.
  if (existingClaim) {
    if (existingClaim.status === "pending") {
      return (
        <div className="flex items-center gap-1.5 text-xs text-amber-600">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          Claim pending team manager approval.
        </div>
      );
    }
    if (existingClaim.status === "approved") {
      return (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          You are the verified guardian for this player.
        </div>
      );
    }
    // Rejected — allow re-submit.
  }

  function handleSubmit() {
    setError(null);
    start(async () => {
      const { error: err } = await submitPlayerClaim({ playerId, teamId, message });
      if (err) {
        setError(err);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setMessage("");
          setError(null);
          setOpen(true);
        }}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        {existingClaim?.status === "rejected" ? "Re-submit claim" : "Claim as my child"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Claim {playerName}</DialogTitle>
            <DialogDescription>
              Request permission to manage this player&apos;s profile as their
              parent or guardian. A team manager will review and approve your
              request.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="claim-message">
                Note to team manager{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="claim-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="E.g. I am Tyler's father — happy to provide verification if needed."
                rows={3}
                className="resize-none"
              />
            </div>
            {existingClaim?.status === "rejected" && (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Your previous claim was not approved. You can re-submit with
                additional context.
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? "Submitting…" : "Submit claim"}
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
